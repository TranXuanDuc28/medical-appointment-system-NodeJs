/**
 * Logic đặt lịch an toàn đồng thời (schema v2).
 *
 * Trạng thái booking (reference_codes.STATUS): S1 = chờ xác nhận email (giữ chỗ có hạn, hold_expires_at),
 * S2 = đã xác nhận, S3 = đã khám/gửi đơn, S4 = đã huỷ / hết hạn giữ chỗ, S5 = đã thanh toán, S6 = chưa thanh toán.
 *
 * Slot "đang bị chiếm" = booking ở S2/S3/S5/S6, hoặc S1 còn trong hạn giữ chỗ.
 * Sức chứa slot = schedules.max_patients (>= 1, có CHECK ở DB).
 *
 * Ràng buộc ở DB (không chỉ ở code): FK ghép (doctor_id, work_date, time_code) -> schedules,
 * UNIQUE(patient_id, work_date, time_code, holder_flag) chặn 1 người giữ 2 lịch cùng giờ.
 *
 * Giao diện với phần còn lại của hệ thống vẫn dùng "date" là chuỗi ms (API cũ); bên trong dùng workDate (DATE).
 */
const crypto = require("crypto");
const { Op } = require("sequelize");
const db = require("../models/index");
const { msToDate, dateToMs, todayDate } = require("../utils/dateKey");

const HOLD_MINUTES = Number(process.env.BOOKING_HOLD_MINUTES) || 15;
const ACTIVE_STATUSES = ["S2", "S3", "S5", "S6"];
const CANCELLABLE_STATUSES = ["S1", "S2"];
const GENDER_CODES = new Set(["M", "F", "O"]);

const sha256 = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");
const holdDeadline = () => new Date(Date.now() + HOLD_MINUTES * 60 * 1000);
const slotCapacity = (slot) => (Number(slot.maxNumber) > 0 ? Number(slot.maxNumber) : 1);
const slotWhere = ({ doctorId, workDate, timeType }) => ({ doctorId, workDate, timeType });
const apiSlotKey = ({ doctorId, workDate, timeType }) => ({ doctorId, date: dateToMs(workDate), timeType });

const activeWhere = () => ({
  [Op.or]: [
    { statusId: { [Op.in]: ACTIVE_STATUSES } },
    { statusId: "S1", holdExpiresAt: { [Op.gt]: new Date() } },
  ],
});

const countOccupied = (slotKey, transaction) =>
  db.Booking.count({ where: { ...slotWhere(slotKey), ...activeWhere() }, transaction });

/** Đồng bộ schedules.current_patients/status với số booking thực tế (gọi trong transaction đã khoá slot). */
const refreshSlot = async (slotKey, transaction) => {
  const slot = await db.Schedule.findOne({ where: slotWhere(slotKey), transaction, raw: false });
  if (!slot) return null;
  const occupied = await countOccupied(slotKey, transaction);
  const capacity = slotCapacity(slot);
  const status = occupied >= capacity ? "booked" : "available";
  await slot.update({ currentNumber: Math.min(occupied, capacity), status }, { transaction });
  return { occupied, capacity, status };
};

const newTransaction = () =>
  db.sequelize.transaction({
    // READ COMMITTED: sau khi khoá dòng slot, COUNT thấy các booking đã commit của giao dịch trước
    isolationLevel: db.Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED,
  });

const lockSlot = (slotKey, transaction) =>
  db.Schedule.findOne({ where: slotWhere(slotKey), transaction, lock: transaction.LOCK.UPDATE, raw: false });

const clearScheduleCache = async () => {
  try {
    const { clearCachePattern } = require("../utils/redis");
    await clearCachePattern("cache:/api/get_schedule_doctor_by_date*");
  } catch (e) {
    /* cache là tuỳ chọn */
  }
};

const isEmail = (s) => typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const newTicketCode = () => crypto.randomBytes(4).toString("hex").toUpperCase(); // 8 ký tự, UNIQUE ở DB

/**
 * Tạo booking ở trạng thái S1 (giữ chỗ). Trả về { errCode, errMessage, booking?, slotKey?, ... }.
 * errCode: 0 ok | 1 thiếu/sai tham số | 3 slot không tồn tại | 4 slot đã đầy | 5 trùng lịch |
 *          6 ngày đã qua | 7 email thuộc tài khoản nhân viên | 9 tài khoản đã bị xoá
 */
