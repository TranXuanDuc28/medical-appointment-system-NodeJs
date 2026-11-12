/**
 * Cầu nối hàng đợi <-> AI Service: dựng đặc trưng cho từng vé và gọi mô hình dự đoán thời lượng THEO LÔ.
 *
 * Nguyên tắc: AI chỉ là tối ưu hoá, không phải điều kiện. Mọi lỗi (AI tắt, quá hạn, ngắt mạch, dữ liệu sai) đều trả về
 * Map rỗng để ETA quay về trung bình lịch sử của bác sĩ – hàng đợi luôn hoạt động.
 */
const db = require("../../models/index");
const { getClient, AiUnavailableError, AiRequestError } = require("./aiClient");

const TTL_CACHE_MS = 5000; // gộp các lần tính ETA liên tiếp trong vài giây (một thao tác kích hoạt nhiều lần tính)
const TTL_DOCTOR_MS = 10 * 60 * 1000;

const predictionCache = new Map(); // JSON(item) -> {value, exp}
const doctorCache = new Map(); // doctorId -> {value, exp}
const versionIds = new Map(); // `${kind}:${version}` -> id

const hourOfDay = (now = new Date()) => {
  const [h, m] = now.toLocaleTimeString("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hour12: false }).split(":");
  return Math.min(22, Math.max(5, Number(h) + Number(m) / 60));
};

const ageAt = (dob, date) => {
  if (!dob) return null;
  const years = (new Date(`${String(date).slice(0, 10)}T00:00:00+07:00`) - new Date(`${String(dob).slice(0, 10)}T00:00:00+07:00`)) / (365.25 * 24 * 3600 * 1000);
  return Number.isFinite(years) && years >= 0 && years <= 120 ? Math.round(years) : null;
};

const chronicCount = (text) => (text ? Math.min(String(text).split(/[,;\n]/).filter((s) => s.trim()).length, 10) : 0);

/** Khoa (tên tiếng Việt) + số năm kinh nghiệm của bác sĩ; cache 10 phút. */
const doctorInfo = async (doctorId) => {
  const hit = doctorCache.get(String(doctorId));
  if (hit && hit.exp > Date.now()) return hit.value;
  const profile = await db.DoctorProfile.findOne({ where: { doctorId }, attributes: ["specialtyId", "yearsOfExperience"], raw: true });
  let value = null;
  if (profile) {
    const tr = await db.Specialty_Translation.findOne({ where: { specialtyId: profile.specialtyId, lang: "vi" }, attributes: ["name"], raw: true });
    value = { department: tr ? tr.name : null, experience: profile.yearsOfExperience };
  }
  doctorCache.set(String(doctorId), { value, exp: Date.now() + TTL_DOCTOR_MS });
  return value;
};

/** Dựng đặc trưng cho từng vé (chỉ gửi thông tin có thật; thiếu thì AI Service tự dùng mặc định và báo lại). */
const buildItems = async (tickets, { doctorId, avgMinutes }) => {
  const doc = await doctorInfo(doctorId);
  if (!doc || !doc.department) return null; // không biết khoa => không dự đoán được
  const profileIds = tickets.map((t) => t.patientProfileId).filter(Boolean);
  const bookingIds = tickets.map((t) => t.bookingId).filter(Boolean);
  const [profiles, intakes] = await Promise.all([
    profileIds.length ? db.PatientProfile.findAll({ where: { id: profileIds }, attributes: ["id", "dateOfBirth", "gender", "chronicConditions"], raw: true }) : [],
    bookingIds.length ? db.SymptomIntake.findAll({ where: { bookingId: bookingIds }, attributes: ["bookingId", "severity"], raw: true }) : [],
  ]);
  const profileBy = new Map(profiles.map((p) => [String(p.id), p]));
  const severityBy = new Map(intakes.filter((i) => i.severity).map((i) => [String(i.bookingId), i.severity]));
  const waiting = tickets.filter((t) => t.status === "WAITING").length;
  const hour = hourOfDay();

  return tickets.map((t) => {
    const p = t.patientProfileId ? profileBy.get(String(t.patientProfileId)) : null;
    const item = { department: doc.department, source: t.source, hour_of_day: hour, queue_length: waiting };
    if (doc.experience !== null && doc.experience !== undefined) item.doctor_experience_years = doc.experience;
    if (avgMinutes) item.doctor_hist_avg_min = Math.round(avgMinutes * 100) / 100;
    if (p) {
      const age = ageAt(p.dateOfBirth, t.ticketDate);
      if (age !== null) item.age = age;
      if (p.gender) item.gender = p.gender;
      item.chronic_count = chronicCount(p.chronicConditions);
    }
    const sev = t.bookingId ? severityBy.get(String(t.bookingId)) : null;
    if (sev) item.severity = sev;
    return item;
  });
};

/**
 * Dự đoán thời lượng cho các vé đang hoạt động của MỘT bác sĩ.
 * @returns Map<ticketId, {minutes,p10,p90,version,usedDefaults}>; rỗng nếu AI không dùng được.
 */
const predictDurations = async (tickets, ctx, client = getClient()) => {
  const out = new Map();
  if (!client.enabled || tickets.length === 0) return out;
  try {
    const items = await buildItems(tickets, ctx);
    if (!items) return out;

    const now = Date.now();
    const keys = items.map((it) => JSON.stringify(it));
    const missing = [];
    keys.forEach((k, i) => {
      const hit = predictionCache.get(k);
      if (!hit || hit.exp <= now) missing.push(i);
    });
    if (missing.length) {
      const preds = await client.predictDuration(missing.map((i) => items[i]));
      missing.forEach((i, j) => predictionCache.set(keys[i], { value: preds[j], exp: now + TTL_CACHE_MS }));
    }
    if (predictionCache.size > 2000) for (const [k, v] of predictionCache) if (v.exp <= now) predictionCache.delete(k);

    tickets.forEach((t, i) => {
      const p = predictionCache.get(keys[i]).value;
      out.set(Number(t.id), { minutes: p.duration_min, p10: p.p10_min, p90: p.p90_min, version: p.model_version, usedDefaults: p.used_defaults, confidence: p.confidence });
    });
    return out;
  } catch (e) {
    if (!(e instanceof AiUnavailableError) && !(e instanceof AiRequestError)) console.error("[AI] lỗi không mong đợi khi dự đoán:", e.message);
    return new Map(); // dự phòng: ETA dùng trung bình lịch sử
  }
};

/** Đăng ký phiên bản mô hình vào ml_model_versions (một lần cho mỗi phiên bản) và trả về id. */
const ensureModelVersion = async (kind, version, client = getClient()) => {
  if (!version) return null;
  const key = `${kind}:${version}`;
  if (versionIds.has(key)) return versionIds.get(key);
  let row = await db.MlModelVersion.findOne({ where: { kind, version }, attributes: ["id"], raw: true });
  if (!row) {
    let meta = null;
    try {
      const info = await client.modelInfo();
      meta = info && info[kind === "DURATION" ? "duration" : "triage"];
    } catch (_) {
      /* best effort: vẫn đăng ký phiên bản dù không lấy được siêu dữ liệu */
    }
    const created = await db.MlModelVersion.create({
      kind, version, algorithm: meta && meta.algorithm ? String(meta.algorithm).slice(0, 50) : "unknown",
      metrics: meta ? { metrics_test: meta.metrics_test || null, holdout: meta.holdout || null, external: meta.external || null, data_source: meta.data_source || null } : null,
      trainedAt: meta && meta.trained_at ? new Date(meta.trained_at) : null, isActive: true,
    });
    row = { id: created.id };
  }
  versionIds.set(key, Number(row.id));
  return Number(row.id);
};

const clearCaches = () => {
  predictionCache.clear();
  doctorCache.clear();
  versionIds.clear();
};

module.exports = { predictDurations, ensureModelVersion, buildItems, clearCaches, _internal: { ageAt, chronicCount, hourOfDay } };
