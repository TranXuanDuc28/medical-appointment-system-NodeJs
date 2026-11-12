/**
 * QUY TẮC HÀNG ĐỢI – hàm thuần (không đụng DB) để test độc lập.
 *
 * Máy trạng thái của vé:
 *
 *   (check-in / walk-in) ──► WAITING ──call──► CALLED ──start──► IN_PROGRESS ──finish──► DONE
 *                             │  ▲  │            │ ▲
 *                 postpone ◄──┘  │  └─cancel─►CANCELLED   call (gọi lại, tối đa 3 lần)
 *                 emergency (ưu tiên) ┘            │
 *                                                  └─no-show (đã gọi đủ 3 lần)─► lần 1: xếp lại cuối hàng (WAITING)
 *                                                                                lần 2: NO_SHOW (kết thúc, huỷ lịch hẹn)
 *
 * Ghi chú: trạng thái BOOKED/CHECKED_IN có trong ENUM của DB nhưng vé chỉ được tạo khi bệnh nhân đến
 * (check-in) nên bắt đầu từ WAITING; hai giá trị đó dành cho mở rộng (ví dụ tạo vé trước khi đến).
 */

const STATUS = Object.freeze({
  WAITING: "WAITING",
  CALLED: "CALLED",
  IN_PROGRESS: "IN_PROGRESS",
  DONE: "DONE",
  NO_SHOW: "NO_SHOW",
  CANCELLED: "CANCELLED",
});

const EVENT = Object.freeze({
  CHECK_IN: "CHECK_IN",
  WALK_IN: "WALK_IN",
  CALL: "CALL",
  START: "START",
  FINISH: "FINISH",
  NO_SHOW: "NO_SHOW",
  NO_SHOW_REQUEUE: "NO_SHOW_REQUEUE",
  POSTPONE: "POSTPONE",
  EMERGENCY: "EMERGENCY",
  CANCEL: "CANCEL",
  REVIVE: "REVIVE",
});

/** Sự kiện -> các trạng thái nguồn hợp lệ. */
const FROM = Object.freeze({
  [EVENT.CALL]: [STATUS.WAITING, STATUS.CALLED], // CALLED -> CALLED là "gọi lại"
  [EVENT.START]: [STATUS.CALLED],
  [EVENT.FINISH]: [STATUS.IN_PROGRESS],
  [EVENT.NO_SHOW]: [STATUS.CALLED],
  [EVENT.POSTPONE]: [STATUS.WAITING],
  [EVENT.EMERGENCY]: [STATUS.WAITING],
  [EVENT.CANCEL]: [STATUS.WAITING],
  [EVENT.REVIVE]: [STATUS.CANCELLED],
});

const ACTIVE_STATUSES = [STATUS.WAITING, STATUS.CALLED, STATUS.IN_PROGRESS];

const CONFIG = Object.freeze({
  MAX_CALLS: 3, // phải gọi đủ số lần này mới được đánh vắng mặt
  MAX_POSTPONE: 2, // số lần bệnh nhân được xin dời lượt
  POSTPONE_AHEAD: 2, // mỗi lần dời: nhường cho 2 người đứng sau
  POSTPONE_FALLBACK_MIN: 10, // nếu không có ai phía sau: dời thêm 10 phút
  GRACE_MIN: 15, // đến trễ quá 15 phút sau giờ hẹn => mất ưu tiên giờ hẹn, tính như người vãng lai
  ELDERLY_BONUS_MIN: 30, // người cao tuổi/trẻ nhỏ được xếp sớm hơn 30 phút (ưu tiên có giới hạn, không chặn người đã hẹn)
  DEFAULT_DURATION_MIN: 15, // thời lượng khám mặc định khi chưa có dữ liệu
});

const canTransition = (event, status) => (FROM[event] || []).includes(status);

class QueueError extends Error {
  constructor(code, message, status = 409) {
    super(message);
    this.name = "QueueError";
    this.code = code;
    this.status = status;
  }
}

const MIN = 60 * 1000;

/**
 * Khoá sắp xếp của một vé mới vào hàng.
 *  - Lịch hẹn: giờ bắt đầu khung hẹn, nhưng đến trễ quá GRACE_MIN thì tính theo giờ đến (như vãng lai).
 *  - Vãng lai: giờ đến.
 *  - Người cao tuổi/trẻ nhỏ: trừ ELDERLY_BONUS_MIN phút.
 * Vé khẩn cấp không dùng khoá này (luôn đứng đầu, xem compareTickets).
 */
const computeSortAt = ({ source, slotStart, checkInAt, priority }) => {
  const arrived = new Date(checkInAt).getTime();
  let base = arrived;
  if (source === "BOOKED" && slotStart) {
    const slot = new Date(slotStart).getTime();
    base = arrived > slot + CONFIG.GRACE_MIN * MIN ? arrived : slot;
  }
  if (priority === "ELDERLY") base -= CONFIG.ELDERLY_BONUS_MIN * MIN;
  return new Date(base);
};

/** Thứ tự gọi: khẩn cấp trước, rồi theo sortAt, hoà thì theo id (đến trước). */
const compareTickets = (a, b) => {
  const ea = a.priority === "EMERGENCY" ? 0 : 1;
  const eb = b.priority === "EMERGENCY" ? 0 : 1;
  if (ea !== eb) return ea - eb;
  const ta = new Date(a.sortAt).getTime();
  const tb = new Date(b.sortAt).getTime();
  if (ta !== tb) return ta - tb;
  return Number(a.id) - Number(b.id);
};

/**
 * Khoá sắp xếp mới khi dời lượt: xếp ngay sau người thứ POSTPONE_AHEAD đứng sau mình.
 * `waitingAfter` = các vé WAITING cùng bác sĩ đứng SAU vé này (đã sắp theo compareTickets).
 */
const postponeSortAt = (waitingAfter, now = new Date()) => {
  if (waitingAfter.length === 0) return new Date(now.getTime() + CONFIG.POSTPONE_FALLBACK_MIN * MIN);
  const idx = Math.min(CONFIG.POSTPONE_AHEAD, waitingAfter.length) - 1;
  return new Date(new Date(waitingAfter[idx].sortAt).getTime() + 1);
};

/** "A-003" từ mã phòng + số thứ tự (tối đa 16 ký tự theo cột display_no). */
const formatDisplayNo = (roomCode, seq) => `${String(roomCode).replace(/\s+/g, "").slice(0, 10)}-${String(seq).padStart(3, "0")}`;

module.exports = {
  STATUS, EVENT, FROM, ACTIVE_STATUSES, CONFIG,
  canTransition, QueueError, computeSortAt, compareTickets, postponeSortAt, formatDisplayNo,
};
