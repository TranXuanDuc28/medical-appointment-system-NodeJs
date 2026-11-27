/**
 * Nhắc hẹn khám bệnh:
 *  - Nhắc trước 24h và 2h so với giờ bắt đầu khung khám (quét định kỳ bởi reminderScheduler).
 *  - Cảnh báo "sắp đến lượt" khi trước mình còn <= N người (kích hoạt từ sự kiện hàng đợi).
 * Mọi thông báo có dedupeKey nên quét lặp / retry không gửi trùng.
 */
const { Op } = require("sequelize");
const db = require("../models/index");
const { notify } = require("./notificationService");
const { todayDate } = require("../utils/dateKey");

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

/**
 * Cửa sổ gửi (còn bao lâu nữa đến giờ khám). Cửa sổ rộng hơn chu kỳ quét để không bỏ sót khi
 * scheduler tạm dừng; dedupeKey đảm bảo chỉ gửi 1 lần. Lịch đặt sát giờ (vd. 5h trước) không bị nhắc "24h".
 */
const REMINDERS = [
  { kind: "24h", fromMs: 22 * HOUR, toMs: 24 * HOUR, label: "ngày mai" },
  { kind: "2h", fromMs: 30 * MIN, toMs: 2 * HOUR, label: "trong khoảng 2 giờ nữa" },
];

/** Ngưỡng "còn N người phía trước" (giảm dần). Mặc định cảnh báo ở 3 người và 1 người. */
const parseThresholds = (s = process.env.REMINDER_AHEAD_THRESHOLDS) => {
  const arr = String(s || "3,1").split(",").map((x) => parseInt(x, 10)).filter((n) => Number.isInteger(n) && n >= 1);
  return [...new Set(arr)].sort((a, b) => b - a);
};

/** Các cửa sổ nhắc phù hợp với khoảng thời gian còn lại (rỗng nếu chưa tới / đã quá). */
const reminderFor = (msUntil) => REMINDERS.filter((r) => msUntil > r.fromMs && msUntil <= r.toMs);

/**
 * Ngưỡng nhỏ nhất đã chạm (thresholds [3,1]: ahead=3 -> 3, ahead=2 -> 3, ahead=1 -> 1, ahead=0 -> 1, ahead=5 -> null).
 * Chỉ trả 1 ngưỡng để bệnh nhân không nhận dồn nhiều tin khi hàng đợi nhảy nhiều bước.
 */
const reachedThreshold = (aheadCount, thresholds) => {
  const hit = thresholds.filter((t) => aheadCount <= t);
  return hit.length ? Math.min(...hit) : null;
};

const fmtVN = (d) =>
  new Date(d).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });

/** Giờ bắt đầu thật của từng mã khung giờ: Map<timeCode, "HH:MM"> */
const loadSlotStarts = async () => {
  const rows = await db.AllCode.findAll({ where: { type: "TIME" }, attributes: ["keyMap", "meta"], raw: true });
  const m = new Map();
  for (const r of rows) {
    let meta = r.meta;
    if (typeof meta === "string") {
      try { meta = JSON.parse(meta); } catch (_) { meta = null; }
    }
    if (meta && meta.start) m.set(r.keyMap, meta.start);
  }
  return m;
};

/**
 * Quét lịch hẹn đã xác nhận sắp tới và gửi nhắc 24h / 2h.
 * @returns {Promise<{scanned:number, sent:number, duplicates:number}>}
 */
