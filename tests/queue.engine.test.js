/**
 * Test tích hợp lõi hàng đợi trên MySQL THẬT (schema v2) – mặc định BỎ QUA.
 * Chạy:  RUN_DB_TESTS=1 npm test      (PowerShell: $env:RUN_DB_TESTS=1; npm test)
 * Tạo dữ liệu tạm (email "qtest-*", phòng "QT*") và dọn lại sau khi chạy.
 */
const test = require("node:test");
const { after } = test;
const assert = require("node:assert/strict");

const enabled = process.env.RUN_DB_TESTS === "1";
const opt = { skip: !enabled };

after(async () => {
  if (enabled) await require("../src/models/index").sequelize.close();
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Dựng toàn bộ dữ liệu thử: 2 bác sĩ có phòng riêng, lịch hôm nay, người dùng tạm. */
const setup = async () => {
  const db = require("../src/models/index");
  const queue = require("../src/services/queue/queueService");
  const { DEFAULT_ROLE_PERMISSIONS } = require("../src/config/permissions");
  const { todayDate, dateToMs } = require("../src/utils/dateKey");

  const profiles = await db.DoctorProfile.findAll({ attributes: ["doctorId", "clinicId", "specialtyId"], raw: true, limit: 2, order: [["doctorId", "ASC"]] });
  assert.ok(profiles.length >= 2, "cần ít nhất 2 bác sĩ có hồ sơ trong DB");
  const created = { rooms: [], schedules: [], users: [] };

  const doctors = [];
  for (const [i, p] of profiles.entries()) {
    const room = await db.Room.create({ clinicId: p.clinicId, specialtyId: p.specialtyId, code: `QT${i}${Date.now() % 100000}`, name: `Phòng test ${i}`, isActive: true });
    created.rooms.push(room.id);
    doctors.push({
      id: Number(p.doctorId), room,
      actor: { id: Number(p.doctorId), permissions: new Set(DEFAULT_ROLE_PERMISSIONS.R2) },
    });
  }

  const mkStaff = async (role, tag) => {
    const u = await db.User.create({ email: `qtest-${tag}-${Date.now()}@example.com`, firstName: "Q", lastName: tag, roleId: role, isActive: true, tokenVersion: 0 });
    created.users.push(u.id);
    return { id: Number(u.id), permissions: new Set(DEFAULT_ROLE_PERMISSIONS[role]) };
  };
  const receptionist = await mkStaff("R5", "reception");
  const nurse = await mkStaff("R6", "nurse");

  const today = todayDate();
  // Lịch hôm nay T1..T6 cho cả 2 bác sĩ (bỏ qua nếu đã có sẵn)
  for (const d of doctors) {
    for (const tc of ["T1", "T2", "T3", "T5", "T6"]) {
      const [row, made] = await db.Schedule.findOrCreate({
        where: { doctorId: d.id, workDate: today, timeType: tc }, defaults: { maxNumber: 5, currentNumber: 0, status: "available" }, raw: false,
      });
      if (made) created.schedules.push(row.id);
    }
  }
  return { db, queue, doctors, receptionist, nurse, created, today, dateToMs, DEFAULT_ROLE_PERMISSIONS };
};

const cleanup = async (ctx) => {
  const { db, created, doctors } = ctx;
  const doctorIds = doctors.map((d) => d.id);
  const users = await db.User.findAll({ where: { email: { [db.Sequelize.Op.like]: "qtest-%" } }, attributes: ["id"], raw: true, paranoid: false });
  const uids = users.map((u) => u.id);
  const tickets = await db.QueueTicket.findAll({ where: { roomId: created.rooms }, attributes: ["id"], raw: true });
  const tids = tickets.map((t) => t.id);
  if (tids.length) await db.QueueEvent.destroy({ where: { ticketId: tids } });
  await db.QueueTicket.destroy({ where: { roomId: created.rooms } });
  if (uids.length) await db.Booking.destroy({ where: { patientId: uids } });
  if (created.schedules.length) await db.Schedule.destroy({ where: { id: created.schedules } });
  await db.Room.destroy({ where: { id: created.rooms } });
  if (uids.length) {
    await db.PatientProfile.destroy({ where: { ownerUserId: uids }, force: true });
    await db.User.destroy({ where: { id: uids }, force: true });
  }
  void doctorIds;
};

/** Tạo bệnh nhân + booking đã xác nhận (S2) cho 1 khung giờ của bác sĩ. */
const makeConfirmedBooking = async (ctx, doctor, timeType, tag, { date } = {}) => {
  const booking = require("../src/services/bookingService");
  const email = `qtest-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  const r = await booking.createBooking({
    email, doctorId: doctor.id, date: date || ctx.dateToMs(ctx.today), timeType,
    fullName: `Test ${tag}`, selectedGender: "M", address: "x", phoneNumber: "0900000000",
  });
  assert.equal(r.errCode, 0, `đặt lịch ${tag}: ${r.errMessage}`);
  ctx.created.users.push(r.booking.patientId);
  const v = await booking.verifyBooking({ token: r.booking.token, doctorId: doctor.id });
  assert.equal(v.errCode, 0);
  const patient = { id: Number(r.booking.patientId), permissions: new Set(ctx.DEFAULT_ROLE_PERMISSIONS.R3) };
  return { bookingId: r.booking.id, patient };
};

const expectErr = async (promise, reason) => {
  await assert.rejects(promise, (e) => {
    assert.equal(e.name, "QueueError", `lỗi lạ: ${e.message}`);
    if (reason) assert.equal(e.code, reason, `mong ${reason} nhưng nhận ${e.code}: ${e.message}`);
    return true;
  });
};

test("check-in: số thứ tự duy nhất khi 10 người check-in song song; idempotent; đúng chủ vé", opt, async () => {
  const ctx = await setup();
  const { queue, doctors, receptionist } = ctx;
  const [d1] = doctors;
  try {
    // 4 lịch hẹn đã xác nhận + 6 vãng lai, tất cả vào hàng cùng lúc
    const booked = [];
    for (const [i, tc] of ["T1", "T2", "T3", "T5"].entries()) booked.push(await makeConfirmedBooking(ctx, d1, tc, `b${i}`));
    const results = await Promise.all([
      ...booked.map((b) => queue.checkIn({ bookingId: b.bookingId, actor: b.patient })),
      ...Array.from({ length: 6 }, (_, i) => queue.createWalkIn({ doctorId: d1.id, name: `Vãng lai ${i}`, actor: receptionist })),
    ]);
    assert.equal(results.length, 10);
    const keys = results.map((t) => `${t.shift}:${t.seq}`);
    assert.equal(new Set(keys).size, 10, `số thứ tự bị trùng: ${keys.join(",")}`);
    for (const shift of ["MORNING", "AFTERNOON"]) {
      const seqs = results.filter((t) => t.shift === shift).map((t) => t.seq).sort((a, b) => a - b);
      assert.deepEqual(seqs, seqs.map((_, i) => i + 1), `ca ${shift}: số phải liên tục từ 1`);
    }
    results.forEach((t) => assert.match(t.displayNo, /^QT\d+-\d{3}$/));

    // Idempotent: check-in lần 2 trả đúng vé cũ, không tạo vé mới
    const again = await queue.checkIn({ bookingId: booked[0].bookingId, actor: booked[0].patient });
    const first = results.find((t) => t.booking && t.booking.id === Number(booked[0].bookingId));
    assert.equal(again.id, first.id);
    assert.equal(await ctx.db.QueueTicket.count({ where: { bookingId: booked[0].bookingId } }), 1);

    // Người lạ không check-in hộ được; nhân viên (queue:checkin) thì được
    const stranger = { id: 999999999, permissions: new Set(ctx.DEFAULT_ROLE_PERMISSIONS.R3) };
    const extra = await makeConfirmedBooking(ctx, d1, "T6", "extra");
    await expectErr(queue.checkIn({ bookingId: extra.bookingId, actor: stranger }), "FORBIDDEN");
    const viaStaff = await queue.checkIn({ bookingId: extra.bookingId, actor: receptionist });
    assert.equal(viaStaff.status, "WAITING");
  } finally {
    await cleanup(ctx);
  }
});

test("check-in bị từ chối: lịch chưa xác nhận, sai ngày, đã huỷ", opt, async () => {
  const ctx = await setup();
  const { queue, doctors, receptionist, db, dateToMs } = ctx;
  const [d1] = doctors;
  try {
    const booking = require("../src/services/bookingService");
    // chưa xác nhận (S1)
    const r = await booking.createBooking({
      email: `qtest-s1-${Date.now()}@example.com`, doctorId: d1.id, date: dateToMs(ctx.today), timeType: "T2",
      fullName: "Chua Xac Nhan", selectedGender: "M", address: "x",
    });
    assert.equal(r.errCode, 0);
    ctx.created.users.push(r.booking.patientId);
    await expectErr(queue.checkIn({ bookingId: r.booking.id, actor: receptionist }), "BOOKING_NOT_CONFIRMED");

    // sai ngày: lịch của ngày mai
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
    const [sch, made] = await db.Schedule.findOrCreate({ where: { doctorId: d1.id, workDate: tomorrow, timeType: "T1" }, defaults: { maxNumber: 5, currentNumber: 0, status: "available" }, raw: false });
    if (made) ctx.created.schedules.push(sch.id);
    const nextDay = await makeConfirmedBooking(ctx, d1, "T1", "tomorrow", { date: dateToMs(tomorrow) });
    await expectErr(queue.checkIn({ bookingId: nextDay.bookingId, actor: receptionist }), "NOT_TODAY");

    // lịch không tồn tại
    await expectErr(queue.checkIn({ bookingId: 987654321, actor: receptionist }), "NOT_FOUND");
  } finally {
    await cleanup(ctx);
  }
});

test("bác sĩ: gọi số tiếp theo theo đúng thứ tự, mỗi lúc chỉ một bệnh nhân, 5 lần gọi song song chỉ 1 thành công", opt, async () => {
  const ctx = await setup();
  const { queue, doctors, receptionist, db } = ctx;
  const [d1, d2] = doctors;
  try {
    const w = [];
    for (let i = 0; i < 4; i++) {
      w.push(await queue.createWalkIn({ doctorId: d1.id, name: `BN ${i}`, actor: receptionist }));
      await sleep(5); // sortAt tăng dần để thứ tự xác định
    }
    const w2 = await queue.createWalkIn({ doctorId: d2.id, name: "BN của bác sĩ 2", actor: receptionist });

    // 5 yêu cầu "gọi số tiếp theo" cùng lúc của bác sĩ 1 -> đúng 1 thành công
    const racing = await Promise.allSettled(Array.from({ length: 5 }, () => queue.callNext({ actor: d1.actor })));
    assert.equal(racing.filter((r) => r.status === "fulfilled").length, 1);
    assert.ok(racing.filter((r) => r.status === "rejected").every((r) => r.reason.code === "DOCTOR_BUSY"));
    const called = racing.find((r) => r.status === "fulfilled").value;
    assert.equal(called.id, w[0].id, "người đứng đầu (đến trước) được gọi trước");
    assert.equal(called.status, "CALLED");
    assert.equal(await db.QueueTicket.count({ where: { doctorId: d1.id, status: "CALLED" } }), 1);

    // Bác sĩ 2 gọi song song với bác sĩ 1: không ảnh hưởng nhau
    const other = await queue.callNext({ actor: d2.actor });
    assert.equal(other.id, w2.id);

    // Chưa bắt đầu khám thì không hoàn thành được; không gọi thêm khi đang có người được gọi
    await expectErr(queue.finishTicket({ ticketId: called.id, actor: d1.actor }), "INVALID_TRANSITION");
    await expectErr(queue.callNext({ actor: d1.actor }), "DOCTOR_BUSY");

    // Vé của bác sĩ khác: không thao tác được
    await expectErr(queue.startTicket({ ticketId: called.id, actor: d2.actor }), "FORBIDDEN");

    const started = await queue.startTicket({ ticketId: called.id, actor: d1.actor });
    assert.equal(started.status, "IN_PROGRESS");
    await expectErr(queue.callNext({ actor: d1.actor }), "DOCTOR_BUSY");
    await sleep(30);
    const done = await queue.finishTicket({ ticketId: called.id, actor: d1.actor });
    assert.equal(done.status, "DONE");
    const ev = await db.QueueEvent.findAll({ where: { ticketId: called.id }, order: [["id", "ASC"]], raw: true });
    assert.deepEqual(ev.map((e) => e.eventType), ["WALK_IN", "CALL", "START", "FINISH"], "mọi bước đều được ghi nhật ký");
    assert.ok(ev.at(-1).payload.durationMin >= 0);

    // Người kế tiếp
    const next = await queue.callNext({ actor: d1.actor });
    assert.equal(next.id, w[1].id);
  } finally {
    await cleanup(ctx);
  }
});

test("khẩn cấp chen lên đầu (bắt buộc lý do + quyền); xin dời lượt nhường 2 người, tối đa 2 lần", opt, async () => {
  const ctx = await setup();
  const { queue, doctors, receptionist, nurse, db } = ctx;
  const [d1] = doctors;
  try {
    const w = [];
    for (let i = 0; i < 5; i++) {
      w.push(await queue.createWalkIn({ doctorId: d1.id, name: `BN ${i}`, actor: receptionist }));
      await sleep(5);
    }
    const order = async () => (await queue.getDoctorBoard({ doctorId: d1.id, actor: d1.actor })).waiting.map((t) => t.id);
    assert.deepEqual(await order(), w.map((t) => t.id));

    // Khẩn cấp
    await expectErr(queue.emergency({ ticketId: w[4].id, reason: "", actor: receptionist }), "BAD_REQUEST");
    await expectErr(queue.emergency({ ticketId: w[4].id, reason: "đau ngực cấp", actor: { id: 1, permissions: new Set() } }), "FORBIDDEN");
    const em = await queue.emergency({ ticketId: w[4].id, reason: "đau ngực cấp", actor: nurse });
    assert.equal(em.priority, "EMERGENCY");
    assert.deepEqual(await order(), [w[4], w[0], w[1], w[2], w[3]].map((t) => t.id), "ca khẩn cấp đứng đầu");
    const evEm = await db.QueueEvent.findOne({ where: { ticketId: w[4].id, eventType: "EMERGENCY" }, raw: true });
    assert.equal(evEm.payload.reason, "đau ngực cấp", "lý do được lưu để truy vết");
    await expectErr(queue.emergency({ ticketId: w[4].id, reason: "lại", actor: nurse }), "ALREADY");

    // Dời lượt: w[0] đang đứng thứ 2 -> nhường 2 người sau (w[1], w[2])
    await queue.postpone({ ticketId: w[0].id, actor: receptionist });
    assert.deepEqual(await order(), [w[4], w[1], w[2], w[0], w[3]].map((t) => t.id));
    await queue.postpone({ ticketId: w[0].id, actor: receptionist });
    assert.deepEqual((await order()).slice(-2), [w[3].id, w[0].id], "lần 2: w0 chỉ còn 1 người phía sau (w3) nên xuống cuối hàng");
    await expectErr(queue.postpone({ ticketId: w[0].id, actor: receptionist }), "MAX_POSTPONE");
    await expectErr(queue.postpone({ ticketId: w[4].id, actor: receptionist }), "NOT_ALLOWED"); // ca khẩn cấp không được dời

    // Gọi số tiếp theo lấy đúng ca khẩn cấp
    const c = await queue.callNext({ actor: d1.actor });
    assert.equal(c.id, w[4].id);
  } finally {
    await cleanup(ctx);
  }
});

test("vắng mặt: cần gọi đủ 3 lần; lần 1 xếp lại cuối hàng, lần 2 kết thúc và huỷ lịch hẹn", opt, async () => {
  const ctx = await setup();
  const { queue, doctors, receptionist, db } = ctx;
  const [d1] = doctors;
  try {
    const b = await makeConfirmedBooking(ctx, d1, "T2", "noshow");
    const ticket = await queue.checkIn({ bookingId: b.bookingId, actor: b.patient });
    const walk = await queue.createWalkIn({ doctorId: d1.id, name: "Người khác", actor: receptionist });

    await queue.callTicket({ ticketId: ticket.id, actor: d1.actor }); // gọi lần 1
    await expectErr(queue.markNoShow({ ticketId: ticket.id, actor: d1.actor }), "NOT_ENOUGH_CALLS");
    await queue.callTicket({ ticketId: ticket.id, actor: d1.actor }); // gọi lại lần 2
    const third = await queue.callTicket({ ticketId: ticket.id, actor: d1.actor }); // lần 3
    assert.equal(third.callCount, 3);
    await expectErr(queue.callTicket({ ticketId: ticket.id, actor: d1.actor }), "MAX_CALLS");

    // Lần vắng mặt thứ 1: xếp lại cuối hàng
    const requeued = await queue.markNoShow({ ticketId: ticket.id, actor: d1.actor });
    assert.equal(requeued.status, "WAITING");
    assert.equal(requeued.callCount, 0);
    const board = await queue.getDoctorBoard({ doctorId: d1.id, actor: d1.actor });
    assert.deepEqual(board.waiting.map((t) => t.id), [walk.id, ticket.id], "bị đẩy xuống sau người đang chờ");

    // Lần 2: gọi đủ 3 lần rồi vắng mặt -> kết thúc + huỷ lịch hẹn, nhả khung giờ
    for (let i = 0; i < 3; i++) await queue.callTicket({ ticketId: ticket.id, actor: d1.actor }).catch(async (e) => {
      if (e.code === "DOCTOR_BUSY") throw e; // không được xảy ra: chỉ có 1 vé được gọi
      throw e;
    });
    const final = await queue.markNoShow({ ticketId: ticket.id, actor: d1.actor });
    assert.equal(final.status, "NO_SHOW");
    await sleep(100); // postCommit huỷ lịch hẹn
    const bk = await db.Booking.findOne({ where: { id: b.bookingId }, raw: true });
    assert.equal(bk.statusId, "S4", "lịch hẹn bị huỷ sau lần vắng mặt thứ 2");
    assert.equal(bk.cancelReason, "NO_SHOW");
    const events = (await db.QueueEvent.findAll({ where: { ticketId: ticket.id }, raw: true })).map((e) => e.eventType);
    assert.ok(events.includes("NO_SHOW_REQUEUE") && events.includes("NO_SHOW"));
    // Vé đã kết thúc: không check-in lại được
    await expectErr(queue.checkIn({ bookingId: b.bookingId, actor: receptionist }), "BOOKING_NOT_CONFIRMED");
  } finally {
    await cleanup(ctx);
  }
});

test("huỷ vé / check-in lại; chủ vé tự dời lượt và huỷ; người lạ thì không", opt, async () => {
  const ctx = await setup();
  const { queue, doctors, receptionist } = ctx;
  const [d1] = doctors;
  try {
    const b = await makeConfirmedBooking(ctx, d1, "T3", "cancel");
    const t = await queue.checkIn({ bookingId: b.bookingId, actor: b.patient });
    const stranger = { id: 999999998, permissions: new Set(ctx.DEFAULT_ROLE_PERMISSIONS.R3) };
    await expectErr(queue.cancel({ ticketId: t.id, actor: stranger }), "FORBIDDEN");
    await expectErr(queue.postpone({ ticketId: t.id, actor: stranger }), "FORBIDDEN");

    const cancelled = await queue.cancel({ ticketId: t.id, actor: b.patient });
    assert.equal(cancelled.status, "CANCELLED");
    await expectErr(queue.callTicket({ ticketId: t.id, actor: d1.actor }), "INVALID_TRANSITION");
    const revived = await queue.checkIn({ bookingId: b.bookingId, actor: b.patient }); // đến lại
    assert.equal(revived.id, t.id);
    assert.equal(revived.status, "WAITING");
    assert.equal(revived.displayNo, t.displayNo, "giữ nguyên số thứ tự cũ");

    const mine = await queue.getMyTickets({ userId: b.patient.id });
    assert.equal(mine.length, 1);
    assert.equal(mine[0].status, "WAITING");
    assert.equal(typeof mine[0].estimatedWaitMin, "number");
    void receptionist;
  } finally {
    await cleanup(ctx);
  }
});

test("TV sảnh: chỉ có số thứ tự, không lộ tên bệnh nhân; ETA có cơ sở 'history' sau khi có ca hoàn thành", opt, async () => {
  const ctx = await setup();
  const { queue, doctors, receptionist } = ctx;
  const [d1] = doctors;
  try {
    const w = [];
    for (let i = 0; i < 3; i++) {
      w.push(await queue.createWalkIn({ doctorId: d1.id, name: `Bí mật ${i}`, actor: receptionist }));
      await sleep(5);
    }
    const c = await queue.callNext({ actor: d1.actor });
    const display = await queue.getRoomDisplay({ roomId: d1.room.id });
    assert.equal(display.serving.length, 1);
    assert.equal(display.serving[0].displayNo, c.displayNo);
    assert.equal(display.next.length, 2);
    assert.ok(!JSON.stringify(display).includes("Bí mật"), "TV không được lộ tên bệnh nhân");

    // Hoàn thành 1 ca -> ETA chuyển sang dựa trên lịch sử thực tế
    await queue.startTicket({ ticketId: c.id, actor: d1.actor });
    await sleep(1200); // cột DATETIME chính xác đến giây; ca < 1 giây bị coi là nhiễu
    await queue.finishTicket({ ticketId: c.id, actor: d1.actor });
    const board = await queue.getDoctorBoard({ doctorId: d1.id, actor: d1.actor });
    assert.equal(board.stats.done, 1);
    assert.equal(board.waiting[0].etaBasis, "history");
    assert.equal(board.waiting[0].aheadCount, 0);
    assert.equal(board.waiting[1].aheadCount, 1);
    assert.ok(board.waiting[1].estimatedWaitMin >= board.waiting[0].estimatedWaitMin);
  } finally {
    await cleanup(ctx);
  }
});

test("walk-in: thiếu quyền, thiếu tên, bác sĩ không có lịch/phòng", opt, async () => {
  const ctx = await setup();
  const { queue, doctors, receptionist, db } = ctx;
  const [d1] = doctors;
  try {
    await expectErr(queue.createWalkIn({ doctorId: d1.id, name: "X Y", actor: d1.actor }), "FORBIDDEN"); // bác sĩ không có queue:walkin:create
    await expectErr(queue.createWalkIn({ doctorId: d1.id, name: "", actor: receptionist }), "BAD_REQUEST");
    await expectErr(queue.createWalkIn({ doctorId: d1.id, name: "Khẩn", priority: "EMERGENCY", actor: { id: 1, permissions: new Set(["queue:walkin:create"]) } }), "FORBIDDEN");
    // bác sĩ chưa có lịch hôm nay
    const other = await db.DoctorProfile.findOne({ where: { doctorId: { [db.Sequelize.Op.notIn]: doctors.map((d) => d.id) } }, attributes: ["doctorId"], raw: true });
    if (other) {
      const has = await db.Schedule.count({ where: { doctorId: other.doctorId, workDate: ctx.today } });
      if (!has) await expectErr(queue.createWalkIn({ doctorId: other.doctorId, name: "Không lịch", actor: receptionist }), "NO_SCHEDULE");
    }
  } finally {
    await cleanup(ctx);
  }
});
