/**
 * Gộp phát socket (không cần DB): nhiều thay đổi dồn dập của cùng một bác sĩ chỉ phát 1 lần; gọi số phát ngay.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

process.env.QUEUE_BROADCAST_BATCH_MS = "30";

const calls = { snapshot: 0, push: 0, getTicket: 0 };
const svcPath = require.resolve("../src/services/queue/queueService");
require.cache[svcPath] = {
  id: svcPath, filename: svcPath, loaded: true,
  exports: {
    getRoomSnapshot: async ({ roomId }) => { calls.snapshot++; return { room: { name: `P${roomId}` }, serving: [{ ticketId: 99, displayNo: "P-099", doctorName: "BS", callCount: 1 }], next: [] }; },
    getActiveTicketsForPush: async () => { calls.push++; return [{ patientUserId: 7, ticket: { id: 1 } }]; },
    getTicket: async (id) => { calls.getTicket++; return { id }; },
  },
};
const { bus, CHANGED } = require("../src/utils/queueBus");
const { registerQueueBroadcast } = require("../src/socket/queueSocket");

const makeIo = () => {
  const emitted = [];
  return { emitted, to: (room) => ({ emit: (ev, payload) => emitted.push({ room, ev, payload }) }) };
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test("10 thay đổi cùng bác sĩ trong lô: snapshot và đẩy ETA chỉ 1 lần; chủ vé đã huỷ vẫn nhận trạng thái cuối", async () => {
  const io = makeIo();
  registerQueueBroadcast(io);
  for (let i = 0; i < 10; i++) bus.emit(CHANGED, { ticketId: i + 1, roomId: 5, doctorId: 3, ticketDate: "2026-11-28", patientUserId: i === 9 ? 42 : null });
  await sleep(150);
  assert.equal(calls.snapshot, 1);
  assert.equal(calls.push, 1);
  assert.equal(io.emitted.filter((e) => e.ev === "QUEUE_UPDATED").length, 1);
  assert.equal(io.emitted.filter((e) => e.ev === "QUEUE_TICKET_UPDATED" && e.room === "user:7").length, 1);
  assert.equal(calls.getTicket, 1, "bệnh nhân 42 không có trong danh sách hoạt động => lấy vé cuối của họ");
  assert.ok(io.emitted.some((e) => e.room === "user:42" && e.ev === "QUEUE_TICKET_UPDATED"));
});

test("gọi số (called) được phát NGAY, không chờ gom", async () => {
  const io = makeIo();
  bus.removeAllListeners(CHANGED);
  registerQueueBroadcast(io);
  bus.emit(CHANGED, { ticketId: 99, roomId: 5, doctorId: 3, ticketDate: "2026-11-28", patientUserId: 7, called: true });
  await sleep(10); // nhỏ hơn cửa sổ gom 30ms
  const call = io.emitted.find((e) => e.ev === "TICKET_CALLED" && e.room === "queue:room:5");
  assert.ok(call, "TICKET_CALLED phải tới TV trước khi hết cửa sổ gom");
  assert.match(call.payload.announce, /P-099/);
});

test("khác bác sĩ thì không gộp chung", async () => {
  const io = makeIo();
  bus.removeAllListeners(CHANGED);
  const before = calls.snapshot;
  registerQueueBroadcast(io);
  bus.emit(CHANGED, { ticketId: 1, roomId: 5, doctorId: 3, ticketDate: "2026-11-28" });
  bus.emit(CHANGED, { ticketId: 2, roomId: 6, doctorId: 4, ticketDate: "2026-11-28" });
  await sleep(150);
  assert.equal(calls.snapshot - before, 2);
});