const createBooking = async (data) => {
  const required = ["email", "doctorId", "timeType", "date", "fullName", "selectedGender", "address"];
  if (!data || required.some((k) => !data[k]) || !isEmail(data.email)) {
    return { errCode: 1, errMessage: "Thiếu hoặc sai tham số đặt lịch!" };
  }
  const slotKey = {
    doctorId: Number(data.doctorId),
    workDate: msToDate(data.date),
    timeType: String(data.timeType),
  };
  if (!Number.isInteger(slotKey.doctorId) || !slotKey.workDate) {
    return { errCode: 1, errMessage: "doctorId hoặc ngày khám không hợp lệ!" };
  }
  if (slotKey.workDate < todayDate()) {
    return { errCode: 6, errMessage: "Không thể đặt lịch cho ngày đã qua!" };
  }

  const email = data.email.trim().toLowerCase();
  const nameParts = String(data.fullName).trim().split(/\s+/);
  const firstName = nameParts.slice(0, -1).join(" ");
  const lastName = nameParts[nameParts.length - 1];
  const gender = GENDER_CODES.has(data.selectedGender) ? data.selectedGender : null;
  const profileFields = {
    fullName: String(data.fullName).trim(),
    gender,
    phoneNumber: data.phoneNumber || null,
    address: data.address || null,
  };

  const t = await newTransaction();
  try {
    // 1. Khoá dòng slot -> các yêu cầu đồng thời cho cùng slot được xếp hàng tuần tự
    const slot = await lockSlot(slotKey, t);
    if (!slot) {
      await t.rollback();
      return { errCode: 3, errMessage: "Khung giờ khám không tồn tại!" };
    }

    // 2. Kiểm tra còn chỗ
    const occupied = await countOccupied(slotKey, t);
    if (occupied >= slotCapacity(slot)) {
      await slot.update({ currentNumber: slotCapacity(slot), status: "booked" }, { transaction: t });
      await t.commit();
      await clearScheduleCache();
      return { errCode: 4, errMessage: "Khung giờ này đã hết chỗ, vui lòng chọn giờ khác!" };
    }

    // 3. Tìm/tạo tài khoản bệnh nhân (kể cả tài khoản đã xoá mềm để không vi phạm UNIQUE email)
    let user = await db.User.findOne({ where: { email }, transaction: t, raw: false, paranoid: false });
    if (user && user.deletedAt) {
      await t.rollback();
      return { errCode: 9, errMessage: "Tài khoản với email này đã bị xoá, vui lòng dùng email khác!" };
    }
    if (user && user.roleId !== "R3") {
      await t.rollback();
      return {
        errCode: 7,
        errMessage: "Email này thuộc tài khoản nhân viên, vui lòng dùng email khác để đặt lịch!",
      };
    }
    if (!user) {
      user = await db.User.create(
        {
          email, roleId: "R3", firstName, lastName,
          phoneNumber: data.phoneNumber || null, address: data.address || null, gender,
          isActive: true, tokenVersion: 0,
        },
        { transaction: t }
      );
    } else if (!user.password) {
      // Chỉ cập nhật hồ sơ khách (chưa có mật khẩu). Tài khoản đã đăng ký KHÔNG bị ghi đè, không đổi vai trò.
      await user.update(
        { firstName, lastName, phoneNumber: data.phoneNumber || null, address: data.address || null, gender },
        { transaction: t }
      );
    }

    // 3b. Hồ sơ người được khám: mỗi tài khoản có đúng 1 hồ sơ SELF (DB đảm bảo UNIQUE)
    let profile = await db.PatientProfile.findOne({
      where: { ownerUserId: user.id, relationship: "SELF" }, transaction: t, raw: false,
    });
    if (!profile) {
      profile = await db.PatientProfile.create(
        { ownerUserId: user.id, relationship: "SELF", ...profileFields },
        { transaction: t }
      );
    }

    // 4. Chặn trùng giờ: cùng bệnh nhân không giữ 2 lịch cùng ngày + khung giờ (bất kỳ bác sĩ)
    const clash = await db.Booking.findOne({
      where: { patientId: user.id, workDate: slotKey.workDate, timeType: slotKey.timeType, ...activeWhere() },
      transaction: t,
    });
    if (clash) {
      await t.rollback();
      return { errCode: 5, errMessage: "Bạn đã có lịch khám trong khung giờ này!" };
    }

    // 5. Tạo booking giữ chỗ (S1). Token xác nhận chỉ lưu dạng hash; bản gốc chỉ gửi qua email.
    const token = crypto.randomUUID();
    const booking = await db.Booking.create(
      {
        code: newTicketCode(),
        statusId: "S1",
        doctorId: slotKey.doctorId,
        workDate: slotKey.workDate,
        timeType: slotKey.timeType,
        patientId: user.id,
        patientProfileId: profile.id,
        source: "ONLINE",
        symptoms: data.symptoms || null,
        confirmTokenHash: sha256(token),
        holdExpiresAt: holdDeadline(),
      },
      { transaction: t }
    );

    const slotState = await refreshSlot(slotKey, t);
    await t.commit();
    await clearScheduleCache();
    return {
      errCode: 0,
      errMessage: "Giữ chỗ thành công, vui lòng xác nhận qua email!",
      booking: { id: booking.id, code: booking.code, token, doctorId: slotKey.doctorId, patientId: user.id },
      slotKey: apiSlotKey(slotKey),
      slotStatus: slotState ? slotState.status : "booked",
      holdMinutes: HOLD_MINUTES,
    };
  } catch (error) {
    try {
      await t.rollback();
    } catch (_) {}
    // DB là chốt chặn cuối: UNIQUE (patient, slot) bị vi phạm khi hai request song song cùng một bệnh nhân
    if (error && error.original && error.original.code === "ER_DUP_ENTRY") {
      return { errCode: 5, errMessage: "Bạn đã có lịch khám trong khung giờ này!" };
    }
    throw error;
  }
};

