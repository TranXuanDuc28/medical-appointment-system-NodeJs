/**
 * Phân loại triệu chứng -> chuyên khoa + mức khẩn, gọi AI Service.
 * AI chỉ GỢI Ý (kèm disclaimer), tuyệt đối không chặn việc đặt lịch; AI lỗi thì trả {available:false} để frontend cho chọn khoa thủ công.
 */
const db = require("../../models/index");
const { getClient, AiUnavailableError, AiRequestError } = require("./aiClient");
const { ensureModelVersion } = require("./queueAi");

// Khoá chuyên khoa của AI Service -> tên tiếng Việt trong bảng specialty_translations (so khớp không phân biệt hoa thường)
const KEY_TO_VI = {
  musculoskeletal: "Cơ xương khớp", neurology: "Thần kinh", digestive: "Tiêu hóa", cardiology: "Tim mạch",
  ent: "Tai mũi họng", spine: "Cột sống", respiratory: "Hô hấp - Phổi", dentistry: "Nha khoa",
};
const SEVERITY_ALIASES = { mild: "MILD", nhe: "MILD", "nhẹ": "MILD", moderate: "MODERATE", vua: "MODERATE", "vừa": "MODERATE", severe: "SEVERE", nang: "SEVERE", "nặng": "SEVERE" };

const normalizeSeverity = (s) => (s ? SEVERITY_ALIASES[String(s).trim().toLowerCase()] || null : null);

/** @returns {{available:boolean, reason?:string, ...kết quả của AI Service}} ; ném AiRequestError nếu text không hợp lệ (để trả 400) */
const triage = async (text, client = getClient()) => {
  if (!client.enabled) return { available: false, reason: "Tính năng gợi ý chuyên khoa chưa được bật" };
  try {
    const r = await client.triage(text);
    const resolved = [];
    for (const p of r.predictions || []) {
      resolved.push({ ...p, specialtyId: await specialtyIdByKey(p.specialty_key) });
    }
    return { available: true, ...r, predictions: resolved };
  } catch (e) {
    if (e instanceof AiRequestError) throw e;
    if (e instanceof AiUnavailableError) return { available: false, reason: "Dịch vụ gợi ý tạm thời không khả dụng, vui lòng chọn chuyên khoa thủ công" };
    throw e;
  }
};

const specialtyIdByKey = async (key) => {
  const name = KEY_TO_VI[key];
  if (!name) return null;
  const row = await db.Specialty_Translation.findOne({ where: { lang: "vi", name }, attributes: ["specialtyId"], raw: true });
  return row ? Number(row.specialtyId) : null;
};

/**
 * Lưu triệu chứng khai khi đặt lịch (+ kết quả AI nếu có) vào symptom_intakes. Best-effort: lỗi không ảnh hưởng việc đặt lịch.
 * Mức nặng do BỆNH NHÂN khai (nhẹ/vừa/nặng) – đây là đặc trưng quan trọng nhất của mô hình thời lượng.
 */
const recordIntake = async ({ bookingId, userId, text, severity }, client = getClient()) => {
  const sev = normalizeSeverity(severity);
  const raw = text && String(text).trim() ? String(text).trim().slice(0, 2000) : null;
  if (!raw && !sev) return null;

  let result = null;
  if (raw && raw.length >= 3) {
    try {
      result = await triage(raw, client);
    } catch (_) {
      result = null;
    }
  }
  const top = result && result.available && result.predictions[0];
  return db.SymptomIntake.create({
    bookingId, userId: userId || null, rawText: raw || "(chỉ khai mức độ)", severity: sev,
    suggestedSpecialtyId: top ? top.specialtyId : null, confidence: top ? top.probability : null,
    urgency: result && result.available ? result.urgency : null,
    modelVersionId: result && result.available ? await ensureModelVersion("TRIAGE", result.model_version, client) : null,
  });
};

module.exports = { triage, recordIntake, normalizeSeverity, specialtyIdByKey, KEY_TO_VI };
