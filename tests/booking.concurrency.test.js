/**
 * Test tích hợp đặt lịch trên MySQL THẬT (schema v2) – mặc định BỎ QUA.
 * Chạy:  RUN_DB_TESTS=1 npm test      (PowerShell: $env:RUN_DB_TESTS=1; npm test)
 * Tạo dữ liệu tạm (email "bktest-*", lịch ở ngày xa trong tương lai) và dọn lại sau khi chạy.
 */
const test = require("node:test");
const { after } = test;
const assert = require("node:assert/strict");

const enabled = process.env.RUN_DB_TESTS === "1";

// Đóng kết nối DB một lần sau khi mọi test xong (các test dùng chung một pool)
after(async () => {
  if (enabled) await require("../src/models/index").sequelize.close();
});

const futureDate = (offsetDays) => {
  const d = new Date(Date.now() + offsetDays * 24 * 3600 * 1000);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
};

const setup = async (offsetDays, capacity) => {
  const db = require("../src/models/index");
  const { dateToMs } = require("../src/utils/dateKey");
  const doctor = await db.User.findOne({ where: { roleId: "R2" }, attributes: ["id"], raw: true });
  assert.ok(doctor, "cần ít nhất 1 bác sĩ trong DB");
  const workDate = futureDate(offsetDays);
  await db.Schedule.create({ doctorId: doctor.id, workDate, timeType: "T1", maxNumber: capacity, currentNumber: 0, status: "available" });
  const mk = (tag) => ({
    email: `bktest-${Date.now()}-${tag}@example.com`,
    doctorId: doctor.id, date: dateToMs(workDate), timeType: "T1",
    fullName: `Test User${tag}`, selectedGender: "M", address: "x", phoneNumber: "0900000000",
  });
  return { db, doctor, workDate, mk };
};

const cleanup = async (db, doctorId, workDate) => {
  const users = await db.User.findAll({
    where: { email: { [db.Sequelize.Op.like]: "bktest-%" } }, attributes: ["id"], raw: true, paranoid: false,
  });
  const ids = users.map((u) => u.id);
  await db.Booking.destroy({ where: { doctorId, workDate } });
  if (ids.length) {
    await db.Booking.destroy({ where: { patientId: ids } });
    await db.PatientProfile.destroy({ where: { ownerUserId: ids }, force: true });
    await db.User.destroy({ where: { id: ids }, force: true });
  }
  await db.Schedule.destroy({ where: { doctorId, workDate } });
};

test("12 yêu cầu đồng thời vào slot sức chứa 2 -> đúng 2 thành công, không overbook", { skip: !enabled }, async () => {
  const { db, doctor, workDate, mk } = await setup(500, 2);
  const booking = require("../src/services/bookingService");
  try {
    const results = await Promise.all(Array.from({ length: 12 }, (_, i) => booking.createBooking(mk(i))));
    const ok = results.filter((r) => r.errCode === 0);
    assert.equal(ok.length, 2, "đúng 2 booking được giữ chỗ");
    assert.equal(results.filter((r) => r.errCode === 4).length, 10, "10 yêu cầu còn lại báo hết chỗ");

    const slot = await db.Schedule.findOne({ where: { doctorId: doctor.id, workDate, timeType: "T1" }, raw: true });
    assert.equal(slot.status, "booked");
    assert.equal(Number(slot.currentNumber), 2);

    // Mỗi booking có mã vé, hash token và hạn giữ chỗ; token gốc không lưu trong DB
    const row = await db.Booking.findOne({ where: { id: ok[0].booking.id }, raw: true });
    assert.ok(row.code && row.confirmTokenHash && row.holdExpiresAt);
    assert.notEqual(row.confirmTokenHash, ok[0].booking.token);
    assert.ok(row.patientProfileId, "tự tạo hồ sơ SELF cho bệnh nhân");

    // Huỷ 1 booking -> slot nhả chỗ, đặt lại được
    const cancelled = await booking.cancelBookingById(ok[0].booking.id, { force: true });
    assert.equal(cancelled.errCode, 0);
    const again = await booking.createBooking(mk(99));
    assert.equal(again.errCode, 0, "slot được nhả sau khi huỷ");
  } finally {
    await cleanup(db, doctor.id, workDate);
  }
});

