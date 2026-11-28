/**
 * Realtime hàng đợi.
 *
 *  Room socket:
 *   - queue:room:<roomId>      TV sảnh + bảng phòng (cần quyền queue:display:read / call / checkin / rebalance)
 *   - queue:doctor:<doctorId>  bảng điều khiển của bác sĩ (chính bác sĩ đó hoặc doctor-data:manage:any)
 *   - user:<userId>            bệnh nhân (tự vào khi đăng nhập, xem socket/index.js)
 *
 *  Sự kiện server -> client:
 *   - QUEUE_UPDATED        {room, serving[], next[]}   mọi thay đổi trong phòng (không có tên bệnh nhân)
 *   - TICKET_CALLED        {displayNo, roomName, doctorName, callCount, announce}  khi bác sĩ gọi số (TV đọc loa)
 *   - DOCTOR_QUEUE_UPDATED {doctorId}                  nhắc bảng bác sĩ tải lại
 *   - QUEUE_TICKET_UPDATED {ticket}                    vé của bệnh nhân (vị trí + ETA) – tới user:<id>
 */
const { bus, CHANGED } = require("../utils/queueBus");
const queue = require("../services/queue/queueService");

const roomChannel = (roomId) => `queue:room:${roomId}`;
const doctorChannel = (doctorId) => `queue:doctor:${doctorId}`;

/** Câu thông báo tiếng Việt cho TV đọc loa (chỉ số thứ tự, không lộ tên bệnh nhân). */
const announceText = (displayNo, roomName, doctorName) =>
  `Xin mời bệnh nhân có số thứ tự ${displayNo} vào ${roomName}${doctorName ? ` gặp bác sĩ ${doctorName}` : ""}.`;

/** Gom các thay đổi dồn dập của cùng một bác sĩ/ngày (bão check-in) thành một lần phát. 0 = tắt gom. */
const BATCH_MS = process.env.QUEUE_BROADCAST_BATCH_MS === undefined ? 80 : Math.max(0, Number(process.env.QUEUE_BROADCAST_BATCH_MS) || 0);

/** Đẩy ETA mới nhất cho mọi bệnh nhân còn đang chờ cùng bác sĩ; trả về tập người đã được báo. */
const pushDoctorTickets = async (io, { doctorId, ticketDate }) => {
  const pushes = await queue.getActiveTicketsForPush({ doctorId, ticketDate });
  const sent = new Set();
  for (const x of pushes) {
    io.to(`user:${x.patientUserId}`).emit("QUEUE_TICKET_UPDATED", { ticket: x.ticket });
    sent.add(x.patientUserId);
  }
  return sent;
};

const emitRoom = async (io, { roomId, doctorId, ticketDate }) => {
  const snapshot = await queue.getRoomSnapshot({ roomId, ticketDate });
  io.to(roomChannel(roomId)).emit("QUEUE_UPDATED", snapshot);
  io.to(doctorChannel(doctorId)).emit("DOCTOR_QUEUE_UPDATED", { doctorId });
  return snapshot;
};

/** Xử lý ngay một thay đổi (dùng cho gọi số, vì TV/điện thoại cần nhận tức thì). */
const broadcastNow = async (io, p) => {
  const snapshot = await emitRoom(io, p);
  if (p.called) {
    const current = snapshot.serving.find((s) => s.ticketId === p.ticketId);
    if (current) {
      const payload = {
        ticketId: p.ticketId, displayNo: current.displayNo, roomName: snapshot.room.name,
        doctorName: current.doctorName, callCount: current.callCount,
        announce: announceText(current.displayNo, snapshot.room.name, current.doctorName),
      };
      io.to(roomChannel(p.roomId)).emit("TICKET_CALLED", payload);
      if (p.patientUserId) io.to(`user:${p.patientUserId}`).emit("TICKET_CALLED", payload);
    }
  }
  // ETA của mọi bệnh nhân còn đang chờ cùng bác sĩ đều thay đổi -> đẩy vé mới nhất cho từng người
  const sent = await pushDoctorTickets(io, p);
  // Vé vừa kết thúc/huỷ không còn "hoạt động": vẫn báo cho chủ vé trạng thái cuối
  if (p.patientUserId && !sent.has(p.patientUserId)) {
    io.to(`user:${p.patientUserId}`).emit("QUEUE_TICKET_UPDATED", { ticket: await queue.getTicket(p.ticketId) });
  }
};

