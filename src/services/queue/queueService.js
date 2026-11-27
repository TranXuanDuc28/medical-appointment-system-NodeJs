/**
 * LÕI HÀNG ĐỢI.
 *
 * Nguyên tắc:
 *  - Mọi thao tác ghi chạy trong transaction READ COMMITTED, khoá dòng (SELECT ... FOR UPDATE) đúng chỗ cần:
 *      · khoá dòng PHÒNG khi cấp số thứ tự  => không bao giờ trùng số dù check-in song song
 *      · khoá dòng BÁC SĨ khi gọi/bắt đầu   => một bác sĩ không bao giờ có 2 bệnh nhân cùng lúc
 *      · khoá dòng VÉ khi đổi trạng thái    => không có 2 thao tác đè lên nhau
 *  - Mọi chuyển trạng thái ghi 1 dòng queue_events (audit + dữ liệu huấn luyện ML).
 *  - Sự kiện realtime chỉ phát SAU KHI COMMIT (queueBus), socket server lắng nghe.
 *  - Quy tắc nghiệp vụ thuần nằm ở queueRules.js (có test riêng).
 */
const { Op, literal } = require("sequelize");
const db = require("../../models/index");
const { todayDate, msToDate } = require("../../utils/dateKey");
const { emitChanged } = require("../../utils/queueBus");
const { estimateForDoctor } = require("./queueEta");
const {
  STATUS, EVENT, ACTIVE_STATUSES, CONFIG, QueueError,
  canTransition, computeSortAt, compareTickets, postponeSortAt, formatDisplayNo,
} = require("./queueRules");

const P = { CHECKIN: "queue:checkin", WALKIN: "queue:walkin:create", EMERGENCY: "queue:emergency", ANY_DOCTOR: "doctor-data:manage:any", ROOM: "room:manage" };

/* ------------------------------ tiện ích ------------------------------ */
const newTransaction = () =>
  db.sequelize.transaction({ isolationLevel: db.Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED });

const has = (actor, perm) => !!(actor && actor.permissions && actor.permissions.has(perm));
const forbid = (msg = "Bạn không có quyền thực hiện thao tác này") => new QueueError("FORBIDDEN", msg, 403);
const notFound = (msg = "Không tìm thấy") => new QueueError("NOT_FOUND", msg, 404);

/** Ca khám (sáng/chiều) theo giờ hiện tại, giờ Việt Nam. */
const currentShift = (now = new Date()) => {
  const hour = Number(now.toLocaleTimeString("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", hour12: false }).slice(0, 2));
  return hour < 12 ? "MORNING" : "AFTERNOON";
};

/** Thông tin khung giờ từ reference_codes.meta ({start,end,shift}). */
const slotInfo = async (timeCode, workDate) => {
  const row = await db.AllCode.findOne({ where: { keyMap: timeCode }, attributes: ["meta"], raw: true });
  let meta = row && row.meta;
  if (typeof meta === "string") meta = JSON.parse(meta);
  if (!meta || !meta.start) throw new QueueError("BAD_SLOT", `Khung giờ ${timeCode} chưa có cấu hình giờ (meta.start)`, 500);
  return { shift: meta.shift || (Number(meta.start.slice(0, 2)) < 12 ? "MORNING" : "AFTERNOON"), slotStart: new Date(`${workDate}T${meta.start}:00+07:00`) };
};

/** Người cao tuổi (>= 65) hoặc trẻ nhỏ (<= 6) tự động được ưu tiên. */
const isPriorityAge = (dob, now = new Date()) => {
  if (!dob) return false;
  const age = (now.getTime() - new Date(`${String(dob).slice(0, 10)}T00:00:00+07:00`).getTime()) / (365.25 * 24 * 3600 * 1000);
  return age >= 65 || age <= 6;
};

const lockRow = (model, where, t, opts = {}) => model.findOne({ where, transaction: t, lock: t.LOCK.UPDATE, raw: false, ...opts });

