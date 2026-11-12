/**
 * Ghi nhận dự đoán của hệ thống (AI hoặc dự phòng) cho từng vé rồi so với KẾT QUẢ THỰC TẾ sau khi khám.
 * Đây là bằng chứng đo được cho đề tài: ETA có AI chính xác hơn bao nhiêu so với cách trung bình lịch sử / cố định 15 phút,
 * ngay trên dữ liệu thật của chính hệ thống (không còn dựa vào dữ liệu mô phỏng).
 *
 *   recordInitial : lúc vé vào hàng – lưu thời lượng dự đoán, ETA, khoảng p10–p90 và các baseline cùng lúc
 *   recordActual  : lúc khám xong   – lưu thời lượng thực tế và thời gian chờ thực tế
 *   getMetrics    : MAE theo phiên bản mô hình, so với baseline
 */
const { Op } = require("sequelize");
const db = require("../../models/index");
const { ensureModelVersion } = require("./queueAi");

const round2 = (v) => Math.round(Number(v) * 100) / 100;
const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
const mae = (pairs) => (pairs.length ? round2(mean(pairs.map(([p, a]) => Math.abs(p - a)))) : null);
const gain = (base, model) => (base && model !== null && base > 0 ? Math.round(((base - model) / base) * 1000) / 10 : null);

/** `eta` lấy từ queueService.etaDetail (có durationMin, waitMinutes, basis, baseline...). Mỗi vé chỉ ghi một lần. */
const recordInitial = async (eta) => {
  if (!eta || !eta.ticketId) return null;
  if (await db.AiPrediction.count({ where: { ticketId: eta.ticketId } })) return null;
  const modelVersionId = eta.basis === "ml" ? await ensureModelVersion("DURATION", eta.modelVersion) : null;
  return db.AiPrediction.create({
    ticketId: eta.ticketId,
    modelVersionId,
    predictedDurationMin: round2(eta.durationMin),
    predictedWaitMin: eta.waitMinutes,
    features: {
      basis: eta.basis, model_version: eta.modelVersion || null, ahead_count: eta.aheadCount, in_service_count: eta.inServiceCount,
      p10_min: eta.p10 ?? null, p90_min: eta.p90 ?? null,
      baseline_duration_min: round2(eta.avgMinutes), baseline_wait_min: eta.baselineWaitMin, const15_wait_min: eta.const15WaitMin,
    },
  });
};

/** Gọi khi ca khám HOÀN THÀNH: điền thời lượng thực tế và thời gian chờ thực tế. */
const recordActual = async (ticketId) => {
  const t = await db.QueueTicket.findOne({ where: { id: ticketId }, attributes: ["checkInAt", "startedAt", "finishedAt"], raw: true });
  if (!t || !t.startedAt || !t.finishedAt) return 0;
  const actualDuration = Math.max((new Date(t.finishedAt) - new Date(t.startedAt)) / 60000, 0);
  const actualWait = t.checkInAt ? Math.max((new Date(t.startedAt) - new Date(t.checkInAt)) / 60000, 0) : null;
  const [n] = await db.AiPrediction.update(
    { actualDurationMin: round2(actualDuration), actualWaitMin: actualWait === null ? null : round2(actualWait) },
    { where: { ticketId } }
  );
  return n;
};

const statsFor = (rows) => {
  const dur = rows.filter((r) => r.actualDurationMin !== null);
  const wait = rows.filter((r) => r.actualWaitMin !== null);
  const inBand = rows.filter((r) => r.f.p10_min !== null && r.f.p90_min !== null && r.actualDurationMin !== null);
  const durMae = mae(dur.map((r) => [r.predictedDurationMin, r.actualDurationMin]));
  const durBase = mae(dur.filter((r) => r.f.baseline_duration_min).map((r) => [r.f.baseline_duration_min, r.actualDurationMin]));
  const waitMae = mae(wait.map((r) => [r.predictedWaitMin, r.actualWaitMin]));
  const waitBase = mae(wait.filter((r) => r.f.baseline_wait_min !== undefined).map((r) => [r.f.baseline_wait_min, r.actualWaitMin]));
  const wait15 = mae(wait.filter((r) => r.f.const15_wait_min !== undefined).map((r) => [r.f.const15_wait_min, r.actualWaitMin]));
  return {
    n: rows.length,
    duration: { mae: durMae, baselineMae: durBase, improvementVsBaselinePct: gain(durBase, durMae) },
    wait: { mae: waitMae, baselineMae: waitBase, const15Mae: wait15, improvementVsBaselinePct: gain(waitBase, waitMae), improvementVsConst15Pct: gain(wait15, waitMae) },
    intervalCoverage: inBand.length ? Math.round((inBand.filter((r) => r.actualDurationMin >= r.f.p10_min && r.actualDurationMin <= r.f.p90_min).length / inBand.length) * 1000) / 1000 : null,
  };
};

/** Số liệu đối sánh trên các ca ĐÃ KHÁM XONG trong `days` ngày gần nhất, tách theo phiên bản mô hình (AI) và dự phòng (không AI). */
const getMetrics = async ({ days = 30 } = {}) => {
  const since = new Date(Date.now() - Math.max(1, Math.min(Number(days) || 30, 365)) * 24 * 3600 * 1000);
  const raw = await db.AiPrediction.findAll({
    where: { actualDurationMin: { [Op.ne]: null }, createdAt: { [Op.gte]: since } },
    attributes: ["ticketId", "modelVersionId", "predictedDurationMin", "predictedWaitMin", "actualDurationMin", "actualWaitMin", "features"],
    order: [["id", "DESC"]], limit: 5000, raw: true,
  });
  const rows = raw.map((r) => ({
    ...r,
    predictedDurationMin: Number(r.predictedDurationMin), predictedWaitMin: Number(r.predictedWaitMin),
    actualDurationMin: r.actualDurationMin === null ? null : Number(r.actualDurationMin),
    actualWaitMin: r.actualWaitMin === null ? null : Number(r.actualWaitMin),
    f: (typeof r.features === "string" ? JSON.parse(r.features) : r.features) || {},
  }));
  const groups = new Map();
  for (const r of rows) {
    const key = r.modelVersionId ? `ml:${r.f.model_version || r.modelVersionId}` : "fallback";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  return {
    periodDays: Math.round((Date.now() - since.getTime()) / 86400000),
    total: statsFor(rows),
    byModel: [...groups.entries()].map(([model, g]) => ({ model, ...statsFor(g) })),
    note: "Chỉ gồm ca đã khám xong. 'fallback' = không dùng AI (trung bình lịch sử). Cần vài chục ca trở lên để so sánh có ý nghĩa.",
  };
};

module.exports = { recordInitial, recordActual, getMetrics, _internal: { statsFor } };
