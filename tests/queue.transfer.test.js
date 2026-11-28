/**
 * Test chuyển vé giữa phòng (B9). Cần MySQL thật (RUN_DB_TESTS=1). Gộp tạm 2 bác sĩ vào 1 chuyên khoa tạm,
 * gán phòng tạm vào lịch hôm nay, KHÔI PHỤC mọi thay đổi sau khi chạy (email "qtest-*", phòng "QB*").
 */
const test = require("node:test");
const { after } = test;
const assert = require("node:assert/strict");

const enabled = process.env.RUN_DB_TESTS === "1";
const opt = { skip: !enabled };

after(async () => {
  if (enabled) await require("../src/models/index").sequelize.close();
});


const setup = async () => {
  const db = require("../src/models/index");
  const queue = require("../src/services/queue/queueService");
  const { DEFAULT_ROLE_PERMISSIONS } = require("../src/config/permissions");
  const { todayDate } = require("../src/utils/dateKey");
  const today = todayDate();

  const profiles = await db.DoctorProfile.findAll({ attributes: ["doctorId", "clinicId", "specialtyId"], raw: true, limit: 2, order: [["doctorId", "ASC"]] });
  assert.ok(profiles.length >= 2, "cần ít nhất 2 bác sĩ có hồ sơ trong DB");
  const undo = { profiles: profiles.map((p) => ({ ...p })), schedules: [], created: [], rooms: [], specialtyId: null, users: [] };

  const specialty = await db.Specialty.create({ sortOrder: 0, isActive: true });
  undo.specialtyId = specialty.id;
  const clinicId = profiles[0].clinicId;

  const doctors = [];
  for (const [i, p] of profiles.entries()) {
    await db.DoctorProfile.update({ specialtyId: specialty.id, clinicId }, { where: { doctorId: p.doctorId } });
    const room = await db.Room.create({ clinicId, specialtyId: specialty.id, code: `QB${i}${Date.now() % 100000}`, name: `Phòng QB ${i}`, isActive: true });
    undo.rooms.push(room.id);
    // đủ lịch hôm nay cho cả 2 ca, gán phòng tạm
    for (const tc of ["T1", "T2", "T3", "T5", "T6"]) {
      const [row, made] = await db.Schedule.findOrCreate({
        where: { doctorId: p.doctorId, workDate: today, timeType: tc }, defaults: { maxNumber: 5, currentNumber: 0, status: "available", roomId: room.id }, raw: false,
      });
      if (made) undo.created.push(row.id);
      else {
        undo.schedules.push({ id: row.id, roomId: row.roomId, status: row.status });
        await row.update({ roomId: room.id, status: row.status === "closed" ? "available" : row.status });
      }
    }
    doctors.push({ id: Number(p.doctorId), room });
  }
  const mkStaff = async (role, tag) => {
    const u = await db.User.create({ email: `qtest-${tag}-${Date.now()}@example.com`, firstName: "Q", lastName: tag, roleId: role, isActive: true, tokenVersion: 0 });
    undo.users.push(u.id);
    return { id: Number(u.id), permissions: new Set(DEFAULT_ROLE_PERMISSIONS[role]) };
  };
  const receptionist = await mkStaff("R5", "balance");
  return { db, queue, doctors, receptionist, specialtyId: Number(specialty.id), undo, DEFAULT_ROLE_PERMISSIONS };
};

const teardown = async (ctx) => {
  const { db, undo } = ctx;
  const tickets = await db.QueueTicket.findAll({ where: { roomId: undo.rooms }, attributes: ["id"], raw: true });
  if (tickets.length) await db.QueueEvent.destroy({ where: { ticketId: tickets.map((t) => t.id) } });
  await db.QueueTicket.destroy({ where: { roomId: undo.rooms } });
  if (undo.created.length) await db.Schedule.destroy({ where: { id: undo.created } });
  for (const s of undo.schedules) await db.Schedule.update({ roomId: s.roomId, status: s.status }, { where: { id: s.id } });
  await db.Room.destroy({ where: { id: undo.rooms } });
  for (const p of undo.profiles) await db.DoctorProfile.update({ specialtyId: p.specialtyId, clinicId: p.clinicId }, { where: { doctorId: p.doctorId } });
  await db.Specialty.destroy({ where: { id: undo.specialtyId } });
  if (undo.users.length) await db.User.destroy({ where: { id: undo.users }, force: true });
};

const expectErr = async (promise, reason) =>
  assert.rejects(promise, (e) => {
    assert.equal(e.name, "QueueError", `lỗi lạ: ${e.message}`);
    assert.equal(e.code, reason, `mong ${reason} nhưng nhận ${e.code}: ${e.message}`);
    return true;
  });

const mkCoord = async (ctx) => {
  const u = await ctx.db.User.create({ email: `qtest-coord-${Date.now()}@example.com`, firstName: "Q", lastName: "coord", roleId: "R7", isActive: true, tokenVersion: 0 });
  ctx.undo.users.push(u.id);
  return { id: Number(u.id), permissions: new Set(ctx.DEFAULT_ROLE_PERMISSIONS.R7) };
};