/** Phòng của bác sĩ: lịch làm việc (schedule.room_id) -> phòng cùng phòng khám + chuyên khoa -> phòng bất kỳ của phòng khám. */
const resolveRoom = async ({ doctorId, workDate, timeType }, t) => {
  const scheduleWhere = { doctorId, workDate, ...(timeType ? { timeType } : {}) };
  const schedules = await db.Schedule.findAll({ where: scheduleWhere, attributes: ["roomId"], raw: true, transaction: t });
  if (!schedules.length) throw new QueueError("NO_SCHEDULE", "Bác sĩ không có lịch làm việc trong ngày này", 409);
  const withRoom = schedules.find((s) => s.roomId);
  if (withRoom) {
    const room = await db.Room.findOne({ where: { id: withRoom.roomId, isActive: true }, raw: false, transaction: t });
    if (room) return room;
  }
  const profile = await db.DoctorProfile.findOne({ where: { doctorId }, attributes: ["clinicId", "specialtyId"], raw: true, transaction: t });
  if (profile) {
    const room =
      (await db.Room.findOne({ where: { clinicId: profile.clinicId, specialtyId: profile.specialtyId, isActive: true }, order: [["id", "ASC"]], raw: false, transaction: t })) ||
      (await db.Room.findOne({ where: { clinicId: profile.clinicId, isActive: true }, order: [["id", "ASC"]], raw: false, transaction: t }));
    if (room) return room;
  }
  throw new QueueError("NO_ROOM", "Bác sĩ chưa được gán phòng khám (tạo phòng và gán phòng trước)", 409);
};

const logEvent = (ticketId, eventType, actor, payload, t) =>
  db.QueueEvent.create({ ticketId, eventType, actorUserId: actor ? actor.id : null, payload: payload || null }, { transaction: t });

/** Tạo vé mới: khoá dòng phòng -> số thứ tự kế tiếp (không trùng). */
const createTicket = async (data, actor, eventType, t) => {
  const room = await lockRoom(data.roomId, t);
  const maxSeq = await db.QueueTicket.max("seq", { where: { roomId: room.id, ticketDate: data.ticketDate, shift: data.shift }, transaction: t });
  const seq = (Number(maxSeq) || 0) + 1;
  const ticket = await db.QueueTicket.create(
    {
      bookingId: data.bookingId || null, roomId: room.id, doctorId: data.doctorId, patientProfileId: data.patientProfileId || null,
      ticketDate: data.ticketDate, shift: data.shift, seq, displayNo: formatDisplayNo(room.code, seq),
      source: data.source, priority: data.priority, status: STATUS.WAITING, checkInAt: data.checkInAt, callCount: 0,
      postponedCount: 0, sortAt: data.sortAt, walkInName: data.walkInName || null, walkInPhone: data.walkInPhone || null,
    },
    { transaction: t }
  );
  await logEvent(ticket.id, eventType, actor, { seq, displayNo: ticket.displayNo, priority: data.priority, sortAt: data.sortAt }, t);
  return ticket;
};
const lockRoom = (roomId, t) => lockRow(db.Room, { id: roomId }, t);

const lockTicket = async (id, t) => {
  const ticket = await lockRow(db.QueueTicket, { id }, t);
  if (!ticket) throw notFound("Không tìm thấy vé");
  return ticket;
};

/** Bác sĩ chỉ thao tác vé của mình (trừ người có quyền doctor-data:manage:any). */
const assertDoctorOf = (ticket, actor) => {
  if (!actor) throw forbid();
  if (has(actor, P.ANY_DOCTOR)) return;
  if (String(ticket.doctorId) !== String(actor.id)) throw forbid("Vé này thuộc bác sĩ khác");
};

/** Chủ vé (bệnh nhân đặt lịch) hoặc nhân viên có quyền check-in. */
const assertOwnerOrStaff = async (ticket, actor, t) => {
  if (has(actor, P.CHECKIN)) return;
  if (ticket.bookingId) {
    const booking = await db.Booking.findOne({ where: { id: ticket.bookingId }, attributes: ["patientId"], raw: true, transaction: t });
    if (booking && String(booking.patientId) === String(actor.id)) return;
  }
  throw forbid();
};

const assertTransition = (event, ticket, hint) => {
  if (!canTransition(event, ticket.status)) {
    throw new QueueError("INVALID_TRANSITION", hint || `Không thể ${event} khi vé đang ở trạng thái ${ticket.status}`, 409);
  }
};

/** Mỗi bác sĩ chỉ xử lý 1 bệnh nhân một lúc: khoá dòng bác sĩ rồi kiểm tra. */
const lockDoctorAndAssertFree = async (ticket, t, { allowCalledSame = false } = {}) => {
  await lockRow(db.User, { id: ticket.doctorId }, t, { attributes: ["id"], paranoid: false });
  const busy = await db.QueueTicket.findOne({
    where: {
      doctorId: ticket.doctorId, ticketDate: ticket.ticketDate, status: { [Op.in]: [STATUS.CALLED, STATUS.IN_PROGRESS] },
      id: { [Op.ne]: ticket.id },
    },
    raw: true, transaction: t,
  });
  if (busy) {
    throw new QueueError("DOCTOR_BUSY", busy.status === STATUS.CALLED
      ? `Đang gọi bệnh nhân ${busy.displayNo}, hãy bắt đầu khám hoặc đánh vắng mặt trước`
      : `Chưa hoàn thành ca đang khám (${busy.displayNo})`, 409);
  }
};

