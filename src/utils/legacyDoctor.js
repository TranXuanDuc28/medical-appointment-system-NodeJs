/**
 * Hàm dựng lại hình dạng JSON CŨ cho khu vực bác sĩ từ schema v2
 * (DoctorProfile + DoctorProfileTranslation thay cho Doctor_Infor + Markdown).
 * Không sửa legacyShapes.js; file này chỉ bổ sung.
 */
const db = require("../models/index");
const { doctorInforOf, markdownOf } = require("./legacyShapes");

const LABELS = ["valueEn", "valueVi"];

/** Buffer ảnh (BLOB) -> chuỗi như API cũ (data URL); null giữ nguyên. */
const imageToString = (img) => (img ? Buffer.from(img, "base64").toString("binary") : img);

/**
 * Nạp DoctorProfile + bản dịch cho nhiều bác sĩ.
 * Trả Map<doctorId, { profile, tr }>; profile là plain object kèm priceTypeData/paymentTypeData/provinceTypeData,
 * doctorData {firstName,lastName,phoneNumber}, doctorSpecialty {..., specialtyData:[bản dịch theo lang]}.
 * Chỉ có entry khi bác sĩ có hồ sơ VÀ (nếu truyền lang) có bản dịch đúng lang — giống INNER JOIN `where lang` của code cũ.
 * Không truyền lang: lấy bản dịch 'vi', thiếu thì bản đầu tiên.
 */
const loadDoctorBundle = async (doctorIds, lang) => {
  const map = new Map();
  const ids = [...new Set((doctorIds || []).map(Number).filter(Number.isFinite))];
  if (!ids.length) return map;

  const [profiles, translations] = await Promise.all([
    db.DoctorProfile.findAll({
      where: { doctorId: ids },
      include: [
        { model: db.AllCode, as: "priceTypeData", attributes: LABELS },
        { model: db.AllCode, as: "paymentTypeData", attributes: LABELS },
        { model: db.AllCode, as: "provinceTypeData", attributes: LABELS },
        { model: db.User, as: "doctorData", attributes: ["firstName", "lastName", "phoneNumber"] },
        {
          model: db.Specialty,
          as: "doctorSpecialty",
          include: [
            {
              model: db.Specialty_Translation,
              as: "specialtyData",
              attributes: ["id", "specialtyId", "lang", "name", "createdAt", "updatedAt"],
              where: lang ? { lang } : undefined,
              required: false,
            },
          ],
        },
      ],
      raw: false,
    }),
    db.DoctorProfileTranslation.findAll({
      where: lang ? { doctorId: ids, lang } : { doctorId: ids },
      order: [["id", "ASC"]],
      raw: true,
    }),
  ]);

  const trByDoctor = new Map();
  for (const t of translations) {
    const cur = trByDoctor.get(t.doctorId);
    if (!cur || (!lang && t.lang === "vi" && cur.lang !== "vi")) trByDoctor.set(t.doctorId, t);
  }
  for (const p of profiles) {
    const plain = p.get({ plain: true });
    const tr = trByDoctor.get(plain.doctorId);
    if (lang && !tr) continue;
    map.set(plain.doctorId, { profile: plain, tr: tr || null });
  }
  return map;
};

/** Object "Doctor_Infor" kiểu cũ. opts.dropIds bỏ id/doctorId; opts.extras ghép thêm khoá. */
const legacyDoctorInfor = (entry, lang, opts = {}) => {
  if (!entry) return null;
  const { profile, tr } = entry;
  const o = doctorInforOf(profile, tr, lang || (tr && tr.lang));
  o.createdAt = profile.createdAt;
  o.updatedAt = profile.updatedAt;
  if (opts.dropIds) {
    delete o.id;
    delete o.doctorId;
  }
  if (opts.noLookups) {
    delete o.priceTypeData;
    delete o.paymentTypeData;
    delete o.provinceTypeData;
  }
  return o;
};

/** Object "Markdown" kiểu cũ (kèm lang); null nếu bản dịch chưa có nội dung nào. */
const legacyMarkdown = (tr) => {
  if (!tr) return null;
  const md = markdownOf(tr);
  if (md.contentHTML == null && md.contentMarkdown == null && md.description == null) return null;
  return { description: md.description, contentHTML: md.contentHTML, contentMarkdown: md.contentMarkdown, lang: tr.lang };
};

/** Giá khám (số) từ AllCode PRICE: numericValue nếu có, không thì valueVi. */
const priceNumber = async (priceCode) => {
  if (!priceCode) return null;
  const row = await db.AllCode.findOne({ where: { keyMap: priceCode }, raw: true });
  if (!row) return null;
  const n = Number(row.numericValue ?? row.valueVi);
  return Number.isFinite(n) ? n : null;
};

module.exports = { imageToString, loadDoctorBundle, legacyDoctorInfor, legacyMarkdown, priceNumber };
