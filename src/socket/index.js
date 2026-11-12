const socket = require("socket.io");
const { addUser, removeUser, getOnlineUsers } = require("./onlineUsers");
const { saveMsg, delMsg } = require("../services/chatServices");
const { resolveToken } = require("../middleware/accessControl");
const { isOriginAllowed } = require("../config/cors");
require("dotenv").config();
const {
  getScheduleDoctorByDateServices,
  sendPayment,
} = require("../services/doctorServices");
const { postBookAppointmentServices } = require("../services/patientServices");

const AUTHED_ROOM = "authed";

/** Lấy JWT từ handshake: ưu tiên auth.token, sau đó cookie `jwt` (httpOnly). */
const readToken = (handshake) => {
  if (handshake.auth && typeof handshake.auth.token === "string") {
    return handshake.auth.token;
  }
  const cookie = handshake.headers && handshake.headers.cookie;
  if (!cookie) return null;
  const match = cookie.split(";").map((c) => c.trim()).find((c) => c.startsWith("jwt="));
  return match ? decodeURIComponent(match.slice(4)) : null;
};

/** Giới hạn tần suất sự kiện theo từng socket (chống spam BOOK_SLOT...). */
const makeLimiter = (max, windowMs) => {
  let hits = [];
  return () => {
    const now = Date.now();
    hits = hits.filter((t) => now - t < windowMs);
    if (hits.length >= max) return false;
    hits.push(now);
    return true;
  };
};

const isId = (v) => (typeof v === "number" && Number.isFinite(v)) || (typeof v === "string" && /^\d+$/.test(v));
const isStr = (v, max = 64) => typeof v === "string" && v.length > 0 && v.length <= max;