const scanDueReminders = async (now = new Date()) => {
  const slotStarts = await loadSlotStarts();
  const from = new Date(now.getTime() - 3 * HOUR).toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }) || todayDate();
  const to = new Date(now.getTime() + 2 * 24 * HOUR).toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
  const bookings = await db.Booking.findAll({
    where: { statusId: "S2", workDate: { [Op.between]: [from, to] } },
    attributes: ["id", "code", "patientId", "doctorId", "workDate", "timeType"],
    raw: true,
  });
  if (!bookings.length) return { scanned: 0, sent: 0, duplicates: 0 };

  // Đã check-in vào hàng đợi rồi thì không nhắc nữa
  const ticketed = new Set(
    (
      await db.QueueTicket.findAll({
        where: { bookingId: { [Op.in]: bookings.map((b) => b.id) }, status: { [Op.ne]: "BOOKED" } },
        attributes: ["bookingId"],
        raw: true,
      })
    ).map((t) => Number(t.bookingId))
  );
  const doctors = await db.User.findAll({
    where: { id: { [Op.in]: [...new Set(bookings.map((b) => b.doctorId))] } },
    attributes: ["id", "firstName", "lastName"],
    raw: true,
  });
  const doctorName = new Map(doctors.map((d) => [Number(d.id), `${d.firstName || ""} ${d.lastName || ""}`.trim()]));

  let sent = 0, duplicates = 0, scanned = 0;
  for (const b of bookings) {
    const start = slotStarts.get(b.timeType);
    if (!start || ticketed.has(Number(b.id))) continue;
    const slotAt = new Date(`${String(b.workDate).slice(0, 10)}T${start}:00+07:00`);
    for (const r of reminderFor(slotAt.getTime() - now.getTime())) {
      scanned++;
      const dn = doctorName.get(Number(b.doctorId));
      try {
        const res = await notify({
          userId: b.patientId,
          type: `APPT_REMIND_${r.kind.toUpperCase()}`,
          title: "Nhắc lịch khám bệnh",
          body: `Bạn có lịch khám ${r.label} (${fmtVN(slotAt)})${dn ? ` với bác sĩ ${dn}` : ""}. Mã lịch: ${b.code}.`,
          payload: { bookingId: Number(b.id), code: b.code, slotAt: slotAt.toISOString() },
          dedupeKey: `remind:${r.kind}:${b.id}`,
        });
        if (res.sent) sent++;
        else duplicates++;
      } catch (e) {
        console.error(`[Reminder] gửi nhắc booking ${b.id} lỗi:`, e.message);
      }
    }
  }
  return { scanned, sent, duplicates };
};

/**
 * Sau mỗi thay đổi hàng đợi của một bác sĩ: báo cho các bệnh nhân WAITING vừa chạm ngưỡng "còn N người".
 * @param {{doctorId:number, ticketDate:string}} p  payload của queueBus
 * @param {Array<{patientUserId:number, ticket:object}>} [tickets] tuỳ chọn (test); mặc định lấy từ queueService
 */
const handleQueueChange = async (p, tickets) => {
  const thresholds = parseThresholds();
  if (!thresholds.length || !p || !p.doctorId) return { sent: 0 };
  const list =
    tickets || (await require("./queue/queueService").getActiveTicketsForPush({ doctorId: p.doctorId, ticketDate: p.ticketDate }));
  let sent = 0;
  for (const { patientUserId, ticket } of list) {
    if (ticket.status !== "WAITING" || typeof ticket.aheadCount !== "number") continue;
    const th = reachedThreshold(ticket.aheadCount, thresholds);
    if (th === null) continue;
    const next = ticket.aheadCount === 0;
    const wait = ticket.estimatedWaitMin;
    const roomName = ticket.room && ticket.room.name ? ticket.room.name : "phòng khám";
    try {
      const res = await notify({
        userId: patientUserId,
        type: "QUEUE_NEARING",
        title: next ? "Sắp đến lượt bạn" : `Còn ${ticket.aheadCount} người trước bạn`,
        body: next
          ? `Số ${ticket.displayNo} tại ${roomName}: bạn là người kế tiếp, vui lòng có mặt trước cửa phòng.`
          : `Số ${ticket.displayNo} tại ${roomName}: còn ${ticket.aheadCount} người phía trước${typeof wait === "number" ? `, dự kiến khoảng ${wait} phút` : ""}. Vui lòng chuẩn bị.`,
        payload: { ticketId: ticket.id, displayNo: ticket.displayNo, aheadCount: ticket.aheadCount, estimatedWaitMin: wait === undefined ? null : wait },
        dedupeKey: `proximity:${ticket.id}:${th}`,
      });
      if (res.sent) sent++;
    } catch (e) {
      console.error(`[Reminder] cảnh báo vé ${ticket.id} lỗi:`, e.message);
    }
  }
  return { sent };
};

module.exports = { REMINDERS, parseThresholds, reminderFor, reachedThreshold, scanDueReminders, handleQueueChange };