/** Lô thay đổi của cùng một bác sĩ/ngày: mỗi phòng chỉ phát snapshot 1 lần, mỗi bệnh nhân nhận vé mới nhất đúng 1 lần. */
const broadcastBatch = async (io, batch) => {
  for (const roomId of batch.rooms) await emitRoom(io, { roomId, doctorId: batch.doctorId, ticketDate: batch.ticketDate });
  const sent = await pushDoctorTickets(io, batch);
  for (const [ticketId, patientUserId] of batch.patients) {
    if (!sent.has(patientUserId)) io.to(`user:${patientUserId}`).emit("QUEUE_TICKET_UPDATED", { ticket: await queue.getTicket(ticketId) });
  }
};

/** Lắng nghe bus (gọi 1 lần khi khởi tạo socket server). */
const registerQueueBroadcast = (io) => {
  const pending = new Map(); // `${doctorId}:${ticketDate}` -> lô đang chờ phát
  const flush = (key) => {
    const batch = pending.get(key);
    pending.delete(key);
    if (!batch) return;
    broadcastBatch(io, batch).catch((e) => console.error("[QueueSocket] broadcast lỗi:", e.message));
  };

  bus.on(CHANGED, (p) => {
    if (p.called || BATCH_MS === 0) {
      broadcastNow(io, p).catch((e) => console.error("[QueueSocket] broadcast lỗi:", e.message));
      return;
    }
    const key = `${p.doctorId}:${p.ticketDate}`;
    let batch = pending.get(key);
    if (!batch) {
      batch = { doctorId: p.doctorId, ticketDate: p.ticketDate, rooms: new Set(), patients: new Map() };
      pending.set(key, batch);
      const timer = setTimeout(() => flush(key), BATCH_MS);
      if (timer.unref) timer.unref();
    }
    batch.rooms.add(p.roomId);
    if (p.patientUserId) batch.patients.set(p.ticketId, p.patientUserId);
  });
};

/** Đăng ký các sự kiện client -> server cho một socket đã kết nối. */
const bindQueueEvents = (socket, requireAuth) => {
  socket.on("QUEUE_JOIN_ROOM", async ({ roomId } = {}, ack) => {
    if (!requireAuth()) return;
    const ok = ["queue:display:read", "queue:call", "queue:checkin", "queue:rebalance"].some((p) => socket.user.permissions.has(p));
    if (!ok) return socket.emit("ERROR", { message: "Bạn không có quyền xem hàng đợi phòng này" });
    const id = Number(roomId);
    if (!Number.isInteger(id)) return;
    socket.join(roomChannel(id));
    try {
      const snapshot = await queue.getRoomSnapshot({ roomId: id });
      if (typeof ack === "function") ack({ errCode: 0, data: snapshot });
      else socket.emit("QUEUE_UPDATED", snapshot);
    } catch (e) {
      socket.emit("ERROR", { message: "Không tải được hàng đợi" });
    }
  });

  socket.on("QUEUE_JOIN_DOCTOR", ({ doctorId } = {}) => {
    if (!requireAuth()) return;
    const id = Number(doctorId || socket.user.id);
    if (String(id) !== String(socket.user.id) && !socket.user.permissions.has("doctor-data:manage:any")) {
      return socket.emit("ERROR", { message: "Bạn không có quyền theo dõi hàng đợi của bác sĩ này" });
    }
    socket.join(doctorChannel(id));
  });
};

module.exports = { registerQueueBroadcast, bindQueueEvents, announceText, roomChannel, doctorChannel };