const waitingOrder = [[literal("(priority = 'EMERGENCY')"), "DESC"], ["sortAt", "ASC"], ["id", "ASC"]];

const afterCommit = (ticket, event, extra = {}) =>
  emitChanged({
    event, ticketId: Number(ticket.id), roomId: Number(ticket.roomId), doctorId: Number(ticket.doctorId),
    ticketDate: ticket.ticketDate, shift: ticket.shift, status: ticket.status, ...extra,
  });

const patientUserIdOf = async (ticket) => {
  if (!ticket.bookingId) return null;
  const b = await db.Booking.findOne({ where: { id: ticket.bookingId }, attributes: ["patientId"], raw: true });
  return b ? Number(b.patientId) : null;
};

/** Chạy thao tác trong transaction, commit rồi phát sự kiện + trả vé đã serialize (kèm ETA). */
const run = async (fn, { event }) => {
  const t = await newTransaction();
  let ticket;
  let extra = {};
  try {
    const out = await fn(t);
    ticket = out.ticket;
    extra = out.extra || {};
    await t.commit();
  } catch (e) {
    try { await t.rollback(); } catch (_) { /* đã rollback */ }
    throw e;
  }
  const { postCommit, ...publicExtra } = extra; // hàm postCommit không đưa vào payload sự kiện
  const patientUserId = await patientUserIdOf(ticket);
  afterCommit(ticket, event, { patientUserId, ...publicExtra });
  if (typeof postCommit === "function") await postCommit();
  return getTicket(ticket.id);
};

/* ------------------------------ ghi: bệnh nhân vào hàng ------------------------------ */

/** Check-in bằng mã lịch hẹn (quét QR hoặc bệnh nhân tự bấm). Idempotent: check-in lần 2 trả lại vé đang có. */
const checkIn = async ({ bookingId, actor }) =>
  run(async (t) => {
    const booking = await lockRow(db.Booking, { id: bookingId }, t);
    if (!booking) throw notFound("Không tìm thấy lịch hẹn");
    const profile = booking.patientProfileId
      ? await db.PatientProfile.findOne({ where: { id: booking.patientProfileId }, attributes: ["dateOfBirth"], raw: true, transaction: t })
      : null;
    if (!has(actor, P.CHECKIN) && String(booking.patientId) !== String(actor.id)) throw forbid();
    if (booking.statusId !== "S2") throw new QueueError("BOOKING_NOT_CONFIRMED", "Lịch hẹn chưa được xác nhận hoặc đã bị huỷ/hoàn tất", 409);
    if (booking.workDate !== todayDate()) throw new QueueError("NOT_TODAY", "Chỉ check-in được trong đúng ngày khám", 409);

    const existing = await lockRow(db.QueueTicket, { bookingId: booking.id }, t);
    const now = new Date();
    const { shift, slotStart } = await slotInfo(booking.timeType, booking.workDate);
    const priority = isPriorityAge(profile && profile.dateOfBirth) ? "ELDERLY" : "NORMAL";
    const sortAt = computeSortAt({ source: "BOOKED", slotStart, checkInAt: now, priority });

    if (existing) {
      if (ACTIVE_STATUSES.includes(existing.status)) return { ticket: existing, extra: { idempotent: true } };
      if (existing.status === STATUS.CANCELLED) {
        assertTransition(EVENT.REVIVE, existing);
        await existing.update({ status: STATUS.WAITING, checkInAt: now, sortAt, priority, callCount: 0, calledAt: null }, { transaction: t });
        await logEvent(existing.id, EVENT.REVIVE, actor, { sortAt }, t);
        return { ticket: existing };
      }
      throw new QueueError("TICKET_CLOSED", "Lượt khám của lịch hẹn này đã kết thúc", 409);
    }

    const room = await resolveRoom({ doctorId: booking.doctorId, workDate: booking.workDate, timeType: booking.timeType }, t);
    const ticket = await createTicket(
      { bookingId: booking.id, roomId: room.id, doctorId: booking.doctorId, patientProfileId: booking.patientProfileId, ticketDate: booking.workDate,
        shift, source: "BOOKED", priority, checkInAt: now, sortAt },
      actor, EVENT.CHECK_IN, t
    );
    return { ticket };
  }, { event: EVENT.CHECK_IN });

