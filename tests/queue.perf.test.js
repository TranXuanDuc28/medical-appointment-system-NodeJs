/**
 * Test hiệu năng bão check-in (gộp ETA đồng thời, gộp phát socket). Cần MySQL thật (RUN_DB_TESTS=1). Gộp tạm 2 bác sĩ vào 1 chuyên khoa tạm,
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


test("ETA gộp đồng thời: 12 vé vãng lai vào CÙNG bác sĩ cùng lúc, vé nào cũng có ETA gồm chính nó (không trả số cũ)", opt, async () => {
  const ctx = await setup();
  const { queue, doctors, receptionist, db } = ctx;
  const [d1] = doctors;
  try {
    const out = await Promise.all(Array.from({ length: 12 }, (_, i) => queue.createWalkIn({ doctorId: d1.id, name: `Đồng thời ${i}`, actor: receptionist })));
    const seqs = new Set();
    for (const t of out) {
      assert.equal(typeof t.estimatedWaitMin, "number", `vé ${t.displayNo} thiếu ETA (kết quả cũ không chứa vé này)`);
      assert.equal(typeof t.aheadCount, "number");
      assert.ok(t.aheadCount <= 11);
      seqs.add(t.seq);
    }
    assert.equal(seqs.size, 12, "số thứ tự không trùng");
    // Sau khi mọi thứ xong, ETA tính lại phải khớp thứ tự thật: người cuối có 11 người phía trước
    const last = out.reduce((a, b) => (a.seq > b.seq ? a : b));
    const fresh = await queue.getTicket(last.id);
    assert.equal(fresh.aheadCount, 11);
    // Thay đổi sau đó (huỷ 1 vé) phải được phản ánh ngay, không bị dính kết quả cũ
    await queue.cancel({ ticketId: out[0].id, actor: receptionist });
    assert.equal((await queue.getTicket(last.id)).aheadCount, 10);
  } finally {
    await teardown(ctx);
  }
});

test("ETA đang tính dở (đã đọc hàng cũ) KHÔNG được dùng chung cho vé vừa commit sau đó", opt, async () => {
  const ctx = await setup();
  const { queue, doctors, receptionist, db } = ctx;
  const [d1] = doctors;
  const orig = db.QueueTicket.findAll;
  let slow = false;
  // làm chậm đúng truy vấn "danh sách vé đang hoạt động" của computeEta để tạo cửa sổ chồng lấn có kiểm soát
  db.QueueTicket.findAll = async function patched(opts) {
    const r = await orig.call(this, opts);
    if (slow && opts && opts.where && opts.where.status && opts.where.doctorId) await new Promise((ok) => setTimeout(ok, 300));
    return r;
  };
  try {
    const a = await queue.createWalkIn({ doctorId: d1.id, name: "Vé A", actor: receptionist });
    slow = true;
    const p1 = queue.getTicket(a.id); // bắt đầu tính ETA với hàng chỉ có A, rồi "ngủ" 300ms
    await new Promise((ok) => setTimeout(ok, 100));
    const b = await queue.createWalkIn({ doctorId: d1.id, name: "Vé B", actor: receptionist }); // commit trong lúc p1 đang dở
    await p1;
    assert.equal(typeof b.estimatedWaitMin, "number", "ETA của vé B phải được tính lại, không dùng kết quả dở dang chưa có B");
    assert.equal(b.aheadCount, 1);
  } finally {
    slow = false;
    db.QueueTicket.findAll = orig;
    await teardown(ctx);
  }
});

test("ghi dự đoán AI chạy nền nhưng vẫn được ghi sau khi check-in", opt, async () => {
  const ctx = await setup();
  const { queue, doctors, receptionist, db } = ctx;
  const [d1] = doctors;
  try {
    const t = await queue.createWalkIn({ doctorId: d1.id, name: "Ghi nền", actor: receptionist });
    let rows = [];
    for (let i = 0; i < 40 && !rows.length; i++) {
      rows = await db.AiPrediction.findAll({ where: { ticketId: t.id }, raw: true });
      if (!rows.length) await new Promise((r) => setTimeout(r, 100));
    }
    assert.equal(rows.length, 1, "phải có đúng 1 dòng ai_predictions cho vé");
  } finally {
    await db.AiPrediction.destroy({ where: { ticketId: ctx.undo.rooms.length ? (await db.QueueTicket.findAll({ where: { roomId: ctx.undo.rooms }, attributes: ["id"], raw: true })).map((x) => x.id) : [] } });
    await teardown(ctx);
  }
});