/** Huỷ booking + nhả slot. Dùng khi gửi email lỗi, hết hạn giữ chỗ hoặc người dùng/bác sĩ huỷ lịch. */
const cancelBookingById = async (bookingId, { actor, force = false, reason = null } = {}) => {
  const t = await newTransaction();
  try {
    const booking = await db.Booking.findOne({ where: { id: bookingId }, transaction: t, raw: false });
    if (!booking) {
      await t.rollback();
      return { errCode: 2, errMessage: "Không tìm thấy lịch hẹn!" };
    }
    if (!force) {
      const perms = (actor && actor.permissions) || new Set();
      const isOwner = actor && perms.has("booking:cancel:own") && String(booking.patientId) === String(actor.id);
      const isOwnDoctor = actor && perms.has("booking:cancel:assigned") && String(booking.doctorId) === String(actor.id);
      const isAdmin = perms.has("booking:cancel:any");
      if (!isOwner && !isOwnDoctor && !isAdmin) {
        await t.rollback();
        return { errCode: 403, errMessage: "Bạn không có quyền huỷ lịch hẹn này!" };
      }
    }
    if (!CANCELLABLE_STATUSES.includes(booking.statusId)) {
      await t.rollback();
      return { errCode: 3, errMessage: "Lịch hẹn ở trạng thái hiện tại không thể huỷ!" };
    }
    const slotKey = { doctorId: booking.doctorId, workDate: booking.workDate, timeType: booking.timeType };
    await lockSlot(slotKey, t);
    await booking.update({ statusId: "S4", cancelledAt: new Date(), cancelReason: reason }, { transaction: t });
    await refreshSlot(slotKey, t);
    await t.commit();
    await clearScheduleCache();
    return { errCode: 0, errMessage: "Huỷ lịch hẹn thành công!", slotKey: apiSlotKey(slotKey) };
  } catch (error) {
    try {
      await t.rollback();
    } catch (_) {}
    throw error;
  }
};

/** Xác nhận email: chỉ chấp nhận khi còn trong thời hạn giữ chỗ. */
const verifyBooking = async ({ token, doctorId }) => {
  if (!token || !doctorId) return { errCode: 1, errMessage: "Missing parameter" };
  const booking = await db.Booking.findOne({
    where: { doctorId, confirmTokenHash: sha256(token), statusId: "S1" },
    raw: false,
  });
  if (!booking) {
    return { errCode: 2, errMessage: "Appointment has been activated or does not exist" };
  }
  if (!booking.holdExpiresAt || booking.holdExpiresAt < new Date()) {
    await cancelBookingById(booking.id, { force: true, reason: "HOLD_EXPIRED" });
    return { errCode: 3, errMessage: "Liên kết xác nhận đã hết hạn, vui lòng đặt lại lịch!" };
  }
  await booking.update({ statusId: "S2", confirmedAt: new Date(), holdExpiresAt: null });
  return { errCode: 0, errMessage: "Update the appointment succeed" };
};

/** Quét các booking S1 quá hạn giữ chỗ -> S4 và nhả slot. Trả về số booking đã nhả. */
const releaseExpiredHolds = async () => {
  const expired = await db.Booking.findAll({
    where: { statusId: "S1", holdExpiresAt: { [Op.lt]: new Date() } },
    attributes: ["id"],
    raw: true,
  });
  let released = 0;
  for (const b of expired) {
    try {
      const r = await cancelBookingById(b.id, { force: true, reason: "HOLD_EXPIRED" });
      if (r.errCode === 0) released++;
    } catch (e) {
      console.error("[Booking] Lỗi nhả slot hết hạn", b.id, e.message);
    }
  }
  return released;
};

let sweeperTimer = null;
const startHoldSweeper = (intervalMs = 60 * 1000) => {
  if (sweeperTimer) return;
  sweeperTimer = setInterval(() => {
    releaseExpiredHolds().catch((e) => console.error("[Booking] sweeper error:", e.message));
  }, intervalMs);
  sweeperTimer.unref();
};

module.exports = {
  HOLD_MINUTES,
  createBooking,
  cancelBookingById,
  verifyBooking,
  releaseExpiredHolds,
  startHoldSweeper,
  refreshSlot,
  sha256,
};