/** Đăng ký bệnh nhân vãng lai tại quầy (không có tài khoản/lịch hẹn). */
const createWalkIn = async ({ doctorId, name, phone, priority = "NORMAL", actor }) =>
  run(async (t) => {
    if (!has(actor, P.WALKIN)) throw forbid();
    if (!name || String(name).trim().length < 2) throw new QueueError("BAD_REQUEST", "Thiếu họ tên bệnh nhân", 400);
    if (!["NORMAL", "ELDERLY", "EMERGENCY"].includes(priority)) throw new QueueError("BAD_REQUEST", "Mức ưu tiên không hợp lệ", 400);
    if (priority === "EMERGENCY" && !has(actor, P.EMERGENCY)) throw forbid("Không có quyền ưu tiên khẩn cấp");
    const doctor = await db.DoctorProfile.findOne({ where: { doctorId }, attributes: ["doctorId"], raw: true, transaction: t });
    if (!doctor) throw new QueueError("BAD_REQUEST", "Không tìm thấy bác sĩ", 400);

    const now = new Date();
    const ticketDate = todayDate();
    const room = await resolveRoom({ doctorId, workDate: ticketDate }, t);
    const sortAt = computeSortAt({ source: "WALK_IN", checkInAt: now, priority });
    const ticket = await createTicket(
      { roomId: room.id, doctorId, ticketDate, shift: currentShift(now), source: "WALK_IN", priority, checkInAt: now, sortAt,
        walkInName: String(name).trim(), walkInPhone: phone ? String(phone).trim() : null },
      actor, EVENT.WALK_IN, t
    );
    return { ticket };
  }, { event: EVENT.WALK_IN });

/* ------------------------------ ghi: bác sĩ xử lý ------------------------------ */

const doCall = async (ticket, actor, t, extraPayload = {}) => {
  assertTransition(EVENT.CALL, ticket);
  if (ticket.status === STATUS.CALLED && ticket.callCount >= CONFIG.MAX_CALLS) {
    throw new QueueError("MAX_CALLS", `Đã gọi đủ ${CONFIG.MAX_CALLS} lần, hãy đánh dấu vắng mặt`, 409);
  }
  await lockDoctorAndAssertFree(ticket, t);
  const head = await db.QueueTicket.findOne({
    where: { doctorId: ticket.doctorId, ticketDate: ticket.ticketDate, status: STATUS.WAITING }, order: waitingOrder, raw: true, transaction: t,
  });
  const outOfOrder = ticket.status === STATUS.WAITING && head && Number(head.id) !== Number(ticket.id);
  await ticket.update({ status: STATUS.CALLED, calledAt: new Date(), callCount: ticket.callCount + 1 }, { transaction: t });
  await logEvent(ticket.id, EVENT.CALL, actor, { callCount: ticket.callCount, outOfOrder: !!outOfOrder, ...extraPayload }, t);
};

const callTicket = ({ ticketId, actor }) =>
  run(async (t) => {
    const ticket = await lockTicket(ticketId, t);
    assertDoctorOf(ticket, actor);
    await doCall(ticket, actor, t);
    return { ticket, extra: { called: true } };
  }, { event: EVENT.CALL });

/** "Gọi số tiếp theo": chọn người đứng đầu hàng của chính bác sĩ (khẩn cấp > sortAt > id). */
const callNext = ({ doctorId, actor }) =>
  run(async (t) => {
    const id = doctorId || actor.id;
    if (String(id) !== String(actor.id) && !has(actor, P.ANY_DOCTOR)) throw forbid();
    await lockRow(db.User, { id }, t, { attributes: ["id"], paranoid: false });
    const next = await db.QueueTicket.findOne({
      where: { doctorId: id, ticketDate: todayDate(), status: STATUS.WAITING }, order: waitingOrder, raw: false, lock: t.LOCK.UPDATE, transaction: t,
    });
    if (!next) throw new QueueError("QUEUE_EMPTY", "Không còn bệnh nhân đang chờ", 404);
    await doCall(next, actor, t);
    return { ticket: next, extra: { called: true } };
  }, { event: EVENT.CALL });

const startTicket = ({ ticketId, actor }) =>
  run(async (t) => {
    const ticket = await lockTicket(ticketId, t);
    assertDoctorOf(ticket, actor);
    assertTransition(EVENT.START, ticket, "Chỉ bắt đầu khám được khi bệnh nhân đã được gọi");
    await lockDoctorAndAssertFree(ticket, t);
    await ticket.update({ status: STATUS.IN_PROGRESS, startedAt: new Date() }, { transaction: t });
    await logEvent(ticket.id, EVENT.START, actor, null, t);
    return { ticket };
  }, { event: EVENT.START });

