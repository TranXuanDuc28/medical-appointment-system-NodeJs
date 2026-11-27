/**
 * Test cân bằng tải phòng cho bệnh nhân vãng lai.
 *  - Phần thuần (queueBalance): luôn chạy.
 *  - Phần DB (tự phân bác sĩ, lỗi, ưu tiên): chỉ chạy khi RUN_DB_TESTS=1. Tạm gộp 2 bác sĩ vào 1 chuyên khoa tạm,
 *    gán phòng tạm vào lịch hôm nay của họ, và KHÔI PHỤC mọi thay đổi sau khi chạy (email "qtest-*", phòng "QB*").
 */
const test = require("node:test");
const { after } = test;
const assert = require("node:assert/strict");

const { projectWalkInWait, expectedArrivals, rankCandidates } = require("../src/services/queue/queueBalance");

const MIN = 60 * 1000;
const enabled = process.env.RUN_DB_TESTS === "1";
const opt = { skip: !enabled };
const NOW = new Date("2031-03-05T09:00:00+07:00");
const at = (minOffset) => new Date(NOW.getTime() + minOffset * MIN);
const waiting = (id, minOffset, extra = {}) => ({ id, status: "WAITING", priority: "NORMAL", source: "WALK_IN", sortAt: at(minOffset), ...extra });

after(async () => {
  if (enabled) await require("../src/models/index").sequelize.close();
});

/* ------------------------------ phần thuần ------------------------------ */

test("projectWalkInWait: hàng trống chờ 0; mỗi người đang chờ cộng thời lượng trung bình", async () => {
  assert.equal((await projectWalkInWait([], 10, { now: NOW })).waitMin, 0);
  const r = await projectWalkInWait([waiting(1, -10), waiting(2, -5)], 10, { now: NOW });
  assert.equal(r.waitMin, 20);
  assert.equal(r.aheadCount, 2);
});

test("projectWalkInWait: tính phần còn lại của ca đang khám", async () => {
  const inProgress = { id: 1, status: "IN_PROGRESS", priority: "NORMAL", sortAt: at(-30), startedAt: at(-4) };
  const r = await projectWalkInWait([inProgress], 10, { now: NOW });
  assert.equal(r.waitMin, 6); // 10 - 4 đã khám
});

test("projectWalkInWait: ELDERLY vượt người thường đến muộn hơn 30 phút; EMERGENCY vượt tất cả", async () => {
  const queue = [waiting(1, -10), waiting(2, -5)];
  assert.equal((await projectWalkInWait(queue, 10, { now: NOW, priority: "NORMAL" })).waitMin, 20);
  assert.equal((await projectWalkInWait(queue, 10, { now: NOW, priority: "ELDERLY" })).waitMin, 0); // sortAt = now-30 < -10
  assert.equal((await projectWalkInWait(queue, 10, { now: NOW, priority: "EMERGENCY" })).waitMin, 0);
});

test("expectedArrivals: chỉ tính lịch hẹn có giờ hẹn trong [now-15', now]", () => {
  const pending = [
    { id: 1, slotStart: at(-5) }, // sắp/đang tới
    { id: 2, slotStart: at(20) }, // chưa tới giờ hẹn
    { id: 3, slotStart: at(-40) }, // trễ quá ân hạn, coi như bỏ
    { id: 4, slotStart: at(0) },
  ];
  assert.deepEqual(expectedArrivals(pending, NOW).map((x) => x.id), [-1001, -1004]);
});

test("projectWalkInWait: lịch hẹn chưa đến nhưng đã tới giờ làm tăng thời gian chờ", async () => {
  const base = await projectWalkInWait([], 10, { now: NOW });
  const withPending = await projectWalkInWait([], 10, { now: NOW, pending: [{ id: 1, slotStart: at(-5) }, { id: 2, slotStart: at(-2) }] });
  assert.equal(base.waitMin, 0);
  assert.equal(withPending.waitMin, 20);
});

test("rankCandidates: chờ ngắn nhất trước; hoà thì ít người chờ hơn, rồi id nhỏ hơn", () => {
  const r = rankCandidates([
    { doctorId: 3, waitMin: 10, waitingCount: 2 },
    { doctorId: 1, waitMin: 30, waitingCount: 0 },
    { doctorId: 2, waitMin: 10, waitingCount: 1 },
    { doctorId: 4, waitMin: 10, waitingCount: 1 },
  ]);
  assert.deepEqual(r.map((x) => x.doctorId), [2, 4, 3, 1]);
});

/* ------------------------------ phần DB ------------------------------ */

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

