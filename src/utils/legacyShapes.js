/**
 * Chuyển dữ liệu schema v2 về ĐÚNG hình dạng JSON mà API cũ trả cho frontend.
 * Nguyên tắc: DB chuẩn hoá, nhưng response API giữ nguyên để frontend không phải sửa.
 */
const { dateToMs } = require("./dateKey");

/** Bản dịch (specialty/clinic/handbook/doctor) -> object "Markdown" kiểu cũ. */
const markdownOf = (t) =>
  t
    ? {
        contentHTML: t.contentHtml ?? null,
        contentMarkdown: t.contentMarkdown ?? null,
        description: t.description ?? null,
      }
    : null;

/**
 * DoctorProfile (+ 1 bản dịch theo ngôn ngữ) -> object "Doctor_Infor" kiểu cũ.
 * Có thể truyền kèm priceTypeData/paymentTypeData/provinceTypeData (đã include AllCode).
 */
const doctorInforOf = (profile, tr, lang) => {
  if (!profile) return null;
  const p = typeof profile.get === "function" ? profile.get({ plain: true }) : profile;
  const t = tr && typeof tr.get === "function" ? tr.get({ plain: true }) : tr || {};
  return {
    id: p.doctorId,
    doctorId: p.doctorId,
    specialtyId: p.specialtyId,
    clinicId: p.clinicId,
    priceId: p.priceId,
    provinceId: p.provinceId,
    paymentId: p.paymentId,
    addressClinic: t.clinicAddress ?? null,
    nameClinic: t.clinicName ?? null,
    note: t.note ?? null,
    count: p.bookingCount ?? null,
    lang: lang || t.lang || null,
    priceTypeData: p.priceTypeData,
    paymentTypeData: p.paymentTypeData,
    provinceTypeData: p.provinceTypeData,
  };
};

/** Payment -> object "Cashier" kiểu cũ (bookingId dạng chuỗi, date = unix giây, totalPrire = chuỗi số tiền). */
const cashierOf = (pay) => {
  if (!pay) return null;
  const p = typeof pay.get === "function" ? pay.get({ plain: true }) : pay;
  const when = p.paidAt || p.createdAt;
  return {
    id: p.id,
    bookingId: String(p.bookingId),
    cashier: p.cashier ?? null,
    date: when ? Math.floor(new Date(when).getTime() / 1000) : null,
    totalPrire: String(Number(p.amount || 0)),
    totalPrice: String(Number(p.amount || 0)),
    paymentMethod: p.paymentMethod ?? null,
    description: p.description ?? null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
};

/** MedicalRecord -> object "History" kiểu cũ (document -> files). */
const historyOf = (rec) => {
  if (!rec) return null;
  const r = typeof rec.get === "function" ? rec.get({ plain: true }) : rec;
  return {
    id: r.id,
    patientId: r.patientId,
    doctorId: r.doctorId,
    bookingId: r.bookingId,
    description: r.description,
    files: r.document ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
};

/** Schedule -> object kiểu cũ (date = chuỗi ms 00:00 giờ VN). */
const scheduleOf = (s) => {
  if (!s) return null;
  const p = typeof s.get === "function" ? s.get({ plain: true }) : { ...s };
  return { ...p, date: dateToMs(p.workDate) };
};

/** Booking -> object kiểu cũ (date = chuỗi ms; id giữ số, thêm code). */
const bookingOf = (b) => {
  if (!b) return null;
  const p = typeof b.get === "function" ? b.get({ plain: true }) : { ...b };
  return { ...p, date: dateToMs(p.workDate) };
};

module.exports = { markdownOf, doctorInforOf, cashierOf, historyOf, scheduleOf, bookingOf };