const finishTicket = ({ ticketId, actor }) =>
  run(async (t) => {
    const ticket = await lockTicket(ticketId, t);
    assertDoctorOf(ticket, actor);
    assertTransition(EVENT.FINISH, ticket, "Chỉ hoàn thành được ca đang khám");
    const finishedAt = new Date();
    const durationMin = Math.round(((finishedAt - new Date(ticket.startedAt)) / 60000) * 100) / 100;
    await ticket.update({ status: STATUS.DONE, finishedAt }, { transaction: t });
    await logEvent(ticket.id, EVENT.FINISH, actor, { durationMin }, t);
    return { ticket };
  }, { event: EVENT.FINISH });

/**
 * Vắng mặt: phải đã gọi đủ MAX_CALLS lần.
 *  - Lần đầu: xếp lại cuối hàng (WAITING), cho bệnh nhân thêm một cơ hội.
 *  - Lần hai: kết thúc (NO_SHOW) và huỷ lịch hẹn (nhả khung giờ).
 */
const markNoShow = ({ ticketId, actor }) =>
  run(async (t) => {
    const ticket = await lockTicket(ticketId, t);
    assertDoctorOf(ticket, actor);
    assertTransition(EVENT.NO_SHOW, ticket, "Chỉ đánh vắng mặt được bệnh nhân đã được gọi");
    if (ticket.callCount < CONFIG.MAX_CALLS) {
      throw new QueueError("NOT_ENOUGH_CALLS", `Cần gọi tối thiểu ${CONFIG.MAX_CALLS} lần (đã gọi ${ticket.callCount})`, 409);
    }
    const requeued = await db.QueueEvent.count({ where: { ticketId: ticket.id, eventType: EVENT.NO_SHOW_REQUEUE }, transaction: t });
    if (requeued === 0) {
      const sortAt = new Date();
      await ticket.update({ status: STATUS.WAITING, callCount: 0, calledAt: null, sortAt }, { transaction: t });
      await logEvent(ticket.id, EVENT.NO_SHOW_REQUEUE, actor, { sortAt }, t);
      return { ticket, extra: { requeued: true } };
    }
    await ticket.update({ status: STATUS.NO_SHOW }, { transaction: t });
    await logEvent(ticket.id, EVENT.NO_SHOW, actor, { final: true }, t);
    const bookingId = ticket.bookingId;
    return {
      ticket,
      extra: {
        postCommit: async () => {
          if (!bookingId) return;
          try {
            await require("../bookingService").cancelBookingById(bookingId, { force: true, reason: "NO_SHOW" });
          } catch (e) {
            console.error("[Queue] không huỷ được lịch hẹn sau NO_SHOW:", e.message);
          }
        },
      },
    };
  }, { event: EVENT.NO_SHOW });

/* ------------------------------ ghi: bệnh nhân / lễ tân ------------------------------ */

/** Xin dời lượt: nhường cho POSTPONE_AHEAD người phía sau, tối đa MAX_POSTPONE lần. */
const postpone = ({ ticketId, actor }) =>
  run(async (t) => {
    const ticket = await lockTicket(ticketId, t);
    await assertOwnerOrStaff(ticket, actor, t);
    assertTransition(EVENT.POSTPONE, ticket, "Chỉ dời lượt được khi đang chờ");
    if (ticket.priority === "EMERGENCY") throw new QueueError("NOT_ALLOWED", "Ca khẩn cấp không được dời lượt", 409);
    if (ticket.postponedCount >= CONFIG.MAX_POSTPONE) throw new QueueError("MAX_POSTPONE", `Chỉ được dời lượt tối đa ${CONFIG.MAX_POSTPONE} lần`, 409);
    const others = (await db.QueueTicket.findAll({
      where: { doctorId: ticket.doctorId, ticketDate: ticket.ticketDate, status: STATUS.WAITING, id: { [Op.ne]: ticket.id } }, raw: true, transaction: t,
    })).sort(compareTickets);
    const mine = ticket.get({ plain: true });
    const after = others.filter((o) => compareTickets(mine, o) < 0);
    const sortAt = postponeSortAt(after);
    const from = ticket.sortAt;
    await ticket.update({ sortAt, postponedCount: ticket.postponedCount + 1 }, { transaction: t });
    await logEvent(ticket.id, EVENT.POSTPONE, actor, { from, to: sortAt, postponedCount: ticket.postponedCount }, t);
    return { ticket };
  }, { event: EVENT.POSTPONE });