test("cùng một bệnh nhân không giữ 2 lịch cùng khung giờ; xác nhận email -> S2", { skip: !enabled }, async () => {
  const { db, doctor, workDate, mk } = await setup(501, 5);
  const booking = require("../src/services/bookingService");
  try {
    const data = mk("same");
    const first = await booking.createBooking(data);
    assert.equal(first.errCode, 0);
    const second = await booking.createBooking(data);
    assert.equal(second.errCode, 5, "trùng giờ bị chặn");

    // Song song 5 yêu cầu của CÙNG bệnh nhân: DB UNIQUE là chốt chặn cuối
    const dup = mk("same2");
    const race = await Promise.all(Array.from({ length: 5 }, () => booking.createBooking(dup)));
    assert.equal(race.filter((r) => r.errCode === 0).length, 1);

    const bad = await booking.verifyBooking({ token: "sai-token", doctorId: doctor.id });
    assert.equal(bad.errCode, 2);
    const ok = await booking.verifyBooking({ token: first.booking.token, doctorId: doctor.id });
    assert.equal(ok.errCode, 0);
    const row = await db.Booking.findOne({ where: { id: first.booking.id }, raw: true });
    assert.equal(row.statusId, "S2");
    assert.ok(row.confirmedAt);
  } finally {
    await cleanup(db, doctor.id, workDate);
  }
});

test("booking S1 quá hạn giữ chỗ được nhả bởi sweeper và không còn xác nhận được", { skip: !enabled }, async () => {
  const { db, doctor, workDate, mk } = await setup(502, 1);
  const booking = require("../src/services/bookingService");
  try {
    const r = await booking.createBooking(mk("exp"));
    assert.equal(r.errCode, 0);
    assert.equal((await booking.createBooking(mk("exp2"))).errCode, 4, "slot đang bị giữ chỗ");
    await db.Booking.update({ holdExpiresAt: new Date(Date.now() - 3600 * 1000) }, { where: { id: r.booking.id } });
    const released = await booking.releaseExpiredHolds();
    assert.ok(released >= 1);
    const slot = await db.Schedule.findOne({ where: { doctorId: doctor.id, workDate, timeType: "T1" }, raw: true });
    assert.equal(slot.status, "available");
    assert.equal((await booking.verifyBooking({ token: r.booking.token, doctorId: doctor.id })).errCode, 2);
    assert.equal((await booking.createBooking(mk("exp3"))).errCode, 0, "đặt lại được sau khi nhả");
  } finally {
    await cleanup(db, doctor.id, workDate);
  }
});

test("đặt lịch sai: ngày đã qua, khung giờ không tồn tại, email nhân viên", { skip: !enabled }, async () => {
  const { db, doctor, workDate, mk } = await setup(503, 1);
  const booking = require("../src/services/bookingService");
  const { dateToMs } = require("../src/utils/dateKey");
  try {
    assert.equal((await booking.createBooking({ ...mk("past"), date: dateToMs("2020-01-01") })).errCode, 6);
    assert.equal((await booking.createBooking({ ...mk("noslot"), timeType: "T7" })).errCode, 3);
    const staff = await db.User.findOne({ where: { roleId: "R2" }, attributes: ["email"], raw: true });
    assert.equal((await booking.createBooking({ ...mk("staff"), email: staff.email })).errCode, 7);
    assert.equal((await booking.createBooking({ ...mk("bad"), email: "khong-phai-email" })).errCode, 1);
  } finally {
    await cleanup(db, doctor.id, workDate);
  }
});
