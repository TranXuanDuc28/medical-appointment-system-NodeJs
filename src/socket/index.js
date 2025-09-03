const socket = require("socket.io");
const { addUser, removeUser, getOnlineUsers } = require("./onlineUsers");
const { saveMsg, delMsg } = require("../services/chatServices");
const db = require("../models/index");
require("dotenv").config();
const {
  getScheduleDoctorByDateServices,
} = require("../services/doctorServices");
const { postBookAppointmentServices } = require("../services/patientServices");

let socketInit = (app, server) => {
  const io = socket(server, {
    cors: {
      origin: process.env.URL_REACT || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Make io accessible in controllers
  app.set("socketio", io);

  io.on("connection", (socket) => {
    // Handle user connection
    socket.on("ADD_USER", (user) => {
      const currentUsers = addUser(user, socket.id);
      io.emit("USER_ADDED", currentUsers);
    });
    // Chat: Send and receive messages
    socket.on("SEND_MSG", async (msg) => {
      const isSaved = await saveMsg(msg);
      io.to(msg.receiver.socketId)
        .to(msg.sender.socketId)
        .emit("RECEIVED_MSG", isSaved);
    });
    // Chat: Delete message
    socket.on("DELETE_MSG", async ({ msgId, receiverId, userId }) => {
      console.log("data input", msgId, receiverId, userId);
      try {
        await delMsg({ msgId, userId });
        // Find receiver and sender sockets
        const onlineUsers = getOnlineUsers();
        const receiver = onlineUsers.find((u) => u.id === receiverId);
        const sender = onlineUsers.find((u) => u.id === userId);
        console.log("receiver", receiver);
        console.log("sender", sender);

        // Notify both sender and receiver
        if (receiver && sender) {
          console.log("Co roi");
          io.to(receiver.socketId)
            .to(sender.socketId)
            .emit("DELETED_MSG", { msgId });
        } else {
          socket.emit("DELETED_MSG", { msgId });
        }
      } catch (error) {
        socket.emit("ERROR", { message: "Failed to delete message", error });
      }
    });
    socket.on("START_CHAT", ({ patientId, doctorId }) => {
      // Tìm patient trong onlineUsers và cập nhật lại socketId nếu cần
      const onlineUsers = getOnlineUsers();
      const patient = onlineUsers.find((u) => u.id === patientId);
      if (patient) {
        patient.socketId = socket.id;
        // Emit lại USER_ADDED để doctor cập nhật
        io.emit("USER_ADDED", onlineUsers);
      }
    });
    // Appointment: Request available slots
    socket.on("GET_SLOTS", async ({ doctorId, date }) => {
      console.log(" start result", doctorId, date);
      try {
        const slots = await getScheduleDoctorByDateServices({ doctorId, date });
        console.log("slots", slots);
        if (slots.errCode === 0) {
          socket.emit("SLOTS_RECEIVED", slots);
        } else {
          socket.emit("ERROR", { message: slots.errMessage });
        }
      } catch (error) {
        console.log(error);
      }
    });

    // Appointment: Book a slot
    socket.on("BOOK_SLOT", async (data) => {
      try {
        const result = await postBookAppointmentServices(data);
        console.log("result", result);
        if (result.errCode === 0) {
          // Update slot status in Schedule table
          await db.Schedule.update(
            { status: "booked" },
            {
              where: {
                doctorId: data.doctorId,
                date: data.date,
                timeType: data.timeType,
              },
            }
          );

          // Find patient and doctor socket IDs
          const onlineUsers = getOnlineUsers();
          const patient = onlineUsers.find((u) => u.id === data.patientId);
          const doctor = onlineUsers.find((u) => u.id === data.doctorId);

          // Broadcast slot update to all clients
          io.emit("SLOT_UPDATED", {
            doctorId: data.doctorId,
            date: data.date,
            timeType: data.timeType,
            status: "booked",
          });

          // Emit booking confirmation to patient and doctor
          if (patient && doctor) {
            io.to(patient.socketId)
              .to(doctor.socketId)
              .emit("BOOKING_CONFIRMED", {
                ...data,
                statusId: "S1",
                token: result.token,
              });
          } else {
            socket.emit("BOOKING_CONFIRMED", {
              ...data,
              statusId: "S1",
              token: result.token,
            });
          }
        } else {
          socket.emit("ERROR", { message: result.errMessage });
        }
      } catch (error) {
        socket.emit("ERROR", { message: "Failed to book slot", error });
      }
    });

    // Payment: Confirm payment
    // socket.on("CONFIRM_PAYMENT", async ({ appointmentId, paymentDetails }) => {
    //   try {
    //     const payment = await confirmPayment(appointmentId, paymentDetails);
    //     io.to(payment.doctorSocketId)
    //       .to(payment.patientSocketId)
    //       .emit("PAYMENT_CONFIRMED", payment);
    //   } catch (error) {
    //     socket.emit("ERROR", { message: "Failed to confirm payment", error });
    //   }
    // });
    socket.on("SEND_PAYMENT", async (data) => {
      try {
        const results = await postSendPayment(data);
        if (results.errCode === 0) {
          socket.emit("PAYMENT_SENT", {
            message: "Payment request sent successfully",
          });
        } else {
          socket.emit("ERROR", { message: results.errMessage });
        }
      } catch (error) {
        socket.emit("ERROR", { message: "Failed to send payment", error });
      }
    });

    socket.on("disconnect", () => {
      const onlineUsers = getOnlineUsers();
      removeUser(socket.id);
      io.emit("USER_ADDED", onlineUsers);
    });
  });
};

module.exports = {
  socketInit,
};
