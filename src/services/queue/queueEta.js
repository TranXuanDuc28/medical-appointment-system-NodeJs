/**
 * Ước lượng thời gian chờ:
 *   Wait(P_n) = còn lại của ca đang khám/đang gọi + Σ thời lượng dự kiến của những người đứng trước
 *
 * Thời lượng dự kiến của mỗi ca lấy theo thứ tự ưu tiên:
 *   1. Mô hình ML (AI Service) – truyền vào `opts.durations` (Map ticketId -> {minutes,p10,p90,version}), gọi THEO LÔ một lần/bác sĩ
 *   2. Bộ dự đoán từng ca đăng ký bằng setDurationPredictor (giữ cho tương thích/test)
 *   3. Trung bình thực tế của chính bác sĩ (các ca DONE gần nhất)
 *   4. Mặc định (CONFIG.DEFAULT_DURATION_MIN)
 *
 * `basis` trả về: "ml" | "history" | "default" để frontend biết độ tin cậy của con số.
 * Kèm các số baseline (cùng một hàng đợi nhưng ước tính theo trung bình lịch sử / cố định 15 phút) phục vụ đối sánh AI vs không-AI.
 */
const { CONFIG, compareTickets, STATUS } = require("./queueRules");

const MIN = 60 * 1000;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

let durationPredictor = null; // async (ticket) => phút | null
/** Đăng ký bộ dự đoán thời lượng từng ca (tuỳ chọn). Trả null/undefined để quay về trung bình lịch sử. */
const setDurationPredictor = (fn) => {
  durationPredictor = fn;
};

/**
 * @param {object[]} tickets  vé ĐANG HOẠT ĐỘNG của một bác sĩ trong ngày (WAITING/CALLED/IN_PROGRESS), plain object
 * @param {number|null} avgMinutes  trung bình lịch sử của bác sĩ (null nếu chưa có)
 * @param {Date} now
 * @param {{durations?: Map<number,{minutes:number,p10?:number,p90?:number,version?:string}>}} opts
 * @returns Map<ticketId, {aheadCount, waitMinutes, estimatedStartAt, basis, durationMin, p10, p90, modelVersion, inServiceCount, baselineWaitMin, const15WaitMin, avgMinutes}>
 */
const estimateForDoctor = async (tickets, avgMinutes, now = new Date(), opts = {}) => {
  const ai = opts.durations instanceof Map ? opts.durations : new Map();
  const avg = avgMinutes || CONFIG.DEFAULT_DURATION_MIN;
  const active = tickets.filter((t) => [STATUS.IN_PROGRESS, STATUS.CALLED, STATUS.WAITING].includes(t.status));
  const allFromAi = active.length > 0 && active.every((t) => ai.has(Number(t.id)));
  const basis = allFromAi ? "ml" : avgMinutes ? "history" : "default";

  const durationOf = async (t) => {
    const fromAi = ai.get(Number(t.id));
    if (fromAi && Number.isFinite(fromAi.minutes)) return { minutes: clamp(fromAi.minutes, 3, 90), p10: fromAi.p10, p90: fromAi.p90, version: fromAi.version };
    if (durationPredictor) {
      try {
        const m = await durationPredictor(t);
        if (Number.isFinite(m) && m > 0) return { minutes: clamp(m, 3, 90) };
      } catch (e) {
        /* dự đoán lỗi -> dùng trung bình */
      }
    }
    return { minutes: avg };
  };

  const inService = active.filter((t) => t.status === STATUS.IN_PROGRESS || t.status === STATUS.CALLED);
  const waiting = active.filter((t) => t.status === STATUS.WAITING).sort(compareTickets);
  const inServiceCount = inService.length;

  // Phần còn lại của ca đang xử lý
  let busyUntil = now.getTime();
  const result = new Map();
  for (const t of inService) {
    const d = await durationOf(t);
    const startedAt = t.status === STATUS.IN_PROGRESS && t.startedAt ? new Date(t.startedAt).getTime() : now.getTime();
    // CALLED: coi như vừa bắt đầu (bệnh nhân đang đi vào); IN_PROGRESS: trừ thời gian đã khám, tối thiểu còn 1 phút
    const remaining = Math.max(d.minutes * MIN - (now.getTime() - startedAt), MIN);
    busyUntil = Math.max(busyUntil, now.getTime() + remaining);
    result.set(Number(t.id), {
      aheadCount: 0, waitMinutes: 0, estimatedStartAt: new Date(now), basis, durationMin: d.minutes, p10: d.p10, p90: d.p90,
      modelVersion: d.version || null, inServiceCount, baselineWaitMin: 0, const15WaitMin: 0, avgMinutes: avg,
    });
  }

  let cursor = busyUntil;
  let ahead = 0;
  for (const t of waiting) {
    const d = await durationOf(t);
    const waitMs = Math.max(cursor - now.getTime(), 0);
    result.set(Number(t.id), {
      aheadCount: ahead, waitMinutes: Math.round(waitMs / MIN), estimatedStartAt: new Date(cursor), basis,
      durationMin: d.minutes, p10: d.p10, p90: d.p90, modelVersion: d.version || null, inServiceCount,
      // Baseline cùng hàng đợi: mọi ca trước (kể cả ca đang khám) coi như đúng bằng trung bình lịch sử / đúng 15 phút
      baselineWaitMin: Math.round((ahead + inServiceCount) * avg), const15WaitMin: (ahead + inServiceCount) * CONFIG.DEFAULT_DURATION_MIN,
      avgMinutes: avg,
    });
    cursor += d.minutes * MIN;
    ahead += 1;
  }
  return result;
};

module.exports = { estimateForDoctor, setDurationPredictor };
