const socket = require("socket.io");
const { saveMsg } = require("../services/chatServices");

const onlineUsers = [];

const addUser = (user, socketId) => {
  const isExist = onlineUsers.findIndex((item) => item.id === user.id);
  if (isExist !== -1) {
    onlineUsers.splice(isExist, 1);
  }
  user.socketId = socketId;
  onlineUsers.push(user);
};

const removeUser = (socketId) => {
  const isExist = onlineUsers.findIndex((item) => item.socketId === socketId);
  if (isExist !== -1) {
    onlineUsers.splice(isExist, 1);
  }
};
const socketInit = (server) => {
  const io = socket(server, {
    cors: {
      origin: "http://localhost:3000",
    },
  });

  io.on("connection", (socket) => {
    // console.log(socket.id);
    socket.on("ADD_USER", (user) => {
      addUser(user, socket.id);
      io.emit("USER_ADDED", onlineUsers);
    });
    socket.on("SEND_MSG", async (msg) => {
      console.log( msg,"Server nhận SEND_MSG:");
      const isSaved = await saveMsg(msg);
      io.to(msg.receiver.socketId)
        .to(msg.sender.socketId)
        .emit("RECEIVED_MSG", isSaved);
        //console.log("Server emit RECEIVED_MSG tới receiverSocketId:", msg.receiver.socketId, "senderSocketId:", msg.sender.socketId, "msg:", msg);
    });

    socket.on("DELETE_MSG", (msg) => {
      socket.to(msg.receiver.socketId).emit("DELETED_MSG", msg);
    });
    socket.on("START_CHAT", ({ patientId, doctorId }) => {
      // Tìm patient trong onlineUsers và cập nhật lại socketId nếu cần
      const patient = onlineUsers.find(u => u.id === patientId);
      if (patient) {
        patient.socketId = socket.id;
        // Emit lại USER_ADDED để doctor cập nhật
        io.emit("USER_ADDED", onlineUsers);
      }
    });
    socket.on("disconnect", () => {
      removeUser(socket.id);
      io.emit("USER_ADDED", onlineUsers);
    });
  });
};

module.exports = socketInit;
