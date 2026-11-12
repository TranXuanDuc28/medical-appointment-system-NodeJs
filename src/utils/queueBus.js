/**
 * Bus sự kiện nội bộ của hàng đợi: queueService phát sau khi COMMIT, socket server lắng nghe và đẩy
 * tới các room (TV, bác sĩ, bệnh nhân). Tách riêng để service không phụ thuộc socket (dễ test).
 */
const { EventEmitter } = require("events");

const bus = new EventEmitter();
bus.setMaxListeners(50);

const CHANGED = "queue:changed";

/** payload: { event, ticketId, roomId, doctorId, ticketDate, shift, patientUserId?, status } */
const emitChanged = (payload) => {
  try {
    bus.emit(CHANGED, payload);
  } catch (e) {
    console.error("[QueueBus] listener lỗi:", e.message);
  }
};

module.exports = { bus, CHANGED, emitChanged };
