"use strict";

var _nodemailer = _interopRequireDefault(require("nodemailer"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { "default": e }; }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
require("dotenv").config();
// Gửi email xác nhận đặt lịch khám (Gốc - Chạy trực tiếp)
var sendSimpleEmailDirect = /*#__PURE__*/function () {
  var _ref = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(dataSend) {
    var transporter, info, _t;
    return _regenerator().w(function (_context) {
      while (1) switch (_context.p = _context.n) {
        case 0:
          transporter = _nodemailer["default"].createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            // Use `true` for port 465, `false` for all other ports
            auth: {
              user: process.env.EMAIL_APP,
              pass: process.env.EMAIL_APP_PASSWORD
            },
            tls: {
              rejectUnauthorized: false // Allow self-signed certificates
            }
          });
          _context.p = 1;
          _context.n = 2;
          return transporter.sendMail({
            from: '"Trần Xuân Đức" <ductranxuan28@gmail.com>',
            // sender address
            to: dataSend.reciverEmail,
            // list of receivers
            subject: "Thông tin đặt lịch khám bệnh",
            // Subject line
            html: getBodyHTMLEmail(dataSend)
          });
        case 2:
          info = _context.v;
          console.log("✅ Gửi email xác nhận thành công:", info.messageId);
          _context.n = 4;
          break;
        case 3:
          _context.p = 3;
          _t = _context.v;
          console.error("❌ Gửi email xác nhận thất bại:", _t);
          throw _t;
        case 4:
          return _context.a(2);
      }
    }, _callee, null, [[1, 3]]);
  }));
  return function sendSimpleEmailDirect(_x) {
    return _ref.apply(this, arguments);
  };
}();
var getBodyHTMLEmail = function getBodyHTMLEmail(dataSend) {
  var result = "";
  if (dataSend.language === "vi") {
    result = "\n    <h3>Xin ch\xE0o ".concat(dataSend.patientName, "!</h3>\n    <p>B\u1EA1n nh\u1EADn \u0111\u01B0\u1EE3c email n\xE0y v\xEC \u0111\xE3 \u0111\u1EB7t b\u1EC7nh online tr\xEAn Booking care</p>\n    <p>Th\xF4ng tin \u0111\u0103t l\u1ECBch kh\xE1m b\u1EC7nh</p>\n    <div><b>Th\u1EDDi gian: ").concat(dataSend.time, "</b>\n    </div>\n     <div><b>B\xE1c s\u0129: ").concat(dataSend.doctorName, "</b>\n    </div>\n    <p>N\u1EBFu c\xE1c th\xF4ng tin tr\xEAn l\xE0 \u0111\xFAng s\u1EF1 th\u1EADt vui l\xF2ng click v\xE0o \u0111\u01B0\u1EDDng link b\xEAn d\u01B0\u1EDBi \u0111\u1EC3 x\xE1c nh\u1EADn v\xE0 ho\xE0n t\u1EA5t th\u1EE7 t\u1EE5c \u0111\u1EB7t l\u1ECBch kh\xE1m b\u1EC7nh</p>\n    <div>\n    <a href=").concat(dataSend.redirectLink, " target=\"_blank\">Click here</a>\n    </div>\n    <div> Xin ch\xE2n th\xE0nh c\u1EA3m \u01A1n!</div>\n    ");
  }
  if (dataSend.language === "en") {
    result = "\n        <h3>Dear ".concat(dataSend.patientName, "!</h3>\n    <p>You received this email because you booked an appointment online on Booking care.</p>\n    <p>Information to schedule appointment</p>\n    <div><b>Time: ").concat(dataSend.time, "</b>\n    </div>\n     <div><b>Doctor: ").concat(dataSend.doctorName, "</b>\n    </div>\n    <p>If the above information is correct, please click on the link below to confirm and complete the appointment procedure.</p>\n    <div>\n    <a href=").concat(dataSend.redirectLink, " target=\"_blank\">Click here</a>\n    </div>\n    <div> Sincerely thank!</div>\n    ");
  }
  return result;
};
var getBodyHTMLEmailRemedy = function getBodyHTMLEmailRemedy(dataSend) {
  var result = "";
  var paymentSection = "";
  if (dataSend.payosUrl) {
    // Luồng PayOS: Hiển thị nút bấm thanh toán trực tuyến đẹp mắt
    paymentSection = "\n      <div style=\"margin: 20px 0;\">\n        <p><b>Vui l\xF2ng nh\u1EA5n v\xE0o n\xFAt b\xEAn d\u01B0\u1EDBi \u0111\u1EC3 ti\u1EBFn h\xE0nh thanh to\xE1n tr\u1EF1c tuy\u1EBFn (h\u1ED7 tr\u1EE3 chuy\u1EC3n kho\u1EA3n nhanh VietQR ho\u1EB7c th\u1EBB ng\xE2n h\xE0ng):</b></p>\n        <a href=\"".concat(dataSend.payosUrl, "\" target=\"_blank\" \n           style=\"background: linear-gradient(135deg, #0070f3 0%, #00a4ff 100%); color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); font-family: sans-serif;\">\n          Thanh To\xE1n H\xF3a \u0110\u01A1n (PayOS)\n        </a>\n      </div>\n    ");
  } else {
    // Luồng Casso cũ: Đã tạm dừng hoạt động
    paymentSection = "\n      <div style=\"margin-top: 20px; color: #721c24; background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 12px; border-radius: 6px; font-family: sans-serif;\">\n        <p><b>Th\xF4ng b\xE1o:</b> C\u1ED5ng thanh to\xE1n chuy\u1EC3n kho\u1EA3n th\u1EE7 c\xF4ng (Casso) \u0111ang \u0111\u01B0\u1EE3c b\u1EA3o tr\xEC. Vui l\xF2ng li\xEAn h\u1EC7 ph\xF2ng kh\xE1m \u0111\u1EC3 bi\u1EBFt th\xEAm chi ti\u1EBFt.</p>\n      </div>\n    ";
  }
  if (dataSend.language === "vi") {
    result = "\n      <h3>Xin ch\xE0o ".concat(dataSend.patientInfo.fullName, "!</h3>\n      <p>B\u1EA1n nh\u1EADn \u0111\u01B0\u1EE3c email n\xE0y v\xEC \u0111\xE3 \u0111\u1EB7t l\u1ECBch kh\xE1m b\u1EC7nh tr\xEAn Booking Care.</p>\n      <p><b>Th\xF4ng tin \u0111\u01A1n thu\u1ED1c: (Nh\u1EA5n v\xE0o file \u0111\xEDnh k\xE8m \u0111\u1EC3 xem)</b></p>\n      <div><b>Th\u1EDDi gian:</b> ").concat(dataSend.time, "</div>\n      <div><b>B\xE1c s\u0129:</b> ").concat(dataSend.doctorName, "</div>\n      ").concat(paymentSection, "\n      <div style=\"margin-top: 15px;\">Xin ch\xE2n th\xE0nh c\u1EA3m \u01A1n!</div>\n    ");
  } else {
    result = "\n      <h3>Dear ".concat(dataSend.patientInfo.fullName, "!</h3>\n      <p>You received this email because you booked a medical appointment on Booking Care.</p>\n      <p><b>Prescription Information: (Click attached file to view)</b></p>\n      <div><b>Time:</b> ").concat(dataSend.time, "</div>\n      <div><b>Doctor:</b> ").concat(dataSend.doctorName, "</div>\n      ").concat(dataSend.payosUrl ? "\n        <div style=\"margin: 20px 0;\">\n          <p><b>Please click the button below to pay online (supports fast VietQR transfer or local bank card):</b></p>\n          <a href=\"".concat(dataSend.payosUrl, "\" target=\"_blank\" \n             style=\"background: linear-gradient(135deg, #0070f3 0%, #00a4ff 100%); color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); font-family: sans-serif;\">\n            Pay Invoice (PayOS)\n          </a>\n        </div>\n      ") : "\n        <div style=\"margin-top: 20px; color: #721c24; background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 12px; border-radius: 6px; font-family: sans-serif;\">\n          <p><b>Notice:</b> The manual bank transfer (Casso) is currently undergoing maintenance. Please contact the clinic for more details.</p>\n        </div>\n      ", "\n      <div style=\"margin-top: 15px;\">Thank you very much!</div>\n    ");
  }
  return result;
};