let socketInit = (app, server) => {
  const io = socket(server, {
    cors: {
      origin: (origin, callback) => callback(null, isOriginAllowed(origin)),
      methods: ["GET", "POST"],
      credentials: true,
    },
    maxHttpBufferSize: 1e6,
  });

  // Make io accessible in controllers
  app.set("socketio", io);

  // Xác thực JWT khi handshake. Khách (chưa đăng nhập) vẫn kết nối được để xem/đặt slot
  // nhưng không dùng được các sự kiện cần danh tính (chat, thanh toán...).
  io.use(async (sock, next) => {
    const token = readToken(sock.handshake);
    if (!token) return next();
    try {
      const user = await resolveToken(token); // kiểm tra cả khoá tài khoản / tokenVersion / quyền hiện tại
      if (user) {
        sock.user = user;
      } else if (sock.handshake.auth && sock.handshake.auth.token) {
        return next(new Error("UNAUTHORIZED"));
      }
    } catch (e) {
      console.error("[Socket] lỗi xác thực:", e.message);
      return next(new Error("AUTH_UNAVAILABLE"));
    }
    next();
  });

  io.on("connection", (socket) => {
    const requireAuth = (permission) => {
      if (!socket.user) {
        socket.emit("ERROR", { message: "Bạn cần đăng nhập" });
        return false;
      }
      if (permission && !socket.user.permissions.has(permission)) {
        socket.emit("ERROR", { message: "Bạn không có quyền thực hiện thao tác này" });
        return false;
      }
      return true;
    };
    const bookLimiter = makeLimiter(5, 60 * 1000);

    if (socket.user) {
      socket.join(`user:${socket.user.id}`);
      socket.join(AUTHED_ROOM);
    }

    // Handle user connection – id/roleId luôn lấy từ token, không tin dữ liệu client gửi lên
    socket.on("ADD_USER", (user) => {
      if (!requireAuth()) return;
      const safeUser = {
        ...(user && typeof user === "object" ? user : {}),
        id: socket.user.id,
        email: socket.user.email,
        roleId: socket.user.roleId,
      };
      const currentUsers = addUser(safeUser, socket.id);
      io.to(AUTHED_ROOM).emit("USER_ADDED", currentUsers);
    });

    // Chat: gửi tin tới room user:<id> (không dùng socketId do client cung cấp)
    socket.on("SEND_MSG", async (msg) => {
      if (!requireAuth()) return;
      try {
        if (!msg || !msg.receiver || !isId(msg.receiver._id || msg.receiver.id)) return;
        const payload = {
          ...msg,
          sender: { ...(msg.sender || {}), id: socket.user.id, email: socket.user.email },
        };
        const isSaved = await saveMsg(payload);
        const receiverId = msg.receiver._id || msg.receiver.id;
        io.to(`user:${receiverId}`)
          .to(`user:${socket.user.id}`)
          .emit("RECEIVED_MSG", isSaved);
      } catch (error) {
        console.error("SEND_MSG error:", error.message);
        socket.emit("ERROR", { message: "Không gửi được tin nhắn" });
      }
    });

    // Chat: Delete message (chỉ người gửi mới xoá được)
    socket.on("DELETE_MSG", async ({ msgId, receiverId } = {}) => {
      if (!requireAuth()) return;
      try {
        const result = await delMsg({ msgId, userId: socket.user.id });
        if (!result || result.errCode !== 0) {
          return socket.emit("ERROR", {
            message: (result && result.errMessage) || "Không xoá được tin nhắn",
          });
        }
        io.to(`user:${socket.user.id}`)
          .to(`user:${receiverId}`)
          .emit("DELETED_MSG", { msgId });
      } catch (error) {
        console.error("DELETE_MSG error:", error.message);
        socket.emit("ERROR", { message: "Failed to delete message" });
      }
    });

    socket.on("START_CHAT", () => {
      // Bệnh nhân bắt đầu chat: cập nhật socketId của chính mình rồi báo danh sách online
      if (!requireAuth()) return;
      const me = getOnlineUsers().find((u) => String(u.id) === String(socket.user.id));
      if (me) {
        me.socketId = socket.id;
        io.to(AUTHED_ROOM).emit("USER_ADDED", getOnlineUsers());
      }
    });

    // Appointment: Join schedule room for doctor and date (khách cũng được xem slot)
    socket.on("JOIN_ROOM", ({ doctorId, date } = {}) => {
      if (!isId(doctorId) || !isStr(String(date), 32)) return;
      Array.from(socket.rooms).forEach((room) => {
        if (room.startsWith("schedule:")) socket.leave(room);
      });
      socket.join(`schedule:${doctorId}:${date}`);
    });

    // Appointment: Request available slots
    socket.on("GET_SLOTS", async ({ doctorId, date } = {}) => {
      if (!isId(doctorId) || !isStr(String(date), 32)) return;
      try {
        const slots = await getScheduleDoctorByDateServices({ doctorId, date });
        if (slots.errCode === 0) {
          socket.emit("SLOTS_RECEIVED", slots);
        } else {
          socket.emit("ERROR", { message: slots.errMessage });
        }
      } catch (error) {
        console.error("GET_SLOTS error:", error.message);
      }
    });

    // Appointment: Book a slot.
    // Toàn bộ logic kiểm tra chỗ trống/khoá slot nằm trong bookingService (transaction).
    socket.on("BOOK_SLOT", async (data) => {
      if (!bookLimiter()) {
        return socket.emit("ERROR", { message: "Bạn thao tác quá nhanh, vui lòng thử lại sau" });
      }
      try {
        const result = await postBookAppointmentServices(data);
        if (result.errCode !== 0) {
          return socket.emit("ERROR", { message: result.errMessage });
        }
        const { slotKey } = result;

        // Slot đã được cập nhật trạng thái trong transaction -> chỉ cần phát lại cho phòng
        io.to(`schedule:${slotKey.doctorId}:${slotKey.date}`).emit("SLOT_UPDATED", {
          doctorId: slotKey.doctorId,
          date: slotKey.date,
          timeType: slotKey.timeType,
          status: result.slotStatus || "booked",
        });

        // Báo cho người đặt, bác sĩ và (nếu đang online) bệnh nhân. Không gửi token xác nhận.
        const confirmation = {
          doctorId: slotKey.doctorId,
          date: slotKey.date,
          timeType: slotKey.timeType,
          statusId: "S1",
          bookingId: result.bookingId,
          holdMinutes: result.holdMinutes,
        };
        socket.emit("BOOKING_CONFIRMED", confirmation);
        io.to(`user:${result.doctorId}`)
          .to(`user:${result.patientId}`)
          .emit("BOOKING_CONFIRMED", confirmation);
      } catch (error) {
        console.error("BOOK_SLOT error:", error.message);
        socket.emit("ERROR", { message: "Failed to book slot" });
      }
    });

    // Payment: chỉ thu ngân/admin
    socket.on("SEND_PAYMENT", async (data) => {
      if (!requireAuth("payment:confirm")) return;
      try {
        const results = await sendPayment(data, io);
        if (results.errCode === 0) {
          socket.emit("PAYMENT_SENT", {
            message: "Payment request sent successfully",
          });
        } else {
          socket.emit("ERROR", { message: results.errMessage });
        }
      } catch (error) {
        console.error("SEND_PAYMENT error:", error.message);
        socket.emit("ERROR", { message: "Failed to send payment" });
      }
    });

    socket.on("disconnect", () => {
      removeUser(socket.id);
      io.to(AUTHED_ROOM).emit("USER_ADDED", getOnlineUsers());
    });
  });
};

module.exports = {
  socketInit,
};
