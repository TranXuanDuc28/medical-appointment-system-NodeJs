const db = require("../models");
const { imageOut, pickTranslation, upsertTranslation, defined } = require("../utils/legacyContent");
const { markdownOf } = require("../utils/legacyShapes");

let checkRequiredFields = (inputData) => {
  let arrFields = ["action", "imageBase64", "contentHTML", "contentMarkdown", "lang"];
  for (let i = 0; i < arrFields.length; i++) {
    if (!inputData[arrFields[i]]) return { isValid: false, element: arrFields[i] };
  }
  return { isValid: true, element: "" };
};

let createSpecialty = async (inputData) => {
  let checkObj = checkRequiredFields(inputData);
  if (!checkObj.isValid) {
    return { errCode: 1, errMessage: `Missing parameter: ${checkObj.element}` };
  }
  if (inputData.action !== "CREATE" && inputData.action !== "UPDATE") {
    return { errCode: 3, errMessage: "Hành động không hợp lệ" };
  }
  // name là NOT NULL ở bảng bản dịch
  if (!inputData.name) {
    return { errCode: 1, errMessage: "Missing parameter: name" };
  }
  const t = await db.sequelize.transaction();
  try {
    const content = defined({
      name: inputData.name,
      contentHtml: inputData.contentHTML,
      contentMarkdown: inputData.contentMarkdown,
      description:
        inputData.action === "CREATE" ? inputData.description || null : inputData.description,
    });
    if (inputData.action === "CREATE") {
      const specialty = await db.Specialty.create({ image: inputData.imageBase64 }, { transaction: t });
      await upsertTranslation(db.Specialty_Translation, "specialtyId", specialty.id, inputData.lang, content, t);
      await t.commit();
      return { errCode: 0, errMesssage: "Tạo chuyên khoa thành công" };
    }
    // UPDATE
    const specialty = await db.Specialty.findOne({
      where: { id: inputData.specialtyId },
      raw: false,
      transaction: t,
    });
    if (!specialty) {
      await t.rollback();
      return { errCode: 2, errMessage: "Không tìm thấy chuyên khoa để cập nhật" };
    }
    specialty.image = inputData.imageBase64;
    await specialty.save({ transaction: t });
    await upsertTranslation(db.Specialty_Translation, "specialtyId", specialty.id, inputData.lang, content, t);
    await t.commit();
    return { errCode: 0, errMessage: "Cập nhật chuyên khoa thành công" };
  } catch (e) {
    await t.rollback().catch(() => {});
    throw e;
  }
};

const TR_ATTRS = ["specialtyId", "lang", "name", "description", "contentMarkdown", "contentHtml", "createdAt", "updatedAt"];

let getAllSpecialty = async (lang = "vi") => {
  lang = lang || "vi";
  const [specialties, translations] = await Promise.all([
    db.Specialty.findAll({ order: [["id", "ASC"]] }),
    db.Specialty_Translation.findAll({ where: { lang }, attributes: TR_ATTRS }),
  ]);
  const byId = new Map(translations.map((t) => [String(t.specialtyId), t]));
  const data = specialties.map((s) => {
    const t = byId.get(String(s.id));
    const specialtyData = pickTranslation(t, "specialtyId", "specialtyId", ["name"]);
    const md = markdownOf(t);
    return {
      id: s.id,
      image: imageOut(s.image),
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      specialtyData,
      specialtyMarkdown: t
        ? { contentHTML: md.contentHTML, contentMarkdown: md.contentMarkdown, description: md.description }
        : { contentHTML: null, contentMarkdown: null, description: null },
      ...specialtyData,
      description: md ? md.description : null,
    };
  });
  return { errMessage: "Lấy tất cả chuyên khoa", errCode: 0, data };
};

let getDetailSpecialtyById = async (inputId, location, lang) => {
  if (!inputId || !location || !lang) {
    return { errCode: 1, errMessage: "Missing parameter" };
  }
  const specialty = await db.Specialty.findOne({ where: { id: inputId }, attributes: ["id", "image"] });
  if (!specialty) {
    return { errMessage: "Không tìm thấy chuyên khoa", errCode: 0, data: {} };
  }
  const t = await db.Specialty_Translation.findOne({
    where: { specialtyId: specialty.id, lang },
    attributes: TR_ATTRS,
  });
  const where = { specialtyId: specialty.id };
  if (location !== "ALL") where.provinceId = location;
  const profiles = await db.DoctorProfile.findAll({
    where,
    attributes: ["doctorId", "provinceId"],
    order: [["doctorId", "ASC"]],
  });
  const md = markdownOf(t);
  const data = {
    id: specialty.id,
    image: imageOut(specialty.image),
    specialtyData: t ? [pickTranslation(t, "specialtyId", "specialtyId", ["name"])] : [],
    doctorSpecialty: profiles.map((p) => ({ doctorId: p.doctorId, provinceId: p.provinceId })),
    specialtyMarkdown: t
      ? [{ contentHTML: md.contentHTML, contentMarkdown: md.contentMarkdown, description: md.description }]
      : [],
  };
  return { errMessage: "ok", errCode: 0, data };
};

module.exports = {
  createSpecialty: createSpecialty,
  getAllSpecialty: getAllSpecialty,
  getDetailSpecialtyById: getDetailSpecialtyById,
};
