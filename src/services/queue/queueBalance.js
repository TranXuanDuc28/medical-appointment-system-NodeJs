/**
 * CÂN BẰNG TẢI PHÒNG cho bệnh nhân vãng lai – hàm thuần (không đụng DB).
 *
 * Bệnh nhân vãng lai chưa có bác sĩ: chọn chuyên khoa/phòng khám, hệ thống xếp vào bác sĩ đang trực
 * có thời gian chờ dự kiến NGẮN NHẤT. Thời gian chờ được tính bằng cách "thử xếp" một vé giả vào hàng đợi
 * của từng bác sĩ (dùng đúng luật sắp xếp + ETA thật), nên ưu tiên cao tuổi/khẩn cấp được tính đúng.
 *
 * Lịch hẹn đã xác nhận nhưng chưa đến (giờ hẹn đã tới, còn trong thời gian ân hạn) cũng được tính là
 * người sẽ đứng trước, để không dồn vãng lai vào bác sĩ sắp có nhiều người đã hẹn tới.
 */
const { estimateForDoctor } = require("./queueEta");
const { STATUS, CONFIG, computeSortAt } = require("./queueRules");

const MIN = 60 * 1000;
const PROBE_ID = -1;

/**
 * Vé hẹn chưa đến mà nhiều khả năng sẽ đứng trước vãng lai: giờ hẹn nằm trong [now - GRACE, now].
 * (Hẹn ở tương lai thì vé vãng lai đến bây giờ đứng trước; trễ quá GRACE thì đã mất ưu tiên giờ hẹn.)
 * @param {{id:number, slotStart:Date}[]} pending
 */
const expectedArrivals = (pending, now) =>
  pending
    .filter((b) => {
      const s = new Date(b.slotStart).getTime();
      return s <= now.getTime() && s >= now.getTime() - CONFIG.GRACE_MIN * MIN;
    })
    .map((b) => ({
      id: -1000 - Number(b.id), status: STATUS.WAITING, priority: "NORMAL", source: "BOOKED",
      sortAt: computeSortAt({ source: "BOOKED", slotStart: b.slotStart, checkInAt: b.slotStart, priority: "NORMAL" }),
    }));

/**
 * Thời gian chờ dự kiến của một vé vãng lai MỚI nếu xếp vào bác sĩ này ngay bây giờ.
 * @param {object[]} active   vé đang hoạt động của bác sĩ trong ngày (plain)
 * @param {number|null} avgMinutes  trung bình thực tế của bác sĩ
 * @param {{priority?:string, pending?:object[], now?:Date}} opts
 */
const projectWalkInWait = async (active, avgMinutes, { priority = "NORMAL", pending = [], now = new Date() } = {}) => {
  const probe = {
    id: PROBE_ID, status: STATUS.WAITING, priority, source: "WALK_IN",
    sortAt: computeSortAt({ source: "WALK_IN", checkInAt: now, priority }),
  };
  const all = [...active, ...expectedArrivals(pending, now), probe];
  const m = (await estimateForDoctor(all, avgMinutes, now)).get(PROBE_ID);
  return { waitMin: m.waitMinutes, aheadCount: m.aheadCount, estimatedStartAt: m.estimatedStartAt, basis: m.basis };
};

/**
 * Xếp hạng ứng viên: chờ ngắn nhất trước; hoà thì người ít vé đang chờ hơn, rồi theo id bác sĩ (ổn định, dễ giải thích).
 * @param {{doctorId:number, waitMin:number, waitingCount:number}[]} candidates
 */
const rankCandidates = (candidates) =>
  [...candidates].sort((a, b) => a.waitMin - b.waitMin || a.waitingCount - b.waitingCount || a.doctorId - b.doctorId);

module.exports = { projectWalkInWait, expectedArrivals, rankCandidates };