test("transferTicket: chuyển vé vãng lai sang phòng ít người, giữ lượt, cấp số mới, ghi nhật ký", opt, async () => {
  const ctx = await setup();
  const { queue, doctors, receptionist, db } = ctx;
  const [d1, d2] = doctors;
  try {
    const coord = await mkCoord(ctx);
    const tickets = [];
    for (let i = 0; i < 4; i++) tickets.push(await queue.createWalkIn({ doctorId: d1.id, name: `Quá tải ${i}`, actor: receptionist }));
    const before = tickets[3]; // người cuối hàng d1
    const raw0 = await db.QueueTicket.findOne({ where: { id: before.id }, raw: true });

    const moved = await queue.transferTicket({ ticketId: before.id, reason: "Phòng 1 quá tải", actor: coord }); // tự chọn
    assert.equal(moved.doctor.id, d2.id);
    assert.equal(moved.room.id, Number(d2.room.id));
    assert.equal(moved.status, "WAITING");
    assert.notEqual(moved.displayNo, before.displayNo);

    const raw1 = await db.QueueTicket.findOne({ where: { id: before.id }, raw: true });
    assert.equal(new Date(raw1.sortAt).getTime(), new Date(raw0.sortAt).getTime(), "không mất lượt: sortAt giữ nguyên");
    assert.equal(new Date(raw1.checkInAt).getTime(), new Date(raw0.checkInAt).getTime());
    assert.equal(raw1.seq, 1, "số đầu tiên ở phòng đích");

    const ev = await db.QueueEvent.findOne({ where: { ticketId: before.id, eventType: "TRANSFER" }, raw: true });
    const p = typeof ev.payload === "string" ? JSON.parse(ev.payload) : ev.payload;
    assert.equal(p.assignedBy, "AUTO");
    assert.equal(p.fromDoctorId, d1.id);
    assert.equal(p.toDoctorId, d2.id);
    assert.equal(p.reason, "Phòng 1 quá tải");
    assert.equal(ev.actorUserId, coord.id);

    // Số thứ tự phòng cũ không bị đụng; vé tiếp theo ở phòng đích nhận số kế tiếp
    const next = await queue.createWalkIn({ doctorId: d2.id, name: "Mới", actor: receptionist });
    assert.equal((await db.QueueTicket.findOne({ where: { id: next.id }, raw: true })).seq, 2);
  } finally {
    await teardown(ctx);
  }
});

test("transferTicket: chỉ định bác sĩ đích; từ chối đúng các trường hợp", opt, async () => {
  const ctx = await setup();
  const { queue, doctors, receptionist, db } = ctx;
  const [d1, d2] = doctors;
  try {
    const coord = await mkCoord(ctx);
    const a = await queue.createWalkIn({ doctorId: d1.id, name: "Bệnh nhân A", actor: receptionist });
    const noReason = (extra) => ({ ticketId: a.id, actor: coord, reason: "Cân bằng tải", ...extra });

    await expectErr(queue.transferTicket({ ticketId: a.id, toDoctorId: d2.id, reason: "ok ok", actor: receptionist }), "FORBIDDEN");
    await expectErr(queue.transferTicket(noReason({ toDoctorId: d2.id, reason: "" })), "BAD_REQUEST");
    await expectErr(queue.transferTicket(noReason({ toDoctorId: d1.id })), "BAD_REQUEST");
    await expectErr(queue.transferTicket(noReason({ toDoctorId: 999999999 })), "TARGET_UNAVAILABLE");
    await expectErr(queue.transferTicket({ ticketId: 999999999, reason: "xxx", actor: coord }), "NOT_FOUND");

    // Tự chọn nhưng phòng kia không ít hơn (mỗi phòng 1 người): không chuyển
    await queue.createWalkIn({ doctorId: d2.id, name: "Bệnh nhân B", actor: receptionist });
    await expectErr(queue.transferTicket(noReason({})), "NO_BETTER_ROOM");
    assert.equal((await db.QueueTicket.findOne({ where: { id: a.id }, raw: true })).doctorId, d1.id);

    // Chỉ định thủ công thì được dù không ít hơn
    const m = await queue.transferTicket(noReason({ toDoctorId: d2.id }));
    assert.equal(m.doctor.id, d2.id);

    // Đã gọi (CALLED) thì không chuyển được
    await queue.callTicket({ ticketId: a.id, actor: { id: d2.id, permissions: new Set(ctx.DEFAULT_ROLE_PERMISSIONS.R2 || ctx.DEFAULT_ROLE_PERMISSIONS.R3) } });
    await expectErr(queue.transferTicket(noReason({ toDoctorId: d1.id })), "INVALID_TRANSITION");
  } finally {
    await teardown(ctx);
  }
});

test("transferTicket: vé đã đặt lịch theo bác sĩ KHÔNG được chuyển", opt, async () => {
  const ctx = await setup();
  const { queue, doctors, db } = ctx;
  const [d1, d2] = doctors;
  try {
    const coord = await mkCoord(ctx);
    // Vé BOOKED dựng thẳng (không cần lịch hẹn thật vì kiểm tra nguồn vé xảy ra trước khi đụng booking)
    const room = d1.room;
    const t = await db.QueueTicket.create({
      roomId: room.id, doctorId: d1.id, ticketDate: require("../src/utils/dateKey").todayDate(), shift: "MORNING", seq: 99, displayNo: "QB-099",
      source: "BOOKED", walkInName: "Đã hẹn", priority: "NORMAL", status: "WAITING", checkInAt: new Date(), callCount: 0, postponedCount: 0, sortAt: new Date(),
    });
    await expectErr(queue.transferTicket({ ticketId: t.id, toDoctorId: d2.id, reason: "thử chuyển", actor: coord }), "NOT_ALLOWED");
    assert.equal((await db.QueueTicket.findOne({ where: { id: t.id }, raw: true })).doctorId, d1.id);
  } finally {
    await teardown(ctx);
  }
});