/** Ưu tiên khẩn cấp: bắt buộc nêu lý do (lưu vào nhật ký), vé nhảy lên đầu hàng. */
const emergency = ({ ticketId, reason, actor }) =>
  run(async (t) => {
    if (!has(actor, P.EMERGENCY)) throw forbid();
    if (!reason || String(reason).trim().length < 3) throw new QueueError("BAD_REQUEST", "Cần nêu lý do ưu tiên khẩn cấp", 400);
    const ticket = await lockTicket(ticketId, t);
    assertTransition(EVENT.EMERGENCY, ticket, "Chỉ nâng ưu tiên khẩn cấp được cho bệnh nhân đang chờ");
    if (ticket.priority === "EMERGENCY") throw new QueueError("ALREADY", "Vé đã ở mức khẩn cấp", 409);
    await ticket.update({ priority: "EMERGENCY", sortAt: new Date() }, { transaction: t });
    await logEvent(ticket.id, EVENT.EMERGENCY, actor, { reason: String(reason).trim() }, t);
    return { ticket };
  }, { event: EVENT.EMERGENCY });

const cancel = ({ ticketId, actor }) =>
  run(async (t) => {
    const ticket = await lockTicket(ticketId, t);
    await assertOwnerOrStaff(ticket, actor, t);
    assertTransition(EVENT.CANCEL, ticket, "Chỉ huỷ được khi đang chờ");
    await ticket.update({ status: STATUS.CANCELLED }, { transaction: t });
    await logEvent(ticket.id, EVENT.CANCEL, actor, null, t);
    return { ticket };
  }, { event: EVENT.CANCEL });

/* ------------------------------ đọc ------------------------------ */

const TICKET_INCLUDE = [
  { model: db.Room, as: "room", attributes: ["id", "code", "name", "floor"] },
  { model: db.User, as: "doctor", attributes: ["id", "firstName", "lastName"] },
  { model: db.PatientProfile, as: "profile", attributes: ["fullName", "dateOfBirth"], required: false },
  {
    model: db.Booking, as: "booking", attributes: ["id", "code", "patientId", "timeType"], required: false,
    include: [{ model: db.User, as: "patientData", attributes: ["firstName", "lastName"] }],
  },
];

/** Thời lượng khám trung bình thực tế của bác sĩ (phút) từ 30 ca DONE gần nhất; null nếu chưa có dữ liệu. */
const historyAvgMinutes = async (doctorId) => {
  const [row] = await db.sequelize.query(
    `SELECT AVG(TIMESTAMPDIFF(SECOND, started_at, finished_at)) / 60 AS avg_min FROM (
       SELECT started_at, finished_at FROM queue_tickets
       WHERE doctor_id = ? AND status = 'DONE' AND started_at IS NOT NULL AND finished_at IS NOT NULL
         AND TIMESTAMPDIFF(SECOND, started_at, finished_at) >= 1 -- loại ca bấm nhầm (0 giây)
       ORDER BY finished_at DESC LIMIT 30) x`,
    { replacements: [doctorId], type: db.Sequelize.QueryTypes.SELECT }
  );
  const v = row && row.avg_min !== null ? Number(row.avg_min) : null;
  return v && v > 0 ? Math.min(60, Math.max(3, v)) : null;
};

const publicTicket = (t, eta) => {
  const patientName = t.walkInName
    || (t.profile && t.profile.fullName)
    || (t.booking && t.booking.patientData ? `${t.booking.patientData.firstName} ${t.booking.patientData.lastName}`.trim() : null);
  return {
    id: Number(t.id), displayNo: t.displayNo, seq: t.seq, status: t.status, priority: t.priority, source: t.source,
    ticketDate: t.ticketDate, shift: t.shift,
    room: t.room ? { id: Number(t.room.id), code: t.room.code, name: t.room.name, floor: t.room.floor } : { id: Number(t.roomId) },
    doctor: t.doctor ? { id: Number(t.doctor.id), name: `${t.doctor.firstName} ${t.doctor.lastName}`.trim() } : { id: Number(t.doctorId) },
    patientName, booking: t.booking ? { id: Number(t.booking.id), code: t.booking.code } : null,
    checkInAt: t.checkInAt, calledAt: t.calledAt, startedAt: t.startedAt, finishedAt: t.finishedAt,
    callCount: t.callCount, postponedCount: t.postponedCount,
    ...(eta ? { aheadCount: eta.aheadCount, estimatedWaitMin: eta.waitMinutes, estimatedStartAt: eta.estimatedStartAt, etaBasis: eta.basis } : {}),
  };
};

