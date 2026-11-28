/**
 * Test nhắc hẹn.
 *  - Phần thuần (cửa sổ 24h/2h, ngưỡng "còn N người", debounce): luôn chạy.
 *  - Phần DB (quét lịch, chống gửi trùng, cảnh báo sắp đến lượt): chỉ chạy khi RUN_DB_TESTS=1.
 *    Dữ liệu tạm: email "rmtest-*", ngày 2031-03-05, được dọn lại sau khi chạy.
 */
const test = require("node:test");
const { after } = test;
const assert = require("node:assert/strict");

const reminders = require("../src/services/reminderService");
const { makeDebouncedHandler } = require("../src/services/reminderScheduler");

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const enabled = process.env.RUN_DB_TESTS === "1";
const dbOpt = { skip: !enabled };

after(async () => {
  if (enabled) await require("../src/models/index").sequelize.close();
});

test("reminderFor: chọn đúng cửa sổ 24h và 2h", () => {
  const kinds = (ms) => reminders.reminderFor(ms).map((r) => r.kind);
  assert.deepEqual(kinds(23 * HOUR), ["24h"]);
  assert.deepEqual(kinds(24 * HOUR), ["24h"]);
  assert.deepEqual(kinds(25 * HOUR), []); // chưa tới
  assert.deepEqual(kinds(5 * HOUR), []); // đặt sát giờ: không bị nhắc "24h", chưa tới 2h
  assert.deepEqual(kinds(90 * MIN), ["2h"]);
  assert.deepEqual(kinds(10 * MIN), []); // quá sát giờ
  assert.deepEqual(kinds(-HOUR), []); // đã qua
});

test("parseThresholds: mặc định, sắp xếp giảm dần, bỏ giá trị sai", () => {
  assert.deepEqual(reminders.parseThresholds(undefined), [3, 1]);
  assert.deepEqual(reminders.parseThresholds("1, 3,3"), [3, 1]);
  assert.deepEqual(reminders.parseThresholds("abc,0,-2,2"), [2]);
  assert.deepEqual(reminders.parseThresholds("x"), []);
});

test("reachedThreshold: chỉ trả ngưỡng nhỏ nhất đã chạm", () => {
  const t = [3, 1];
  assert.equal(reminders.reachedThreshold(5, t), null);
  assert.equal(reminders.reachedThreshold(4, t), null);
  assert.equal(reminders.reachedThreshold(3, t), 3);
  assert.equal(reminders.reachedThreshold(2, t), 3);
  assert.equal(reminders.reachedThreshold(1, t), 1);
  assert.equal(reminders.reachedThreshold(0, t), 1); // người kế tiếp
});

test("makeDebouncedHandler: nhiều sự kiện cùng bác sĩ/ngày chỉ xử lý 1 lần, khác bác sĩ xử lý riêng", async () => {
  const calls = [];
  const h = makeDebouncedHandler((p) => calls.push(p.doctorId), 30);
  h({ doctorId: 1, ticketDate: "2031-03-05" });
  h({ doctorId: 1, ticketDate: "2031-03-05" });
  h({ doctorId: 1, ticketDate: "2031-03-05" });
  h({ doctorId: 2, ticketDate: "2031-03-05" });
  await new Promise((r) => setTimeout(r, 120));
  assert.deepEqual(calls.sort(), [1, 2]);
});

/** Dựng 1 bệnh nhân + 1 lịch hẹn S2 khung T1 (08:00) ngày 2031-03-05 cho bác sĩ có sẵn. */
const setup = async () => {
  const db = require("../src/models/index");
  const doctor = await db.DoctorProfile.findOne({ attributes: ["doctorId"], raw: true, order: [["doctorId", "ASC"]] });
  assert.ok(doctor, "cần ít nhất 1 bác sĩ trong DB");
  const date = "2031-03-05";
  const created = { users: [], scheduleId: null, bookings: [] };
  const mkUser = async (tag) => {
    const u = await db.User.create({ email: `rmtest-${tag}-${Date.now()}@example.com`, firstName: "R", lastName: tag, roleId: "R3", isActive: true, tokenVersion: 0 });
    created.users.push(u.id);
    return Number(u.id);
  };
  const patientId = await mkUser("p1");
  const [sched, made] = await db.Schedule.findOrCreate({
    where: { doctorId: doctor.doctorId, workDate: date, timeType: "T1" },
    defaults: { maxNumber: 5, currentNumber: 0, status: "available" },
    raw: false,
  });
  if (made) created.scheduleId = sched.id;
  const booking = await db.Booking.create({
    code: `RM${Date.now() % 1e10}`.slice(0, 16), doctorId: doctor.doctorId, workDate: date, timeType: "T1",
    patientId, statusId: "S2", source: "ONLINE",
  });
  created.bookings.push(booking.id);
  const cleanup = async () => {
    const { Op } = require("sequelize");
    await db.Notification.destroy({ where: { userId: { [Op.in]: created.users } } });
    await db.Booking.destroy({ where: { id: { [Op.in]: created.bookings } } });
    if (created.scheduleId) await db.Schedule.destroy({ where: { id: created.scheduleId } });
    await db.User.destroy({ where: { id: { [Op.in]: created.users } }, force: true });
  };
  return { db, patientId, booking, doctorId: Number(doctor.doctorId), slotAt: new Date(`${date}T08:00:00+07:00`), cleanup };
};

