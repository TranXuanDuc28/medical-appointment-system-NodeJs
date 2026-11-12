/**
 * Policy theo tài nguyên (A10): kết hợp "có permission" VÀ "thoả điều kiện dữ liệu".
 *  - :own     -> dữ liệu của chính mình
 *  - :treated -> bác sĩ chỉ xem bệnh nhân có QUAN HỆ ĐIỀU TRỊ (đã có lịch hẹn được xác nhận với mình)
 *  - :any     -> mọi bệnh nhân
 * Mọi lần xem dữ liệu của NGƯỜI KHÁC đều được ghi audit (cả cho phép lẫn từ chối).
 */
const { P } = require("../config/permissions");
const { has, forbidden } = require("./ownership");

// Booking đã được xác nhận trở đi mới tính là quan hệ điều trị (S1 = mới giữ chỗ, S4 = đã huỷ không tính)
const TREATMENT_STATUSES = ["S2", "S3", "S5", "S6"];

let relationChecker = async (doctorId, patientId) => {
  const db = require("../models/index");
  const { Op } = require("sequelize");
  const n = await db.Booking.count({
    where: { doctorId, patientId, statusId: { [Op.in]: TREATMENT_STATUSES } },
  });
  return n > 0;
};
let auditLogger = (entry) => require("../services/auditService").log(entry);

/** Chỉ dùng trong test. */
const setDependencies = ({ relation, audit } = {}) => {
  if (relation) relationChecker = relation;
  if (audit) auditLogger = audit;
};

const hasTreatmentRelation = (doctorId, patientId) => relationChecker(doctorId, patientId);

const patientDataPolicy = ({ extract, own, any, treated, action, resource }) => async (req, res, next) => {
  const user = req.user;
  if (!user) return res.status(401).json({ errCode: -1, errMessage: "Not authenticated user" });
  const target = extract(req);
  const isSelf = target !== undefined && target !== null && String(target) === String(user.id);
  const audit = (result, reason) =>
    auditLogger({ req, action, resource, resourceId: target, result, meta: reason ? { reason } : undefined });

  try {
    if (isSelf && has(user, own)) return next();
    if (!isSelf && any && has(user, any)) {
      audit("ALLOWED", "any");
      return next();
    }
    if (!isSelf && treated && has(user, treated) && (await hasTreatmentRelation(user.id, target))) {
      audit("ALLOWED", "treated");
      return next();
    }
  } catch (e) {
    console.error("[Policy] lỗi kiểm tra quan hệ điều trị:", e.message);
    return res.status(500).json({ errCode: -1, errMessage: "Lỗi từ server!" });
  }
  audit("DENIED");
  return forbidden(res);
};

const medicalRecordPolicy = (extract) =>
  patientDataPolicy({
    extract,
    own: P.RECORD_READ_OWN,
    any: P.RECORD_READ_ANY,
    treated: P.RECORD_READ_TREATED,
    action: "RECORD_READ",
    resource: "patient-record",
  });

const appointmentReadPolicy = (extract) =>
  patientDataPolicy({
    extract,
    own: P.BOOKING_READ_OWN,
    any: P.BOOKING_READ_ANY,
    treated: P.RECORD_READ_TREATED,
    action: "APPOINTMENT_READ",
    resource: "booking",
  });

module.exports = {
  patientDataPolicy,
  medicalRecordPolicy,
  appointmentReadPolicy,
  hasTreatmentRelation,
  setDependencies,
  TREATMENT_STATUSES,
};