const loadPlain = (where, extra = {}) =>
  db.QueueTicket.findAll({ where, include: TICKET_INCLUDE, raw: false, ...extra }).then((rows) => rows.map((r) => r.get({ plain: true })));

/** ETA cho tất cả vé đang hoạt động của một bác sĩ trong ngày. */
const etaForDoctor = async (doctorId, ticketDate) => {
  const active = await db.QueueTicket.findAll({
    where: { doctorId, ticketDate, status: { [Op.in]: ACTIVE_STATUSES } }, raw: true,
  });
  return estimateForDoctor(active, await historyAvgMinutes(doctorId));
};

const getTicket = async (id) => {
  const [t] = await loadPlain({ id });
  if (!t) throw notFound("Không tìm thấy vé");
  const etas = ACTIVE_STATUSES.includes(t.status) ? await etaForDoctor(t.doctorId, t.ticketDate) : new Map();
  return publicTicket(t, etas.get(Number(t.id)));
};

/** Bảng điều khiển của bác sĩ: đang xử lý, hàng chờ (đã sắp + ETA), đã xong hôm nay. */
const getDoctorBoard = async ({ doctorId, date, actor }) => {
  if (String(doctorId) !== String(actor.id) && !has(actor, P.ANY_DOCTOR)) throw forbid();
  const ticketDate = date ? msToDate(date) : todayDate();
  const rows = await loadPlain({ doctorId, ticketDate });
  const etas = await etaForDoctor(doctorId, ticketDate);
  const out = (t) => publicTicket(t, etas.get(Number(t.id)));
  const waiting = rows.filter((t) => t.status === STATUS.WAITING).sort(compareTickets).map(out);
  const current = rows.filter((t) => [STATUS.CALLED, STATUS.IN_PROGRESS].includes(t.status)).map(out);
  const done = rows.filter((t) => t.status === STATUS.DONE).sort((a, b) => new Date(b.finishedAt) - new Date(a.finishedAt));
  const avg = await historyAvgMinutes(doctorId);
  return {
    ticketDate, current, waiting,
    done: done.slice(0, 10).map(out),
    stats: {
      waiting: waiting.length, done: done.length,
      noShow: rows.filter((t) => t.status === STATUS.NO_SHOW).length,
      cancelled: rows.filter((t) => t.status === STATUS.CANCELLED).length,
      avgDurationMin: avg ? Math.round(avg * 10) / 10 : null,
    },
  };
};

/** Vé hôm nay của bệnh nhân (kèm vị trí và ETA). */
const getMyTickets = async ({ userId }) => {
  const ticketDate = todayDate();
  const bookings = await db.Booking.findAll({ where: { patientId: userId, workDate: ticketDate }, attributes: ["id"], raw: true });
  if (!bookings.length) return [];
  const rows = await loadPlain({ bookingId: { [Op.in]: bookings.map((b) => b.id) }, ticketDate });
  const cache = new Map();
  const result = [];
  for (const t of rows) {
    if (!cache.has(t.doctorId) && ACTIVE_STATUSES.includes(t.status)) cache.set(t.doctorId, await etaForDoctor(t.doctorId, ticketDate));
    const eta = cache.get(t.doctorId);
    result.push(publicTicket(t, eta && eta.get(Number(t.id))));
  }
  return result;
};

/** Dữ liệu cho màn hình TV sảnh: chỉ số thứ tự (không lộ tên bệnh nhân). */
const getRoomDisplay = async ({ roomId, date }) => {
  const ticketDate = date ? msToDate(date) : todayDate();
  const room = await db.Room.findOne({ where: { id: roomId }, attributes: ["id", "code", "name", "floor"], raw: true });
  if (!room) throw notFound("Không tìm thấy phòng");
  const rows = await loadPlain({ roomId, ticketDate, status: { [Op.in]: ACTIVE_STATUSES } });
  const doctorName = (t) => (t.doctor ? `${t.doctor.firstName} ${t.doctor.lastName}`.trim() : "");
  const serving = rows
    .filter((t) => [STATUS.CALLED, STATUS.IN_PROGRESS].includes(t.status))
    .sort((a, b) => new Date(b.calledAt) - new Date(a.calledAt))
    .map((t) => ({ ticketId: Number(t.id), displayNo: t.displayNo, status: t.status, doctorName: doctorName(t), calledAt: t.calledAt, callCount: t.callCount }));
  const next = rows
    .filter((t) => t.status === STATUS.WAITING)
    .sort(compareTickets)
    .slice(0, 5)
    .map((t) => ({ ticketId: Number(t.id), displayNo: t.displayNo, doctorName: doctorName(t) }));
  return { room, ticketDate, serving, next, generatedAt: new Date() };
};

