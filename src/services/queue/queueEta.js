/**
 * Ước lượng thời gian chờ:
 *   Wait(P_n) = còn lại của ca đang khám/đang gọi + Σ thời lượng dự kiến của những người đứng trước
 *
 * Thời lượng dự kiến của một ca lấy theo thứ tự ưu tiên:
 *   1. Bộ dự đoán ML (nếu đã đăng ký qua setDurationPredictor) – điểm cắm cho AI Service
 *   2. Trung bình thực tế của chính bác sĩ đó (các ca DONE gần nhất)
 *   3. Mặc định (CONFIG.DEFAULT_DURATION_MIN)
 */
const { CONFIG, compareTickets, STATUS } = require("./queueRules");

const MIN = 60 * 1000;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

let durationPredictor = null; // async (ticket) => phút | null
/** Đăng ký bộ dự đoán thời lượng (AI Service). Trả null/undefined để quay về trung bình lịch sử. */
const setDurationPredictor = (fn) => {
  durationPredictor = fn;
};

/**
 * @param {object[]} tickets  vé ĐANG HOẠT ĐỘNG của một bác sĩ trong ngày (WAITING/CALLED/IN_PROGRESS), plain object
 * @param {number|null} avgMinutes  trung bình lịch sử của bác sĩ (null nếu chưa có)
 * @returns Map<ticketId, {aheadCount, waitMinutes, estimatedStartAt, basis}>
 */
const estimateForDoctor = async (tickets, avgMinutes, now = new Date()) => {
  const basis = avgMinutes ? "history" : "default";
  const avg = avgMinutes || CONFIG.DEFAULT_DURATION_MIN;
  const durationOf = async (t) => {
    if (durationPredictor) {
      try {
        const m = await durationPredictor(t);
        if (Number.isFinite(m) && m > 0) return clamp(m, 3, 90);
      } catch (e) {
        /* dự đoán lỗi -> dùng trung bình */
      }
    }
    return avg;
  };

  const inProgress = tickets.filter((t) => t.status === STATUS.IN_PROGRESS || t.status === STATUS.CALLED);
  const waiting = tickets.filter((t) => t.status === STATUS.WAITING).sort(compareTickets);

  // Phần còn lại của ca đang xử lý
  let busyUntil = now.getTime();
  for (const t of inProgress) {
    const dur = await durationOf(t);
    const startedAt = t.status === STATUS.IN_PROGRESS && t.startedAt ? new Date(t.startedAt).getTime() : now.getTime();
    // CALLED: coi như vừa bắt đầu (bệnh nhân đang đi vào); IN_PROGRESS: trừ thời gian đã khám, tối thiểu còn 1 phút
    const remaining = Math.max(dur * MIN - (now.getTime() - startedAt), MIN);
    busyUntil = Math.max(busyUntil, now.getTime() + remaining);
  }

  const result = new Map();
  let cursor = busyUntil;
  for (const [i, t] of inProgress.entries()) {
    result.set(Number(t.id), { aheadCount: 0, waitMinutes: 0, estimatedStartAt: new Date(now), basis, aheadOf: i });
  }
  let ahead = inProgress.length > 0 ? 0 : 0;
  for (const t of waiting) {
    const waitMs = Math.max(cursor - now.getTime(), 0);
    result.set(Number(t.id), {
      aheadCount: ahead,
      waitMinutes: Math.round(waitMs / MIN),
      estimatedStartAt: new Date(cursor),
      basis,
    });
    cursor += (await durationOf(t)) * MIN;
    ahead += 1;
  }
  return result;
};

module.exports = { estimateForDoctor, setDurationPredictor };
