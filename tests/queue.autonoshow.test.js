/**
 * Test tự đánh vắng mặt (autoNoShow). Cần MySQL thật (RUN_DB_TESTS=1); dữ liệu tạm được dọn sau khi chạy.
 */
const test = require("node:test");
const { after } = test;
const assert = require("node:assert/strict");

const enabled = process.env.RUN_DB_TESTS === "1";
const dbOpt = { skip: !enabled };

after(async () => {
  if (enabled) await require("../src/models/index").sequelize.close();
});

test("CONFIG.AUTO_NOSHOW_MIN có giá trị mặc định hợp lệ", () => {
  const { CONFIG } = require("../src/services/queue/queueRules");
  assert.ok(Number.isFinite(CONFIG.AUTO_NOSHOW_MIN) && CONFIG.AUTO_NOSHOW_MIN >= 1);
});

const setup = async () => {
  const db = require("../src/models/index");
  const queue = require("../src/services/queue/queueService");
  const { todayDate } = require("../src/utils/dateKey");
  const profile = await db.DoctorProfile.findOne({ attributes: ["doctorId", "clinicId", "specialtyId"], raw: true, order: [["doctorId", "ASC"]] });
  assert.ok(profile, "cần ít nhất 1 bác sĩ trong DB");
  const room = await db.Room.create({ clinicId: profile.clinicId, specialtyId: profile.specialtyId, code: `AN${Date.now() % 100000}`, name: "Phòng vắng mặt", floor: "9", isActive: true });
  const mk = (seq, o) =>
    db.QueueTicket.create({
      roomId: room.id, doctorId: profile.doctorId, ticketDate: todayDate(), shift: "MORNING", seq, displayNo: `AN-${String(seq).padStart(3, "0")}`,
      source: "WALK_IN", priority: "NORMAL", status: o.status, walkInName: `BN ${seq}`, checkInAt: new Date(), callCount: o.callCount ?? 1,
      calledAt: o.calledAt || null, postponedCount: 0, sortAt: new Date(),
    });
  const cleanup = async () => {
    const t = await db.QueueTicket.findAll({ where: { roomId: room.id }, attributes: ["id"], raw: true });
    if (t.length) await db.QueueEvent.destroy({ where: { ticketId: t.map((x) => x.id) } });
    await db.QueueTicket.destroy({ where: { roomId: room.id } });
    await db.Room.destroy({ where: { id: room.id } });
  };
  return { db, queue, room, mk, cleanup };
};

const minutesAgo = (m) => new Date(Date.now() - m * 60 * 1000);

test("autoNoShow: chỉ động vào vé CALLED quá hạn; lần 1 xếp lại cuối hàng, lần 2 kết thúc", dbOpt, async () => {
  const s = await setup();
  try {
    const stale = await s.mk(1, { status: "CALLED", calledAt: minutesAgo(30) });
    const fresh = await s.mk(2, { status: "CALLED", calledAt: minutesAgo(1) });
    const waiting = await s.mk(3, { status: "WAITING", callCount: 0 });

    // Lưu ý: quét toàn bảng nên có thể trúng vé CALLED quá hạn khác ngoài test; chỉ khẳng định trên vé của phòng tạm
    const r1 = await s.queue.autoNoShow({ timeoutMin: 10 });
    assert.ok(r1.requeued >= 1);
    const get = (id) => s.db.QueueTicket.findOne({ where: { id }, raw: true });
    let a = await get(stale.id);
    assert.equal(a.status, "WAITING", "lần 1: xếp lại hàng chờ");
    assert.equal(a.callCount, 0);
    assert.equal(a.calledAt, null);
    assert.equal((await get(fresh.id)).status, "CALLED", "vừa gọi 1 phút trước: giữ nguyên");
    assert.equal((await get(waiting.id)).status, "WAITING");

    const ev = await s.db.QueueEvent.findAll({ where: { ticketId: stale.id }, raw: true });
    const rq = ev.find((e) => e.eventType === "NO_SHOW_REQUEUE");
    assert.ok(rq);
    const pl = typeof rq.payload === "string" ? JSON.parse(rq.payload) : rq.payload;
    assert.equal(pl.auto, true);
    assert.equal(rq.actorUserId, null, "actor là hệ thống");

    // Lần 2: gọi lại rồi lại bỏ mặc -> NO_SHOW (kết thúc)
    await s.db.QueueTicket.update({ status: "CALLED", calledAt: minutesAgo(30), callCount: 1 }, { where: { id: stale.id } });
    const r2 = await s.queue.autoNoShow({ timeoutMin: 10 });
    assert.ok(r2.noShow >= 1);
    a = await get(stale.id);
    assert.equal(a.status, "NO_SHOW");
    const ev2 = await s.db.QueueEvent.findAll({ where: { ticketId: stale.id, eventType: "NO_SHOW" }, raw: true });
    assert.equal(ev2.length, 1);

    // Chạy lại: không đổi gì nữa (idempotent)
    const r3 = await s.queue.autoNoShow({ timeoutMin: 10 });
    assert.equal((await get(stale.id)).status, "NO_SHOW");
    assert.equal(
      (await s.db.QueueEvent.count({ where: { ticketId: stale.id, eventType: "NO_SHOW" } })), 1
    );
    assert.ok(r3.checked >= 0);
  } finally {
    await s.cleanup();
  }
});

test("autoNoShow: giải phóng bác sĩ (hết DOCTOR_BUSY)", dbOpt, async () => {
  const s = await setup();
  try {
    const called = await s.mk(1, { status: "CALLED", calledAt: minutesAgo(45) });
    await s.mk(2, { status: "WAITING", callCount: 0 });
    await s.queue.autoNoShow({ timeoutMin: 10 });
    const row = await s.db.QueueTicket.findOne({ where: { id: called.id }, raw: true });
    assert.notEqual(row.status, "CALLED");
    const busy = await s.db.QueueTicket.count({ where: { roomId: s.room.id, status: ["CALLED", "IN_PROGRESS"] } });
    assert.equal(busy, 0, "không còn vé nào chiếm bác sĩ");
  } finally {
    await s.cleanup();
  }
});

test("autoNoShow: bác sĩ gọi lại trong lúc chờ thì không bị đánh vắng", dbOpt, async () => {
  const s = await setup();
  try {
    const t = await s.mk(1, { status: "CALLED", calledAt: minutesAgo(30) });
    // Mô phỏng bác sĩ vừa gọi lại sau khi quét đã chọn vé: calledAt mới
    await s.db.QueueTicket.update({ calledAt: new Date() }, { where: { id: t.id } });
    await s.queue.autoNoShow({ timeoutMin: 10 });
    assert.equal((await s.db.QueueTicket.findOne({ where: { id: t.id }, raw: true })).status, "CALLED");
  } finally {
    await s.cleanup();
  }
});
