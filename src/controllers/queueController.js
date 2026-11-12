const queue = require("../services/queue/queueService");
const audit = require("../services/auditService");
const { QueueError } = require("../services/queue/queueRules");

/** Bọc handler: QueueError -> HTTP status + errCode; lỗi lạ -> 500 (không lộ chi tiết). */
const handle = (fn) => async (req, res) => {
  try {
    const data = await fn(req);
    return res.status(200).json({ errCode: 0, errMessage: "OK", data });
  } catch (e) {
    if (e instanceof QueueError) {
      return res.status(e.status).json({ errCode: e.status === 404 ? 2 : e.status === 403 ? 403 : 1, errMessage: e.message, reason: e.code });
    }
    console.error("[Queue]", e);
    return res.status(500).json({ errCode: -1, errMessage: "Lỗi từ server!" });
  }
};

const idOf = (req) => Number(req.params.id);
const actorOf = (req) => req.user;

const checkIn = handle(async (req) => queue.checkIn({ bookingId: Number((req.body || {}).bookingId), actor: actorOf(req) }));
const walkIn = handle(async (req) => {
  const b = req.body || {};
  const ticket = await queue.createWalkIn({ doctorId: Number(b.doctorId), name: b.fullName || b.name, phone: b.phone, priority: b.priority, actor: actorOf(req) });
  audit.log({ req, action: "QUEUE_WALK_IN", resource: "queue-ticket", resourceId: ticket.id });
  return ticket;
});
const callNext = handle(async (req) => queue.callNext({ doctorId: (req.body || {}).doctorId, actor: actorOf(req) }));
const call = handle(async (req) => queue.callTicket({ ticketId: idOf(req), actor: actorOf(req) }));
const start = handle(async (req) => queue.startTicket({ ticketId: idOf(req), actor: actorOf(req) }));
const finish = handle(async (req) => queue.finishTicket({ ticketId: idOf(req), actor: actorOf(req) }));
const noShow = handle(async (req) => queue.markNoShow({ ticketId: idOf(req), actor: actorOf(req) }));
const postpone = handle(async (req) => queue.postpone({ ticketId: idOf(req), actor: actorOf(req) }));
const cancel = handle(async (req) => queue.cancel({ ticketId: idOf(req), actor: actorOf(req) }));
const emergency = handle(async (req) => {
  const ticket = await queue.emergency({ ticketId: idOf(req), reason: (req.body || {}).reason, actor: actorOf(req) });
  audit.log({ req, action: "QUEUE_EMERGENCY", resource: "queue-ticket", resourceId: ticket.id, meta: { reason: req.body.reason } });
  return ticket;
});

const doctorBoard = handle(async (req) =>
  queue.getDoctorBoard({ doctorId: req.query.doctorId ? Number(req.query.doctorId) : req.user.id, date: req.query.date, actor: actorOf(req) }));
const myTickets = handle(async (req) => queue.getMyTickets({ userId: req.user.id }));
const roomDisplay = handle(async (req) => queue.getRoomDisplay({ roomId: Number(req.params.roomId), date: req.query.date }));

const listRooms = handle(async (req) => queue.listRooms({ clinicId: req.query.clinicId }));
const createRoom = handle(async (req) => queue.createRoom(req.body || {}, actorOf(req)));
const updateRoom = handle(async (req) => queue.updateRoom(idOf(req), req.body || {}, actorOf(req)));
const assignRoom = handle(async (req) => queue.assignRoom(req.body || {}, actorOf(req)));

module.exports = {
  checkIn, walkIn, callNext, call, start, finish, noShow, postpone, cancel, emergency,
  doctorBoard, myTickets, roomDisplay, listRooms, createRoom, updateRoom, assignRoom,
};
