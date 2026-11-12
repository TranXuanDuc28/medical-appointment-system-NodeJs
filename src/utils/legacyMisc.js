/**
 * Hàm hỗ trợ cho khu "gói khám / cơ sở / khảo sát / chat" khi port sang schema v2.
 * Response API giữ nguyên hình dạng cũ.
 */
const db = require("../models");

/** Include Specialty (+ bản dịch theo lang) dùng cho Package; thay cho Specialty + Markdown cũ. */
const specialtyInclude = (lang) => ({
  model: db.Specialty,
  as: "specialtyData",
  attributes: ["id", "image"],
  include: [
    {
      model: db.Specialty_Translation,
      as: "specialtyData",
      where: { lang },
      attributes: ["name", "contentHtml", "contentMarkdown"],
      required: false,
    },
  ],
});

/** pkgJson.specialtyData (dạng lồng của v2) -> {id,image,name,descriptionHTML,descriptionMarkdown} như cũ. */
const specialtyShape = (specialty) => {
  if (!specialty) return specialty;
  const t = specialty.specialtyData && specialty.specialtyData[0] ? specialty.specialtyData[0] : {};
  return {
    id: specialty.id,
    image: specialty.image,
    name: t.name || "",
    descriptionHTML: t.contentHtml || "",
    descriptionMarkdown: t.contentMarkdown || "",
  };
};

/** Chuyển lỗi ràng buộc của DB v2 thành {status, message} dễ hiểu; null nếu không nhận ra. */
const friendlyDbError = (error) => {
  const name = error && error.name;
  const msg = (error && (error.original?.sqlMessage || error.message)) || "";
  if (name === "SequelizeForeignKeyConstraintError") {
    if (/delete|update a parent row/i.test(msg))
      return { status: 409, message: "Không thể xóa/sửa vì vẫn còn dữ liệu liên quan (ví dụ cơ sở y tế đang có gói khám)" };
    return { status: 400, message: "Tham chiếu không tồn tại (facilityId/specialtyId/... không hợp lệ)" };
  }
  if (/Check constraint/i.test(msg)) {
    return { status: 400, message: "Dữ liệu vi phạm ràng buộc (giá >= 0, rating 0-5, trường JSON phải hợp lệ)" };
  }
  if (name === "SequelizeDatabaseError" && /Data too long|Out of range|Incorrect .* value/i.test(msg)) {
    return { status: 400, message: "Giá trị không hợp lệ hoặc quá dài" };
  }
  return null;
};

/** Gửi lỗi: ràng buộc DB -> 4xx dễ hiểu, còn lại 500 như cũ. */
const sendError = (res, error) => {
  const f = friendlyDbError(error);
  if (f) return res.status(f.status).json({ errCode: f.status === 409 ? 4 : 3, message: f.message });
  console.log(error);
  return res.status(500).json({ errCode: -1, message: "Error from server", error: error.message });
};

/** Chuỗi JSON hợp lệ hoặc null (giá trị falsy -> null như cũ). */
const jsonText = (v) => (v ? JSON.stringify(v) : null);

/**
 * userId từ frontend -> cột của health_assessments.
 * Toàn chữ số VÀ tồn tại trong users -> {user_id}; còn lại -> {guest_key}.
 */
const assessmentOwner = async (userId) => {
  const s = String(userId);
  if (/^\d+$/.test(s)) {
    const u = await db.User.findOne({ where: { id: s }, attributes: ["id"] });
    if (u) return { user_id: Number(u.id), guest_key: null };
  }
  return { user_id: null, guest_key: s.slice(0, 64) };
};

/** rating DECIMAL của v2 ra chuỗi "4.80"; API cũ trả số 4.8 -> ép về số (không đụng nếu không có). */
const withNumericRating = (obj) => {
  if (obj && typeof obj === "object" && obj.rating !== undefined && obj.rating !== null) {
    obj.rating = Number(obj.rating);
  }
  return obj;
};

/** Instance/POJO -> POJO với rating là số. */
const plainFacility = (f) => withNumericRating(f && typeof f.get === "function" ? f.get({ plain: true }) : f);

module.exports = {
  withNumericRating,
  plainFacility, specialtyInclude, specialtyShape, friendlyDbError, sendError, jsonText, assessmentOwner };
