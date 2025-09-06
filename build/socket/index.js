"use strict";

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
var socket = require("socket.io");
var _require = require("./onlineUsers"),
  addUser = _require.addUser,
  removeUser = _require.removeUser,
  getOnlineUsers = _require.getOnlineUsers;
var _require2 = require("../services/chatServices"),
  saveMsg = _require2.saveMsg,
  delMsg = _require2.delMsg;
var db = require("../models/index");
require("dotenv").config();
var _require3 = require("../services/doctorServices"),
  getScheduleDoctorByDateServices = _require3.getScheduleDoctorByDateServices;
var _require4 = require("../services/patientServices"),
  postBookAppointmentServices = _require4.postBookAppointmentServices;
var socketInit = function socketInit(app, server) {
  var io = socket(server, {
    cors: {
      origin: process.env.URL_REACT || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Make io accessible in controllers
  app.set("socketio", io);
  io.on("connection", function (socket) {
    // Handle user connection
    socket.on("ADD_USER", function (user) {
      var currentUsers = addUser(user, socket.id);
      io.emit("USER_ADDED", currentUsers);
    });
    // Chat: Send and receive messages
    socket.on("SEND_MSG", /*#__PURE__*/function () {
      var _ref = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(msg) {
        var isSaved;
        return _regenerator().w(function (_context) {
          while (1) switch (_context.n) {
            case 0:
              _context.n = 1;
              return saveMsg(msg);
            case 1:
              isSaved = _context.v;
              io.to(msg.receiver.socketId).to(msg.sender.socketId).emit("RECEIVED_MSG", isSaved);
            case 2:
              return _context.a(2);
          }
        }, _callee);
      }));
      return function (_x) {
        return _ref.apply(this, arguments);
      };
    }());
    // Chat: Delete message
    socket.on("DELETE_MSG", /*#__PURE__*/function () {
      var _ref3 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2(_ref2) {
        var msgId, receiverId, userId, onlineUsers, receiver, sender, _t;
        return _regenerator().w(function (_context2) {
          while (1) switch (_context2.p = _context2.n) {
            case 0:
              msgId = _ref2.msgId, receiverId = _ref2.receiverId, userId = _ref2.userId;
              console.log("data input", msgId, receiverId, userId);
              _context2.p = 1;
              _context2.n = 2;
              return delMsg({
                msgId: msgId,
                userId: userId
              });
            case 2:
              // Find receiver and sender sockets
              onlineUsers = getOnlineUsers();
              receiver = onlineUsers.find(function (u) {
                return u.id === receiverId;
              });
              sender = onlineUsers.find(function (u) {
                return u.id === userId;
              });
              console.log("receiver", receiver);
              console.log("sender", sender);

              // Notify both sender and receiver
              if (receiver && sender) {
                console.log("Co roi");
                io.to(receiver.socketId).to(sender.socketId).emit("DELETED_MSG", {
                  msgId: msgId
                });
              } else {
                socket.emit("DELETED_MSG", {
                  msgId: msgId
                });
              }
              _context2.n = 4;
              break;
            case 3:
              _context2.p = 3;
              _t = _context2.v;
              socket.emit("ERROR", {
                message: "Failed to delete message",
                error: _t
              });
            case 4:
              return _context2.a(2);
          }
        }, _callee2, null, [[1, 3]]);
      }));
      return function (_x2) {
        return _ref3.apply(this, arguments);
      };
    }());
    socket.on("START_CHAT", function (_ref4) {
      var patientId = _ref4.patientId,
        doctorId = _ref4.doctorId;
      // Tìm patient trong onlineUsers và cập nhật lại socketId nếu cần
      var onlineUsers = getOnlineUsers();
      var patient = onlineUsers.find(function (u) {
        return u.id === patientId;
      });
      if (patient) {
        patient.socketId = socket.id;
        // Emit lại USER_ADDED để doctor cập nhật
        io.emit("USER_ADDED", onlineUsers);
      }
    });
    // Appointment: Request available slots
    socket.on("GET_SLOTS", /*#__PURE__*/function () {
      var _ref6 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3(_ref5) {
        var doctorId, date, slots, _t2;
        return _regenerator().w(function (_context3) {
          while (1) switch (_context3.p = _context3.n) {
            case 0:
              doctorId = _ref5.doctorId, date = _ref5.date;
              console.log(" start result", doctorId, date);
              _context3.p = 1;
              _context3.n = 2;
              return getScheduleDoctorByDateServices({
                doctorId: doctorId,
                date: date
              });
            case 2:
              slots = _context3.v;
              console.log("slots", slots);
              if (slots.errCode === 0) {
                socket.emit("SLOTS_RECEIVED", slots);
              } else {
                socket.emit("ERROR", {
                  message: slots.errMessage
                });
              }
              _context3.n = 4;
              break;
            case 3:
              _context3.p = 3;
              _t2 = _context3.v;
              console.log(_t2);
            case 4:
              return _context3.a(2);
          }
        }, _callee3, null, [[1, 3]]);
      }));
      return function (_x3) {
        return _ref6.apply(this, arguments);
      };
    }());

    // Appointment: Book a slot
    socket.on("BOOK_SLOT", /*#__PURE__*/function () {
      var _ref7 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4(data) {
        var result, onlineUsers, patient, doctor, _t3;
        return _regenerator().w(function (_context4) {
          while (1) switch (_context4.p = _context4.n) {
            case 0:
              _context4.p = 0;
              _context4.n = 1;
              return postBookAppointmentServices(data);
            case 1:
              result = _context4.v;
              console.log("result", result);
              if (!(result.errCode === 0)) {
                _context4.n = 3;
                break;
              }
              _context4.n = 2;
              return db.Schedule.update({
                status: "booked"
              }, {
                where: {
                  doctorId: data.doctorId,
                  date: data.date,
                  timeType: data.timeType
                }
              });
            case 2:
              // Find patient and doctor socket IDs
              onlineUsers = getOnlineUsers();
              patient = onlineUsers.find(function (u) {
                return u.id === data.patientId;
              });
              doctor = onlineUsers.find(function (u) {
                return u.id === data.doctorId;
              }); // Broadcast slot update to all clients
              io.emit("SLOT_UPDATED", {
                doctorId: data.doctorId,
                date: data.date,
                timeType: data.timeType,
                status: "booked"
              });

              // Emit booking confirmation to patient and doctor
              if (patient && doctor) {
                io.to(patient.socketId).to(doctor.socketId).emit("BOOKING_CONFIRMED", _objectSpread(_objectSpread({}, data), {}, {
                  statusId: "S1",
                  token: result.token
                }));
              } else {
                socket.emit("BOOKING_CONFIRMED", _objectSpread(_objectSpread({}, data), {}, {
                  statusId: "S1",
                  token: result.token
                }));
              }
              _context4.n = 4;
              break;
            case 3:
              socket.emit("ERROR", {
                message: result.errMessage
              });
            case 4:
              _context4.n = 6;
              break;
            case 5:
              _context4.p = 5;
              _t3 = _context4.v;
              socket.emit("ERROR", {
                message: "Failed to book slot",
                error: _t3
              });
            case 6:
              return _context4.a(2);
          }
        }, _callee4, null, [[0, 5]]);
      }));
      return function (_x4) {
        return _ref7.apply(this, arguments);
      };
    }());

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
    socket.on("SEND_PAYMENT", /*#__PURE__*/function () {
      var _ref8 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5(data) {
        var results, _t4;
        return _regenerator().w(function (_context5) {
          while (1) switch (_context5.p = _context5.n) {
            case 0:
              _context5.p = 0;
              _context5.n = 1;
              return postSendPayment(data);
            case 1:
              results = _context5.v;
              if (results.errCode === 0) {
                socket.emit("PAYMENT_SENT", {
                  message: "Payment request sent successfully"
                });
              } else {
                socket.emit("ERROR", {
                  message: results.errMessage
                });
              }
              _context5.n = 3;
              break;
            case 2:
              _context5.p = 2;
              _t4 = _context5.v;
              socket.emit("ERROR", {
                message: "Failed to send payment",
                error: _t4
              });
            case 3:
              return _context5.a(2);
          }
        }, _callee5, null, [[0, 2]]);
      }));
      return function (_x5) {
        return _ref8.apply(this, arguments);
      };
    }());
    socket.on("disconnect", function () {
      var onlineUsers = getOnlineUsers();
      removeUser(socket.id);
      io.emit("USER_ADDED", onlineUsers);
    });
  });
};
module.exports = {
  socketInit: socketInit
};