test("scanDueReminders: gửi nhắc 24h đúng 1 lần, 2h riêng, không gửi khi ngoài cửa sổ / lịch đã huỷ", dbOpt, async () => {
  const s = await setup();
  try {
    const count = (type) => s.db.Notification.count({ where: { userId: s.patientId, type } });

    // Còn 40h: chưa nhắc
    let r = await reminders.scanDueReminders(new Date(s.slotAt.getTime() - 40 * HOUR));
    assert.equal(r.sent, 0);

    // Còn 23h: nhắc 24h; quét lại không gửi trùng
    r = await reminders.scanDueReminders(new Date(s.slotAt.getTime() - 23 * HOUR));
    assert.equal(r.sent, 1);
    r = await reminders.scanDueReminders(new Date(s.slotAt.getTime() - 22.5 * HOUR));
    assert.equal(r.sent, 0);
    assert.equal(await count("APPT_REMIND_24H"), 1);

    // Còn 1h: nhắc 2h
    r = await reminders.scanDueReminders(new Date(s.slotAt.getTime() - 1 * HOUR));
    assert.equal(r.sent, 1);
    assert.equal(await count("APPT_REMIND_2H"), 1);
    const row = await s.db.Notification.findOne({ where: { userId: s.patientId, type: "APPT_REMIND_2H" }, raw: true });
    assert.match(row.body, new RegExp(s.booking.code));
    assert.ok(row.sentAt || row.sent_at);

    // Lịch đã huỷ thì không nhắc
    await s.db.Notification.destroy({ where: { userId: s.patientId } });
    await s.db.Booking.update({ statusId: "S4" }, { where: { id: s.booking.id } });
    r = await reminders.scanDueReminders(new Date(s.slotAt.getTime() - 23 * HOUR));
    assert.equal(r.sent, 0);
  } finally {
    await s.cleanup();
  }
});

test("handleQueueChange: chạm ngưỡng 3 gửi 1 lần, ngưỡng 1 gửi riêng, chỉ vé WAITING", dbOpt, async () => {
  const s = await setup();
  try {
    const mk = (status, ahead, id = 900001) => [{
      patientUserId: s.patientId,
      ticket: { id, displayNo: "A07", status, aheadCount: ahead, estimatedWaitMin: ahead * 10, room: { name: "Phòng 3" } },
    }];
    const p = { doctorId: s.doctorId, ticketDate: "2031-03-05" };
    const n = () => s.db.Notification.count({ where: { userId: s.patientId, type: "QUEUE_NEARING" } });

    assert.equal((await reminders.handleQueueChange(p, mk("WAITING", 6))).sent, 0); // còn xa
    assert.equal((await reminders.handleQueueChange(p, mk("WAITING", 3))).sent, 1); // chạm ngưỡng 3
    assert.equal((await reminders.handleQueueChange(p, mk("WAITING", 2))).sent, 0); // cùng ngưỡng 3: không trùng
    assert.equal((await reminders.handleQueueChange(p, mk("WAITING", 3))).sent, 0); // lặp lại: không trùng
    assert.equal((await reminders.handleQueueChange(p, mk("WAITING", 1))).sent, 1); // ngưỡng 1
    assert.equal(await n(), 2);
    assert.equal((await reminders.handleQueueChange(p, mk("CALLED", 0, 900002))).sent, 0); // không phải WAITING
    assert.equal((await reminders.handleQueueChange(p, mk("IN_PROGRESS", 0, 900003))).sent, 0);

    const last = await s.db.Notification.findOne({ where: { userId: s.patientId, type: "QUEUE_NEARING" }, order: [["id", "DESC"]], raw: true });
    assert.match(last.body, /A07/);
  } finally {
    await s.cleanup();
  }
});
