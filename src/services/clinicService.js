const db = require("../models");
const { imageOut, pickTranslation, upsertTranslation, defined } = require("../utils/legacyContent");
const { markdownOf } = require("../utils/legacyShapes");

let checkRequiredFields = (inputData) => {
  let arrFields = ["action", "address", "imageBase64", "contentHTML", "contentMarkdown"];
  for (let i = 0; i < arrFields.length; i++) {
    if (!inputData[arrFields[i]]) return { isValid: false, element: arrFields[i] };
  }
  return { isValid: true, element: "" };
};

let createClinicServices = async (inputData) => {
  let checkObj = checkRequiredFields(inputData);
  if (!checkObj.isValid) {
    return { errCode: 1, errMessage: `Missing parameter: ${checkObj.element}` };
  }
  if (inputData.action !== "CREATE" && inputData.action !== "UPDATE") {
    return { errCode: 3, errMessage: "Hành động không hợp lệ" };
  }
  // lang & name là NOT NULL ở bảng bản dịch
  for (const f of ["lang", "name"]) {
    if (!inputData[f]) return { errCode: 1, errMessage: `Missing parameter: ${f}` };
  }
  const t = await db.sequelize.transaction();
  try {
    const content = defined({
      name: inputData.name,
      address: inputData.address,
      contentHtml: inputData.contentHTML,
      contentMarkdown: inputData.contentMarkdown,
      description: inputData.description,
    });
    if (inputData.action === "CREATE") {
      const clinic = await db.Clinic.create({ image: inputData.imageBase64 }, { transaction: t });
      await upsertTranslation(db.Clinic_Translation, "clinicId", clinic.id, inputData.lang, content, t);
      await t.commit();
      return { errCode: 0, errMessage: "Tạo phòng khám thành công" };
    }
    // UPDATE
    const clinic = await db.Clinic.findOne({ where: { id: inputData.clinicId }, raw: false, transaction: t });
    if (!clinic) {
      await t.rollback();
      return { errCode: 2, errMessage: "Không tìm thấy phòng khám để cập nhật" };
    }
    clinic.image = inputData.imageBase64;
    await clinic.save({ transaction: t });
    await upsertTranslation(db.Clinic_Translation, "clinicId", clinic.id, inputData.lang, content, t);
    await t.commit();
    return { errCode: 0, errMessage: "Cập nhật phòng khám thành công" };
  } catch (e) {
    await t.rollback().catch(() => {});
    throw e;
  }
};

const TR_ATTRS = ["clinicId", "lang", "name", "address", "description", "contentMarkdown", "contentHtml", "createdAt", "updatedAt"];
const clinicDataOf = (t) => pickTranslation(t, "clinicId", "clinicId", ["name", "address"]);
const clinicMarkdownOf = (t) => {
  const md = markdownOf(t) || { contentHTML: null, contentMarkdown: null };
  return { contentHTML: md.contentHTML, contentMarkdown: md.contentMarkdown };
};

let getAllClinic = async (lang = "vi") => {
  lang = lang || "vi";
  const [clinics, translations] = await Promise.all([
    db.Clinic.findAll({ order: [["id", "ASC"]] }),
    db.Clinic_Translation.findAll({ where: { lang }, attributes: TR_ATTRS }),
  ]);
  const byId = new Map(translations.map((t) => [String(t.clinicId), t]));
  const data = [];
  for (const c of clinics) {
    const t = byId.get(String(c.id));
    // Cũ: JOIN bắt buộc với Markdown theo lang => chỉ trả phòng khám đã có nội dung giới thiệu ở ngôn ngữ đó.
    if (!t || (t.contentHtml == null && t.contentMarkdown == null)) continue;
    const clinicData = clinicDataOf(t);
    data.push({
      id: c.id,
      image: imageOut(c.image),
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      clinicData,
      clinicMarkdown: clinicMarkdownOf(t),
      ...clinicData,
    });
  }
  return { errMessage: "ok", errCode: 0, data };
};

let getDetailClinicById = async (inputId, lang) => {
  if (!inputId || !lang) {
    return { errCode: 1, errMessage: "Missing parameter" };
  }
  const clinic = await db.Clinic.findOne({ where: { id: inputId }, attributes: ["id", "image"] });
  if (!clinic) {
    return { errCode: 2, errMessage: "Không tìm thấy phòng khám" };
  }
  const t = await db.Clinic_Translation.findOne({ where: { clinicId: clinic.id, lang }, attributes: TR_ATTRS });
  // Cũ (raw+nest) chỉ trả 1 object (bác sĩ đầu tiên) nên frontend DetailClinic
  // (đọc doctorClinic.length/.map) không bao giờ hiện bác sĩ. Nay trả MẢNG đủ bác sĩ như frontend mong đợi.
  const profiles = await db.DoctorProfile.findAll({
    where: { clinicId: clinic.id },
    attributes: ["doctorId", "provinceId"],
    order: [["doctorId", "ASC"]],
  });
  const clinicData = clinicDataOf(t);
  const data = {
    image: imageOut(clinic.image),
    clinicData,
    doctorClinic: profiles.map((p) => ({ doctorId: p.doctorId, provinceId: p.provinceId })),
    clinicMarkdown: clinicMarkdownOf(t),
    ...clinicData,
  };
  return { errMessage: "ok", errCode: 0, data };
};

module.exports = {
  createClinicServices: createClinicServices,
  getAllClinic: getAllClinic,
  getDetailClinicById: getDetailClinicById,
};
