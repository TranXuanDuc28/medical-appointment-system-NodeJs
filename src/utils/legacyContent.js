/**
 * Hàm dùng chung cho chuyên khoa / phòng khám / cẩm nang (schema v2).
 * Nội dung giới thiệu nằm trong bảng bản dịch; ở đây map ngược về shape API cũ.
 */

/** LONGBLOB -> chuỗi như API cũ (Buffer.from(x,"base64").toString("binary")). */
const imageOut = (img) => (img ? Buffer.from(img, "base64").toString("binary") : img);

/** Bản dịch -> object lồng kiểu cũ {<idKey>, name.., lang, createdAt, updatedAt} (đã bỏ cột id & nội dung). */
const pickTranslation = (t, idKey, fkKey, fields) => {
  const out = { [idKey]: t ? t[fkKey] : null };
  for (const f of fields) out[f] = t ? t[f] ?? null : null;
  out.lang = t ? t.lang : null;
  out.createdAt = t ? t.createdAt : null;
  out.updatedAt = t ? t.updatedAt : null;
  return out;
};

/** Chuẩn hoá authors/reviewers thành chuỗi JSON hợp lệ (DB có CHECK JSON_VALID). */
const toJsonText = (value) => {
  if (Array.isArray(value)) return JSON.stringify(value);
  if (value === undefined || value === null || String(value).trim() === "") return "[]";
  const s = String(value);
  try {
    JSON.parse(s);
    return s;
  } catch (e) {
    return JSON.stringify([s]);
  }
};

/** Upsert 1 dòng bản dịch theo (fkKey, lang) trong transaction. `values` chỉ chứa field cần ghi. */
const upsertTranslation = async (Model, fkKey, fkValue, lang, values, transaction) => {
  const existing = await Model.findOne({ where: { [fkKey]: fkValue, lang }, raw: false, transaction });
  if (existing) {
    await existing.update(values, { transaction });
  } else {
    await Model.create({ [fkKey]: fkValue, lang, ...values }, { transaction });
  }
};

/** Bỏ các key undefined. */
const defined = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

module.exports = { imageOut, pickTranslation, toJsonText, upsertTranslation, defined };