/** Vé đang hoạt động của một bác sĩ kèm ETA mới nhất, nhóm theo bệnh nhân – dùng để đẩy cập nhật realtime tới điện thoại bệnh nhân. */
const getActiveTicketsForPush = async ({ doctorId, ticketDate }) => {
  const rows = await loadPlain({ doctorId, ticketDate, status: { [Op.in]: ACTIVE_STATUSES } });
  const etas = await etaForDoctor(doctorId, ticketDate);
  return rows
    .filter((t) => t.booking && t.booking.patientId)
    .map((t) => ({ patientUserId: Number(t.booking.patientId), ticket: publicTicket(t, etas.get(Number(t.id))) }));
};

/** Snapshot đầy đủ của phòng để đẩy qua socket (TV + bảng bác sĩ). */
const getRoomSnapshot = ({ roomId, ticketDate }) => getRoomDisplay({ roomId, date: ticketDate });

/* ------------------------------ quản lý phòng ------------------------------ */

const listRooms = async ({ clinicId } = {}) =>
  db.Room.findAll({ where: clinicId ? { clinicId } : {}, order: [["clinicId", "ASC"], ["code", "ASC"]], raw: true });

const createRoom = async ({ clinicId, specialtyId, code, name, floor }, actor) => {
  if (!has(actor, P.ROOM)) throw forbid();
  if (!clinicId || !code || !name) throw new QueueError("BAD_REQUEST", "Thiếu clinicId, code hoặc name", 400);
  try {
    return await db.Room.create({ clinicId, specialtyId: specialtyId || null, code: String(code).trim(), name: String(name).trim(), floor: floor || null, isActive: true });
  } catch (e) {
    if (e.original && e.original.code === "ER_DUP_ENTRY") throw new QueueError("DUPLICATE", "Mã phòng đã tồn tại trong phòng khám này", 409);
    if (e.original && e.original.code === "ER_NO_REFERENCED_ROW_2") throw new QueueError("BAD_REQUEST", "Phòng khám hoặc chuyên khoa không tồn tại", 400);
    throw e;
  }
};

const updateRoom = async (id, patch, actor) => {
  if (!has(actor, P.ROOM)) throw forbid();
  const room = await db.Room.findOne({ where: { id }, raw: false });
  if (!room) throw notFound("Không tìm thấy phòng");
  const allowed = {};
  for (const k of ["specialtyId", "code", "name", "floor", "isActive"]) if (patch[k] !== undefined) allowed[k] = patch[k];
  try {
    await room.update(allowed);
  } catch (e) {
    if (e.original && e.original.code === "ER_DUP_ENTRY") throw new QueueError("DUPLICATE", "Mã phòng đã tồn tại trong phòng khám này", 409);
    throw e;
  }
  return room.get({ plain: true });
};

/** Gán phòng cho mọi khung giờ của một bác sĩ trong một ngày. */
const assignRoom = async ({ doctorId, date, roomId }, actor) => {
  if (!has(actor, P.ROOM)) throw forbid();
  const workDate = msToDate(date);
  if (!workDate) throw new QueueError("BAD_REQUEST", "Ngày không hợp lệ", 400);
  const room = await db.Room.findOne({ where: { id: roomId, isActive: true }, raw: true });
  if (!room) throw new QueueError("BAD_REQUEST", "Phòng không tồn tại hoặc đã tắt", 400);
  const profile = await db.DoctorProfile.findOne({ where: { doctorId }, attributes: ["clinicId"], raw: true });
  if (!profile) throw new QueueError("BAD_REQUEST", "Không tìm thấy bác sĩ", 400);
  if (String(profile.clinicId) !== String(room.clinicId)) throw new QueueError("BAD_REQUEST", "Phòng không thuộc phòng khám của bác sĩ", 400);
  const [updated] = await db.Schedule.update({ roomId }, { where: { doctorId, workDate } });
  return { updatedSlots: updated };
};

module.exports = {
  checkIn, createWalkIn, callTicket, callNext, startTicket, finishTicket, markNoShow, postpone, emergency, cancel,
  getTicket, getDoctorBoard, getMyTickets, getRoomDisplay, getRoomSnapshot, getActiveTicketsForPush,
  listRooms, createRoom, updateRoom, assignRoom,
  // dùng cho test
  _internal: { isPriorityAge, currentShift, resolveRoom, historyAvgMinutes },
};
