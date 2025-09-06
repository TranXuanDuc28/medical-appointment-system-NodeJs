"use strict";

var _nodemailer = _interopRequireDefault(require("nodemailer"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { "default": e }; }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
require("dotenv").config();
var sendSimpleEmail = /*#__PURE__*/function () {
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
          }); // console.log("transporter", transporter);
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
          _context.n = 4;
          break;
        case 3:
          _context.p = 3;
          _t = _context.v;
          console.error("❌ Gửi thất bại", _t);
        case 4:
          return _context.a(2);
      }
    }, _callee, null, [[1, 3]]);
  }));
  return function sendSimpleEmail(_x) {
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
  var BANK_ID = "mbbank";
  var ACCOUNT_NO = "0367462316";
  var TEMPLATE = "compact2";
  var AMOUNT = dataSend.amount ? dataSend.amount : "5000"; // Default amount if not provided
  var DESCRIPTION = dataSend.bookingId ? encodeURIComponent("BOOKING".concat(dataSend.bookingId)) : encodeURIComponent("BOOKING280403");
  var ACCOUNT_NAME = encodeURIComponent("Thanh toán dịch vụ");
  var qrImage = "\n    <div style=\"margin-top: 20px;\">\n      <img src=\"https://img.vietqr.io/image/".concat(BANK_ID, "-").concat(ACCOUNT_NO, "-").concat(TEMPLATE, ".jpg?amount=").concat(AMOUNT, "&addInfo=").concat(DESCRIPTION, "&accountName=").concat(ACCOUNT_NAME, "\" \n      alt=\"QR Code thanh to\xE1n\" style=\"width: 200px; height: auto;\" />\n    </div>\n  ");
  if (dataSend.language === "vi") {
    result = "\n      <h3>Xin ch\xE0o ".concat(dataSend.patientInfo.fullName, "!</h3>\n      <p>B\u1EA1n nh\u1EADn \u0111\u01B0\u1EE3c email n\xE0y v\xEC \u0111\xE3 \u0111\u1EB7t l\u1ECBch kh\xE1m b\u1EC7nh tr\xEAn Booking Care.</p>\n      <p><b>Th\xF4ng tin \u0111\u01A1n thu\u1ED1c: (Nh\u1EA5n v\xE0o file \u0111\xEDnh k\xE8m \u0111\u1EC3 xem)</b></p>\n      <div><b>Th\u1EDDi gian:</b> ").concat(dataSend.time, "</div>\n      <div><b>B\xE1c s\u0129:</b> ").concat(dataSend.doctorName, "</div>\n      <p>N\u1EBFu c\xE1c th\xF4ng tin tr\xEAn l\xE0 ch\xEDnh x\xE1c, vui l\xF2ng qu\xE9t m\xE3 QR b\xEAn d\u01B0\u1EDBi \u0111\u1EC3 thanh to\xE1n:</p>\n      ").concat(qrImage, "\n      <div>Xin ch\xE2n th\xE0nh c\u1EA3m \u01A1n!</div>\n    ");
  } else {
    // Trường hợp ngôn ngữ khác (ví dụ English)
    result = "\n      <h3>Dear ".concat(dataSend.patientInfo.fullName, "!</h3>\n      <p>You received this email because you booked a medical appointment on Booking Care.</p>\n      <p><b>Prescription Information:</b></p>\n      <div><b>Time:</b> ").concat(dataSend.time, "</div>\n      <div><b>Doctor:</b> ").concat(dataSend.doctorName, "</div>\n      <p>If the above information is correct, please scan code QR below to proceed with payment:</p>\n      ").concat(qrImage, "\n      <div>Thank you very much!</div>\n    ");
  }
  return result;
};
var sendAttachment = /*#__PURE__*/function () {
  var _ref2 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3(dataSend) {
    return _regenerator().w(function (_context3) {
      while (1) switch (_context3.n) {
        case 0:
          return _context3.a(2, new Promise(/*#__PURE__*/function () {
            var _ref3 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2(resolve, reject) {
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
                      subject: "Kết quả đặt lịch khám bệnh",
                      // Subject line
                      html: getBodyHTMLEmailRemedy(dataSend),
                      attachments: [{
                        filename: dataSend.imgBase64 && dataSend.imgBase64.startsWith("data:application/pdf") ? "don-thuoc.pdf" : "",
                        content: dataSend.imgBase64 ? dataSend.imgBase64.split("base64,")[1] : "",
                        encoding: "base64"
                      }]
                    });
                  case 1:
                    info = _context2.v;
                    resolve({
                      errCode: 0,
                      errMessage: "Send remedy success!"
                    });
                    // console.log("✅ Gửi thành công", info);
                    _context2.n = 3;
                    break;
                  case 2:
                    _context2.p = 2;
                    _t2 = _context2.v;
                    console.error("❌ Gửi thất bại", _t2);
                    reject(_t2);
                  case 3:
                    return _context2.a(2);
                }
              }, _callee2, null, [[0, 2]]);
            }));
            return function (_x3, _x4) {
              return _ref3.apply(this, arguments);
            };
          }()));
      }
    }, _callee3);
  }));
  return function sendAttachment(_x2) {
    return _ref2.apply(this, arguments);
  };
}();
var sendEmailPaymentSuccess = /*#__PURE__*/function () {
  var _ref4 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4(dataSend) {
    var transporter, info, _t3;
    return _regenerator().w(function (_context4) {
      while (1) switch (_context4.p = _context4.n) {
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
          }); // console.log("transporter", transporter);
          _context4.p = 1;
          _context4.n = 2;
          return transporter.sendMail({
            from: '"Trần Xuân Đức" <ductranxuan28@gmail.com>',
            // sender address
            to: dataSend.reciverEmail,
            // list of receivers
            subject: "Thông tin giao dịch!",
            // Subject line
            html: getBodyHTMLEmailPayment(dataSend)
          });
        case 2:
          info = _context4.v;
          _context4.n = 4;
          break;
        case 3:
          _context4.p = 3;
          _t3 = _context4.v;
          console.error("❌ Gửi thất bại", _t3);
        case 4:
          return _context4.a(2);
      }
    }, _callee4, null, [[1, 3]]);
  }));
  return function sendEmailPaymentSuccess(_x5) {
    return _ref4.apply(this, arguments);
  };
}();
var getBodyHTMLEmailPayment = function getBodyHTMLEmailPayment(dataSend) {
  var result = "";
  if (dataSend.language === "vi") {
    result = "\n    <h3>Xin ch\xE0o ".concat(dataSend.patientName, "!</h3>\n    <p>B\u1EA1n \u0111\xE3 thanh to\xE1n th\xE0nh c\xF4ng v\u1EC1 ch\xED ph\xED t\u1EA1i Booking care</p>\n    <p>Th\xF4ng tin thanh to\xE1n</p>\n    <div><b>Th\u1EDDi gian:").concat(dataSend.time, "</b>\n    </div>\n     <div><b>T\u1ED5ng chi ph\xED \u0111\xE3 thanh to\xE1n:").concat(dataSend.amount, "</b>\n    </div>\n    <div> Xin ch\xE2n th\xE0nh c\u1EA3m \u01A1n!</div>\n    ");
  }
  return result;
};
module.exports = {
  sendSimpleEmail: sendSimpleEmail,
  sendAttachment: sendAttachment,
  sendEmailPaymentSuccess: sendEmailPaymentSuccess
};