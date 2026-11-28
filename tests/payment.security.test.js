/**
 * Test bảo mật thanh toán online (chống đánh dấu "đã thanh toán" bằng số tiền nhỏ / tạo link tuỳ ý).
 * Cần MySQL thật: chạy khi RUN_DB_TESTS=1. Dữ liệu tạm: email "paytest-*", ngày 2031-05-06 (tự dọn).
 * PayOS được giả lập (không gọi mạng); email tắt.
 */
process.env.PAYOS_CLIENT_ID = "fake-client";
process.env.PAYOS_API_KEY = "fake-key";
process.env.PAYOS_CHECKSUM_KEY = "fake-checksum";
process.env.URL_REACT = "http://localhost:3000";
process.env.EMAIL_APP = "";
process.env.EMAIL_APP_PASSWORD = "";

const test = require("node:test");
const { after } = test;
const assert = require("node:assert/strict");

const enabled = process.env.RUN_DB_TESTS === "1";
const opt = { skip: !enabled };

// doctorServices (và emailServices) dùng cú pháp import ES -> cần Babel khi chạy bằng node:test
if (enabled) require("@babel/register")({ presets: ["@babel/preset-env"], only: [/[\\/]src[\\/]/], cache: false });

after(async () => {
  if (enabled) await require("../src/models/index").sequelize.close();
  setTimeout(() => process.exit(process.exitCode || 0), 200).unref();
});

const DATE = "2031-05-06";

const setup = async () => {
  const db = require("../src/models/index");
  const svc = require("../src/services/doctorServices");
  const payOS = require("../src/config/payos");
  assert.ok(payOS, "PayOS giả phải được khởi tạo");

  const calls = [];
  const realCreate = payOS.paymentRequests.create;
  payOS.paymentRequests.create = async (body) => {
    calls.push(body);
    return { checkoutUrl: "https://pay.test/x", qrCode: "qr", orderCode: body.orderCode };
  };

  const doc = await db.DoctorProfile.findOne({ attributes: ["doctorId"], raw: true });
  const created = { users: [], bookings: [], schedules: [] };
  let n = 0;
  const makeBooking = async (statusId, invoiceAmount) => {
    n += 1;
    const tc = ["T1", "T2", "T3", "T5", "T6", "T7"][n % 6];
    const [sch, made] = await db.Schedule.findOrCreate({
      where: { doctorId: doc.doctorId, workDate: DATE, timeType: tc }, defaults: { maxNumber: 5, currentNumber: 0, status: "available" }, raw: false,
    });
    if (made) created.schedules.push(sch.id);
    const u = await db.User.create({ email: `paytest-${n}-${Date.now()}@example.com`, firstName: "P", lastName: `T${n}`, roleId: "R3", isActive: true, tokenVersion: 0 });
    created.users.push(u.id);
    const b = await db.Booking.create({ code: `PY${Date.now() % 1e8}${n}`.slice(0, 16), doctorId: doc.doctorId, workDate: DATE, timeType: tc, patientId: u.id, statusId, source: "ONLINE" });
    created.bookings.push(b.id);
    if (invoiceAmount !== undefined) {
      await db.Payment.create({ bookingId: b.id, amount: invoiceAmount, cashier: "Chờ thanh toán", paymentMethod: "CASH", description: JSON.stringify({ examinationFee: invoiceAmount, totalFee: invoiceAmount }) });
    }
    return Number(b.id);
  };
  const statusOf = async (id) => (await db.Booking.findOne({ where: { id }, attributes: ["statusId"], raw: true })).statusId;
  const webhook = (bookingId, amount, tid) =>
    svc.postConfirmPayment({ data: { description: `BOOKING${bookingId}`, amount, tid: tid || `t-${bookingId}-${Date.now()}-${Math.random()}` } }, null);

  const cleanup = async () => {
    payOS.paymentRequests.create = realCreate;
    await db.Payment.destroy({ where: { bookingId: created.bookings } });
    await db.Booking.destroy({ where: { id: created.bookings } });
    if (created.schedules.length) await db.Schedule.destroy({ where: { id: created.schedules } });
    if (created.users.length) await db.User.destroy({ where: { id: created.users }, force: true });
  };
  return { svc, calls, makeBooking, statusOf, webhook, cleanup };
};

