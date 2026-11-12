/** Test thuần (không cần DB) cho quy tắc hàng đợi và ước lượng thời gian chờ. */
const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../src/services/queue/queueRules");
const { estimateForDoctor, setDurationPredictor } = require("../src/services/queue/queueEta");

const MIN = 60 * 1000;
const at = (hhmm) => new Date(`2026-11-12T${hhmm}:00+07:00`);

test("máy trạng thái: mỗi sự kiện chỉ hợp lệ từ đúng trạng thái nguồn", () => {
  const all = ["WAITING", "CALLED", "IN_PROGRESS", "DONE", "NO_SHOW", "CANCELLED"];
  const expect = {
    CALL: ["WAITING", "CALLED"],
    START: ["CALLED"],
    FINISH: ["IN_PROGRESS"],
    NO_SHOW: ["CALLED"],
    POSTPONE: ["WAITING"],
    EMERGENCY: ["WAITING"],
    CANCEL: ["WAITING"],
    REVIVE: ["CANCELLED"],
  };
  for (const [event, froms] of Object.entries(expect)) {
    for (const s of all) assert.equal(R.canTransition(event, s), froms.includes(s), `${event} từ ${s}`);
  }
  // Trạng thái kết thúc không còn chuyển đi đâu
  for (const s of ["DONE", "NO_SHOW"]) {
    for (const event of Object.keys(expect)) if (event !== "REVIVE") assert.equal(R.canTransition(event, s), false);
  }
});

test("computeSortAt: lịch hẹn đúng giờ giữ giờ hẹn; đến trễ quá 15' tính như vãng lai", () => {
  const slotStart = at("09:00");
  assert.equal(+R.computeSortAt({ source: "BOOKED", slotStart, checkInAt: at("08:20"), priority: "NORMAL" }), +slotStart, "đến sớm");
  assert.equal(+R.computeSortAt({ source: "BOOKED", slotStart, checkInAt: at("09:10"), priority: "NORMAL" }), +slotStart, "trễ 10' vẫn trong thời gian ân hạn");
  assert.equal(+R.computeSortAt({ source: "BOOKED", slotStart, checkInAt: at("09:40"), priority: "NORMAL" }), +at("09:40"), "trễ 40' mất ưu tiên giờ hẹn");
  assert.equal(+R.computeSortAt({ source: "WALK_IN", checkInAt: at("08:30"), priority: "NORMAL" }), +at("08:30"));
});

test("computeSortAt: người cao tuổi/trẻ nhỏ được xếp sớm hơn 30 phút (ưu tiên có giới hạn)", () => {
  const t = R.computeSortAt({ source: "WALK_IN", checkInAt: at("10:00"), priority: "ELDERLY" });
  assert.equal(+t, +at("09:30"));
});

test("compareTickets: khẩn cấp luôn đứng đầu; còn lại theo sortAt rồi id", () => {
  const mk = (id, priority, hhmm) => ({ id, priority, sortAt: at(hhmm) });
  const list = [mk(1, "NORMAL", "09:00"), mk(2, "NORMAL", "08:00"), mk(3, "EMERGENCY", "10:00"), mk(4, "NORMAL", "08:00"), mk(5, "EMERGENCY", "09:30")];
  assert.deepEqual(list.sort(R.compareTickets).map((t) => t.id), [5, 3, 2, 4, 1]);
});

test("postponeSortAt: nhường 2 người phía sau; không có ai thì dời 10 phút", () => {
  const now = at("09:00");
  const after = [{ sortAt: at("09:05") }, { sortAt: at("09:10") }, { sortAt: at("09:20") }];
  const t = R.postponeSortAt(after, now);
  assert.equal(+t, +at("09:10") + 1, "ngay sau người thứ 2 phía sau");
  assert.equal(+R.postponeSortAt([{ sortAt: at("09:05") }], now), +at("09:05") + 1, "chỉ có 1 người phía sau");
  assert.equal(+R.postponeSortAt([], now), +now + 10 * MIN);
});

test("formatDisplayNo: mã phòng + số thứ tự 3 chữ số, tối đa 16 ký tự", () => {
  assert.equal(R.formatDisplayNo("A", 8), "A-008");
  assert.equal(R.formatDisplayNo("P 101", 123), "P101-123");
  assert.ok(R.formatDisplayNo("VERYLONGROOMCODE", 1).length <= 16);
});

test("ETA: Σ thời lượng người đứng trước + phần còn lại của ca đang khám", async () => {
  setDurationPredictor(null);
  const now = at("09:00");
  const tickets = [
    { id: 1, status: "IN_PROGRESS", startedAt: new Date(now - 5 * MIN), priority: "NORMAL", sortAt: at("08:30") },
    { id: 2, status: "WAITING", priority: "NORMAL", sortAt: at("08:40") },
    { id: 3, status: "WAITING", priority: "NORMAL", sortAt: at("08:50") },
    { id: 4, status: "WAITING", priority: "NORMAL", sortAt: at("08:55") },
  ];
  const eta = await estimateForDoctor(tickets, 10, now); // trung bình 10 phút/ca
  assert.equal(eta.get(1).waitMinutes, 0);
  assert.equal(eta.get(2).aheadCount, 0);
  assert.equal(eta.get(2).waitMinutes, 5, "ca đang khám còn 10-5 = 5 phút");
  assert.equal(eta.get(3).aheadCount, 1);
  assert.equal(eta.get(3).waitMinutes, 15);
  assert.equal(eta.get(4).waitMinutes, 25);
  assert.equal(eta.get(4).basis, "history");
});

test("ETA: chưa có lịch sử thì dùng mặc định 15 phút; khẩn cấp chen lên đầu và đẩy người khác ra sau", async () => {
  setDurationPredictor(null);
  const now = at("09:00");
  const tickets = [
    { id: 1, status: "WAITING", priority: "NORMAL", sortAt: at("08:40") },
    { id: 2, status: "WAITING", priority: "EMERGENCY", sortAt: at("08:59") },
  ];
  const eta = await estimateForDoctor(tickets, null, now);
  assert.equal(eta.get(2).aheadCount, 0, "khẩn cấp đứng đầu");
  assert.equal(eta.get(2).waitMinutes, 0);
  assert.equal(eta.get(1).waitMinutes, 15, "bị đẩy ra sau 1 ca mặc định 15 phút");
  assert.equal(eta.get(1).basis, "default");
});

test("ETA: bộ dự đoán ML (nếu có) được ưu tiên, lỗi thì quay về trung bình", async () => {
  const now = at("09:00");
  const tickets = [
    { id: 1, status: "WAITING", priority: "NORMAL", sortAt: at("08:40"), tag: "slow" },
    { id: 2, status: "WAITING", priority: "NORMAL", sortAt: at("08:50") },
  ];
  setDurationPredictor(async (t) => (t.tag === "slow" ? 30 : 5));
  let eta = await estimateForDoctor(tickets, 10, now);
  assert.equal(eta.get(2).waitMinutes, 30, "ca đứng trước được dự đoán 30 phút");
  setDurationPredictor(async () => { throw new Error("AI service down"); });
  eta = await estimateForDoctor(tickets, 10, now);
  assert.equal(eta.get(2).waitMinutes, 10, "AI lỗi -> dùng trung bình lịch sử");
  setDurationPredictor(null);
});