// Gửi email kèm đơn thuốc (Gốc - Chạy trực tiếp)
var sendAttachmentDirect = /*#__PURE__*/function () {
  var _ref2 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2(dataSend) {
    var transporter, info, _t2;
    return _regenerator().w(function (_context2) {
      while (1) switch (_context2.p = _context2.n) {
        case 0:
          _context2.p = 0;
          transporter = _nodemailer["default"].createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            // Use `true` for port 465, `false` for all other ports
            auth: {
              user: process.env.EMAIL_APP,
              pass: process.env.EMAIL_APP_PASSWORD
            },
            tls: {
              rejectUnauthorized: false // Allow self-signed certificates
            }
          });
          _context2.n = 1;
          return transporter.sendMail({
            from: '"Trần Xuân Đức" <ductranxuan28@gmail.com>',
            // sender address
            to: dataSend.patientInfo.email,
            // list of receivers
            subject: "Kết quả đặt lịch khám bệnh và Hóa đơn",
            // Subject line
            html: getBodyHTMLEmailRemedy(dataSend),
            attachments: [{
              filename: dataSend.imgBase64 && dataSend.imgBase64.startsWith("data:application/pdf") ? "don-thuoc.pdf" : "don-thuoc.png",
              content: dataSend.imgBase64 ? dataSend.imgBase64.split("base64,")[1] : "",
              encoding: "base64"
            }]
          });
        case 1:
          info = _context2.v;
          console.log("✅ Gửi email đơn thuốc kèm hóa đơn thành công:", info.messageId);
          return _context2.a(2, {
            errCode: 0,
            errMessage: "Send remedy success!"
          });
        case 2:
          _context2.p = 2;
          _t2 = _context2.v;
          console.error("❌ Gửi email đơn thuốc thất bại:", _t2);
          throw _t2;
        case 3:
          return _context2.a(2);
      }
    }, _callee2, null, [[0, 2]]);
  }));
  return function sendAttachmentDirect(_x2) {
    return _ref2.apply(this, arguments);
  };
}();