test("tạo link: từ chối lịch chưa khám / chưa có hoá đơn / đã thanh toán / mã sai, không gọi PayOS", opt, async () => {
  const s = await setup();
  try {
    const bad = [
      [await s.makeBooking("S2"), "chưa khám (S2, không hoá đơn)"],
      [await s.makeBooking("S2", 300000), "chưa khám dù có hoá đơn"],
      [await s.makeBooking("S3"), "đã khám nhưng chưa có hoá đơn"],
      [await s.makeBooking("S6", 0), "hoá đơn 0đ"],
      [await s.makeBooking("S5", 300000), "đã thanh toán"],
      [await s.makeBooking("S4", 300000), "đã huỷ"],
    ];
    for (const [id, why] of bad) {
      const r = await s.svc.createPayOSPaymentLink({ bookingId: id, amount: 1000 });
      assert.notEqual(r.errCode, 0, `phải từ chối: ${why}`);
    }
    for (const x of [undefined, null, "abc", -5, 0, 999999999]) {
      assert.notEqual((await s.svc.createPayOSPaymentLink({ bookingId: x, amount: 1000 })).errCode, 0);
    }
    assert.equal(s.calls.length, 0, "không được gọi PayOS khi bị từ chối");
  } finally {
    await s.cleanup();
  }
});

test("tạo link: số tiền lấy từ hoá đơn, bỏ qua amount/description/returnUrl lạ từ client", opt, async () => {
  const s = await setup();
  try {
    const id = await s.makeBooking("S6", 300000);
    const r = await s.svc.createPayOSPaymentLink({
      bookingId: id, amount: 1000, description: "TUY Y", returnUrl: "https://evil.example/steal", cancelUrl: "http://localhost:3000.evil.com/x",
    });
    assert.equal(r.errCode, 0);
    const body = s.calls[0];
    assert.equal(body.amount, 300000, "phải dùng số tiền hoá đơn");
    assert.equal(body.description, `BOOKING${id}`);
    assert.equal(body.returnUrl, "http://localhost:3000/payment-success", "returnUrl lạ bị thay bằng mặc định");
    assert.equal(body.cancelUrl, "http://localhost:3000/payment-cancel", "tên miền giả mạo kiểu localhost:3000.evil.com bị chặn");
    assert.ok(Number.isSafeInteger(body.orderCode));

    // returnUrl thuộc frontend hệ thống thì được giữ
    await s.svc.createPayOSPaymentLink({ bookingId: id, returnUrl: "http://localhost:3000/payment-success?x=1" });
    assert.equal(s.calls[1].returnUrl, "http://localhost:3000/payment-success?x=1");
    assert.equal(s.calls[1].amount, 300000, "không gửi amount vẫn chạy (lấy từ hoá đơn)");
  } finally {
    await s.cleanup();
  }
});

test("webhook: lịch chưa khám (S2) không được đánh dấu đã thanh toán dù chuyển 1.000đ", opt, async () => {
  const s = await setup();
  try {
    const noInvoice = await s.makeBooking("S2");
    const r = await s.webhook(noInvoice, 1000);
    assert.notEqual(r.errCode, 0);
    assert.equal(await s.statusOf(noInvoice), "S2");

    const withInvoice = await s.makeBooking("S2", 300000);
    assert.notEqual((await s.webhook(withInvoice, 300000)).errCode, 0);
    assert.equal(await s.statusOf(withInvoice), "S2");

    const noAmount = await s.makeBooking("S3", 0);
    const r3 = await s.webhook(noAmount, 5000);
    assert.notEqual(r3.errCode, 0);
    assert.equal(await s.statusOf(noAmount), "S3", "không có hoá đơn hợp lệ thì không nhận");
  } finally {
    await s.cleanup();
  }
});

test("webhook: thiếu tiền bị từ chối; đủ tiền thì S5; gửi lại cùng giao dịch không xử lý đôi", opt, async () => {
  const s = await setup();
  try {
    const id = await s.makeBooking("S6", 300000);
    const short = await s.webhook(id, 1000);
    assert.notEqual(short.errCode, 0);
    assert.equal(await s.statusOf(id), "S6");

    const ok = await s.webhook(id, 300000, `same-${id}`);
    assert.equal(ok.errCode, 0);
    assert.equal(await s.statusOf(id), "S5");

    const again = await s.webhook(id, 300000, `same-${id}`);
    assert.equal(again.errCode, 0);
    assert.match(again.errMessage, /already processed/i);

    // S3 (vừa kê đơn, chưa sang S6) cũng thanh toán được khi đủ tiền
    const id3 = await s.makeBooking("S3", 150000);
    assert.equal((await s.webhook(id3, 200000)).errCode, 0, "trả dư vẫn nhận");
    assert.equal(await s.statusOf(id3), "S5");
  } finally {
    await s.cleanup();
  }
});
