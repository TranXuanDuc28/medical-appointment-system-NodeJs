/**
 * Khởi chạy lịch nhắc hẹn.
 *  - Quét 24h/2h: BullMQ job scheduler (lặp mỗi REMINDER_SCAN_SECONDS, mặc định 300s) khi có Redis;
 *    không có Redis thì dùng setInterval trong tiến trình (dedupeKey nên chạy chồng không gây gửi trùng).
 *  - Cảnh báo sắp đến lượt: lắng nghe queueBus.
 * Tắt hẳn bằng REMINDERS_ENABLED=false.
 */
const { bus, CHANGED } = require("../utils/queueBus");
const reminders = require("./reminderService");

const QUEUE_NAME = "reminderQueue";
const SCHEDULER_ID = "scan-appointment-reminders";

/** Gom các thay đổi dồn dập của cùng một bác sĩ/ngày thành 1 lần xử lý (tránh tính ETA nhiều lần). */
const makeDebouncedHandler = (fn, waitMs = 1500) => {
  const timers = new Map();
  return (p) => {
    const key = `${p.doctorId}:${p.ticketDate}`;
    clearTimeout(timers.get(key));
    const t = setTimeout(() => {
      timers.delete(key);
      Promise.resolve(fn(p)).catch((e) => console.error("[Reminder] queue-change lỗi:", e.message));
    }, waitMs);
    if (t.unref) t.unref();
    timers.set(key, t);
  };
};

const startReminderScheduler = async () => {
  if (String(process.env.REMINDERS_ENABLED).toLowerCase() === "false") {
    console.log("ℹ️ Nhắc hẹn đã tắt (REMINDERS_ENABLED=false)");
    return { stop: async () => {} };
  }
  const everyMs = Math.max(30, Number(process.env.REMINDER_SCAN_SECONDS) || 300) * 1000;
  const stoppers = [];

  const onChange = makeDebouncedHandler((p) => reminders.handleQueueChange(p));
  bus.on(CHANGED, onChange);
  stoppers.push(async () => bus.off(CHANGED, onChange));

  const scan = async () => {
    try {
      const r = await reminders.scanDueReminders();
      if (r.sent) console.log(`[Reminder] đã gửi ${r.sent} nhắc hẹn (trùng bỏ qua: ${r.duplicates})`);
      return r;
    } catch (e) {
      console.error("[Reminder] quét lỗi:", e.message);
      return null;
    }
  };

  let mode = "setInterval";
  try {
    const { Queue, Worker } = require("bullmq");
    const base = { host: process.env.REDIS_HOST || "127.0.0.1", port: parseInt(process.env.REDIS_PORT || "6379", 10) };
    // Redis chết: không thử lại vô hạn, rơi về setInterval
    const queue = new Queue(QUEUE_NAME, { connection: { ...base, retryStrategy: () => null } });
    queue.on("error", () => {});
    try {
      await Promise.race([
        queue.waitUntilReady(),
        new Promise((_, rej) => setTimeout(() => rej(new Error("Redis không phản hồi")), 3000)),
      ]);
    } catch (e) {
      await queue.close().catch(() => {});
      throw e;
    }
    const worker = new Worker(QUEUE_NAME, scan, { connection: base, concurrency: 1 });
    worker.on("error", () => {});
    await queue.upsertJobScheduler(SCHEDULER_ID, { every: everyMs }, { name: "scan", opts: { removeOnComplete: 20, removeOnFail: 50 } });
    stoppers.push(async () => {
      await worker.close();
      await queue.close();
    });
    mode = "bullmq";
  } catch (e) {
    console.warn(`⚠️ Nhắc hẹn: không dùng được BullMQ (${e.message}); chạy bằng setInterval.`);
    const h = setInterval(scan, everyMs);
    if (h.unref) h.unref();
    stoppers.push(async () => clearInterval(h));
  }
  // Quét bù ngay sau khi khởi động (server có thể đã tắt một lúc); dedupeKey chặn gửi trùng
  const boot = setTimeout(scan, 5000);
  if (boot.unref) boot.unref();
  stoppers.push(async () => clearTimeout(boot));

  console.log(`✅ Nhắc hẹn đã bật (${mode}, chu kỳ ${everyMs / 1000}s)`);
  return { mode, scan, stop: async () => { for (const s of stoppers) await s().catch(() => {}); } };
};

module.exports = { startReminderScheduler, makeDebouncedHandler };
