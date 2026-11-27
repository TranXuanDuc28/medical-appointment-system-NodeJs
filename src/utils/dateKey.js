/**
 * Chuyển đổi giữa "ngày" kiểu cũ của API (chuỗi mili-giây của 00:00 giờ VN, vd "1756486800000")
 * và kiểu DATE chuẩn của DB (chuỗi "YYYY-MM-DD"). Frontend vẫn gửi/nhận dạng chuỗi ms.
 */
const TZ = "Asia/Ho_Chi_Minh";

/** "1756486800000" | 1756486800000 -> "2025-08-30"; giá trị không hợp lệ -> null */
const msToDate = (ms) => {
  if (ms === null || ms === undefined || ms === "") return null;
  if (typeof ms === "string" && /^\d{4}-\d{2}-\d{2}$/.test(ms)) return ms; // đã là DATE
  const n = Number(ms);
  if (!Number.isFinite(n)) return null;
  const d = new Date(n);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
};

/** "2025-08-30" | Date -> "1756486800000" (00:00 giờ VN); không hợp lệ -> null */
const dateToMs = (date) => {
  if (!date) return null;
  const s = date instanceof Date ? date.toLocaleDateString("en-CA", { timeZone: TZ }) : String(date).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return String(new Date(`${s}T00:00:00+07:00`).getTime());
};

/** Hôm nay (giờ VN) dạng "YYYY-MM-DD" */
const todayDate = () => new Date().toLocaleDateString("en-CA", { timeZone: TZ });

module.exports = { msToDate, dateToMs, todayDate, TZ };
