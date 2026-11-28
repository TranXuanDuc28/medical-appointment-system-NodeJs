/**
 * Quét định kỳ để tự đánh vắng mặt các vé CALLED quá hạn (xem queueService.autoNoShow).
 * Chu kỳ NOSHOW_SCAN_SECONDS (mặc định 60s, tối thiểu 10s). Tắt bằng NOSHOW_AUTO_ENABLED=false.
 * Dùng setInterval: tác vụ idempotent (khoá dòng + kiểm tra lại), chạy chồng nhiều tiến trình không gây hại.
 */
const queue = require("./queueService");

const startAutoNoShow = () => {
  if (String(process.env.NOSHOW_AUTO_ENABLED).toLowerCase() === "false") {
    console.log("ℹ️ Tự đánh vắng mặt đã tắt (NOSHOW_AUTO_ENABLED=false)");
    return { stop: () => {} };
  }
  const everyMs = Math.max(10, Number(process.env.NOSHOW_SCAN_SECONDS) || 60) * 1000;
  let running = false;
  const scan = async () => {
    if (running) return null;
    running = true;
    try {
      const r = await queue.autoNoShow();
      if (r.requeued || r.noShow) console.log(`[Queue] tự đánh vắng mặt: xếp lại ${r.requeued}, kết thúc ${r.noShow}`);
      return r;
    } catch (e) {
      console.error("[Queue] quét vắng mặt lỗi:", e.message);
      return null;
    } finally {
      running = false;
    }
  };
  const h = setInterval(scan, everyMs);
  if (h.unref) h.unref();
  console.log(`✅ Tự đánh vắng mặt đã bật (chờ ${require("./queueRules").CONFIG.AUTO_NOSHOW_MIN} phút, quét mỗi ${everyMs / 1000}s)`);
  return { scan, stop: () => clearInterval(h) };
};

module.exports = { startAutoNoShow };