test("tự phân bác sĩ: vào bác sĩ ít người hơn, trải đều, ghi lý do vào nhật ký", opt, async () => {
  const ctx = await setup();
  const { queue, doctors, receptionist, specialtyId, db } = ctx;
  const [d1, d2] = doctors;
  try {
    // d1 đã có 3 người chờ, d2 trống -> người mới phải vào d2
    for (let i = 0; i < 3; i++) await queue.createWalkIn({ doctorId: d1.id, name: `Sẵn ${i}`, actor: receptionist });
    const sug = await queue.suggestWalkInDoctors({ specialtyId, actor: receptionist });
    assert.equal(sug.candidates.length, 2);
    assert.equal(sug.recommendedDoctorId, d2.id);
    assert.deepEqual(sug.candidates.map((c) => c.doctorId), [d2.id, d1.id]);
    assert.equal(sug.candidates[1].waitingCount, 3);
    assert.ok(sug.candidates[1].waitMin > sug.candidates[0].waitMin);

    const t = await queue.createWalkIn({ specialtyId, name: "Tự phân phòng", actor: receptionist });
    assert.equal(t.doctor.id, d2.id);
    assert.equal(t.room.id, Number(d2.room.id));
    const ev = await db.QueueEvent.findOne({ where: { ticketId: t.id, eventType: "WALK_IN" }, raw: true });
    const payload = typeof ev.payload === "string" ? JSON.parse(ev.payload) : ev.payload;
    assert.equal(payload.assignedBy, "AUTO");
    assert.equal(payload.considered.length, 2);

    // 8 người nữa: hai bác sĩ chênh nhau không quá 1 người
    for (let i = 0; i < 8; i++) await queue.createWalkIn({ specialtyId, name: `Đều ${i}`, actor: receptionist });
    const after = await queue.suggestWalkInDoctors({ specialtyId, actor: receptionist });
    const counts = after.candidates.map((c) => c.waitingCount);
    assert.equal(counts.reduce((a, b) => a + b, 0), 12);
    assert.ok(Math.abs(counts[0] - counts[1]) <= 1, `lệch tải: ${counts}`);

    // Khẩn cấp: chờ ít hơn người thường ở cùng bác sĩ
    const normal = await queue.loadWalkInCandidates({ specialtyId, priority: "NORMAL" });
    const urgent = await queue.loadWalkInCandidates({ specialtyId, priority: "EMERGENCY" });
    assert.ok(urgent[0].waitMin <= normal[0].waitMin);
  } finally {
    await teardown(ctx);
  }
});

test("tự phân bác sĩ: chỉ định doctorId vẫn đúng như cũ; lỗi đầu vào/quyền/không có bác sĩ trực", opt, async () => {
  const ctx = await setup();
  const { queue, doctors, receptionist, specialtyId, db } = ctx;
  const [d1, d2] = doctors;
  try {
    for (let i = 0; i < 2; i++) await queue.createWalkIn({ doctorId: d2.id, name: `Sẵn ${i}`, actor: receptionist });
    const forced = await queue.createWalkIn({ doctorId: d2.id, specialtyId, name: "Chỉ định", actor: receptionist }); // d2 đông hơn nhưng được chỉ định
    assert.equal(forced.doctor.id, d2.id);
    const ev = await db.QueueEvent.findOne({ where: { ticketId: forced.id, eventType: "WALK_IN" }, raw: true });
    const payload = typeof ev.payload === "string" ? JSON.parse(ev.payload) : ev.payload;
    assert.equal(payload.assignedBy, undefined);

    await expectErr(queue.createWalkIn({ name: "Thiếu", actor: receptionist }), "BAD_REQUEST"); // không có bác sĩ lẫn chuyên khoa
    await expectErr(queue.createWalkIn({ specialtyId, name: "Quyền", actor: { id: 1, permissions: new Set() } }), "FORBIDDEN");
    await expectErr(queue.suggestWalkInDoctors({ specialtyId, actor: { id: 1, permissions: new Set() } }), "FORBIDDEN");
    await expectErr(queue.suggestWalkInDoctors({ specialtyId, priority: "X", actor: receptionist }), "BAD_REQUEST");

    // Bác sĩ d1 nghỉ (đóng mọi lịch hôm nay) -> chỉ còn d2
    await db.Schedule.update({ status: "closed" }, { where: { doctorId: d1.id, workDate: require("../src/utils/dateKey").todayDate() } });
    const only = await queue.suggestWalkInDoctors({ specialtyId, actor: receptionist });
    assert.deepEqual(only.candidates.map((c) => c.doctorId), [d2.id]);
    // không còn ai trực
    await db.Schedule.update({ status: "closed" }, { where: { doctorId: d2.id, workDate: require("../src/utils/dateKey").todayDate() } });
    await expectErr(queue.createWalkIn({ specialtyId, name: "Hết bác sĩ", actor: receptionist }), "NO_DOCTOR_AVAILABLE");
  } finally {
    await teardown(ctx);
  }
});