// Gửi email thông báo thanh toán thành công (Gốc - Chạy trực tiếp)
var sendEmailPaymentSuccessDirect = /*#__PURE__*/function () {
  var _ref3 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3(dataSend) {
    var transporter, info, _t3;
    return _regenerator().w(function (_context3) {
      while (1) switch (_context3.p = _context3.n) {
        case 0:
          transporter = _nodemailer["default"].createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: {
              user: process.env.EMAIL_APP,
              pass: process.env.EMAIL_APP_PASSWORD
            },
            tls: {
              rejectUnauthorized: false
            }
          });
          _context3.p = 1;
          _context3.n = 2;
          return transporter.sendMail({
            from: '"Trần Xuân Đức" <ductranxuan28@gmail.com>',
            to: dataSend.reciverEmail,
            subject: "Thông báo: Giao dịch thanh toán thành công!",
            html: getBodyHTMLEmailPayment(dataSend)
          });
        case 2:
          info = _context3.v;
          console.log("✅ Gửi email thanh toán thành công:", info.messageId);
          _context3.n = 4;
          break;
        case 3:
          _context3.p = 3;
          _t3 = _context3.v;
          console.error("❌ Gửi email thanh toán thất bại:", _t3);
          throw _t3;
        case 4:
          return _context3.a(2);
      }
    }, _callee3, null, [[1, 3]]);
  }));
  return function sendEmailPaymentSuccessDirect(_x3) {
    return _ref3.apply(this, arguments);
  };
}();
var getBodyHTMLEmailPayment = function getBodyHTMLEmailPayment(dataSend) {
  var result = "";
  if (dataSend.language === "vi") {
    result = "\n    <h3>Xin ch\xE0o ".concat(dataSend.patientName, "!</h3>\n    <p>B\u1EA1n \u0111\xE3 thanh to\xE1n th\xE0nh c\xF4ng v\u1EC1 ch\xED ph\xED t\u1EA1i Booking care</p>\n    <p>Th\xF4ng tin thanh to\xE1n</p>\n    <div><b>Th\u1EDDi gian: ").concat(dataSend.time, "</b>\n    </div>\n     <div><b>T\u1ED5ng chi ph\xED \u0111\xE3 thanh to\xE1n: ").concat(dataSend.amount, " VND</b>\n    </div>\n    <div> Xin ch\xE2n th\xE0nh c\u1EA3m \u01A1n!</div>\n    ");
  }
  return result;
};

// ---------------- WRAPPERS GỬI QUA TASK QUEUE ----------------

var sendSimpleEmail = /*#__PURE__*/function () {
  var _ref4 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4(dataSend) {
    var _require, addEmailJob;
    return _regenerator().w(function (_context4) {
      while (1) switch (_context4.n) {
        case 0:
          _require = require("../utils/queue"), addEmailJob = _require.addEmailJob;
          _context4.n = 1;
          return addEmailJob("sendSimpleEmail", dataSend);
        case 1:
          return _context4.a(2);
      }
    }, _callee4);
  }));
  return function sendSimpleEmail(_x4) {
    return _ref4.apply(this, arguments);
  };
}();
var sendAttachment = /*#__PURE__*/function () {
  var _ref5 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5(dataSend) {
    var _require2, addEmailJob;
    return _regenerator().w(function (_context5) {
      while (1) switch (_context5.n) {
        case 0:
          _require2 = require("../utils/queue"), addEmailJob = _require2.addEmailJob;
          _context5.n = 1;
          return addEmailJob("sendAttachment", dataSend);
        case 1:
          return _context5.a(2, {
            errCode: 0,
            errMessage: "Remedy job has been added to queue!"
          });
      }
    }, _callee5);
  }));
  return function sendAttachment(_x5) {
    return _ref5.apply(this, arguments);
  };
}();
var sendEmailPaymentSuccess = /*#__PURE__*/function () {
  var _ref6 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee6(dataSend) {
    var _require3, addEmailJob;
    return _regenerator().w(function (_context6) {
      while (1) switch (_context6.n) {
        case 0:
          _require3 = require("../utils/queue"), addEmailJob = _require3.addEmailJob;
          _context6.n = 1;
          return addEmailJob("sendEmailPaymentSuccess", dataSend);
        case 1:
          return _context6.a(2);
      }
    }, _callee6);
  }));
  return function sendEmailPaymentSuccess(_x6) {
    return _ref6.apply(this, arguments);
  };
}();
module.exports = {
  sendSimpleEmail: sendSimpleEmail,
  sendAttachment: sendAttachment,
  sendEmailPaymentSuccess: sendEmailPaymentSuccess,
  // Export direct methods for BullMQ Worker
  sendSimpleEmailDirect: sendSimpleEmailDirect,
  sendAttachmentDirect: sendAttachmentDirect,
  sendEmailPaymentSuccessDirect: sendEmailPaymentSuccessDirect
};