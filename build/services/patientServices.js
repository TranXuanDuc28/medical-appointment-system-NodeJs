"use strict";

var _sequelize = require("sequelize");
var _index = _interopRequireDefault(require("../models/index"));
var _emailServices = _interopRequireDefault(require("./emailServices"));
var _uuid = require("uuid");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { "default": e }; }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
require("dotenv").config();
var buildUrlEmail = function buildUrlEmail(doctorId, token) {
  var result = "".concat(process.env.URL_REACT, "/verify-booking?token=").concat(token, "&doctorId=").concat(doctorId);
  return result;
};
var postBookAppointmentServices = /*#__PURE__*/function () {
  var _ref = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2(data) {
    return _regenerator().w(function (_context2) {
      while (1) switch (_context2.n) {
        case 0:
          return _context2.a(2, new Promise(/*#__PURE__*/function () {
            var _ref2 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(resolve, reject) {
              var token, prefix, nameParts, firstName, lastName, _yield$db$User$findOr, _yield$db$User$findOr2, user, created, _t;
              return _regenerator().w(function (_context) {
                while (1) switch (_context.p = _context.n) {
                  case 0:
                    _context.p = 0;
                    if (!(!data.email || !data.doctorId || !data.timeType || !data.date || !data.fullName || !data.selectedGender || !data.address)) {
                      _context.n = 1;
                      break;
                    }
                    resolve({
                      errCode: 1,
                      errMessage: "Không có tham số truyền vào!"
                    });
                    _context.n = 6;
                    break;
                  case 1:
                    token = (0, _uuid.v4)();
                    prefix = token.split("-")[0];
                    nameParts = data.fullName.trim().split(" ");
                    firstName = nameParts.slice(0, -1).join(" "); // bỏ chữ cuối
                    lastName = nameParts[nameParts.length - 1]; // lấy chữ cuối
                    _context.n = 2;
                    return _emailServices["default"].sendSimpleEmail({
                      reciverEmail: data.email,
                      patientName: data.fullName,
                      time: data.timeString,
                      doctorName: data.doctorName,
                      language: data.language,
                      redirectLink: buildUrlEmail(data.doctorId, token)
                    });
                  case 2:
                    _context.n = 3;
                    return _index["default"].User.findOrCreate({
                      where: {
                        email: data.email
                      },
                      defaults: {
                        email: data.email,
                        roleId: "R3",
                        firstName: firstName,
                        lastName: lastName,
                        phoneNumber: data.phoneNumber,
                        address: data.address,
                        gender: data.selectedGender
                      }
                    });
                  case 3:
                    _yield$db$User$findOr = _context.v;
                    _yield$db$User$findOr2 = _slicedToArray(_yield$db$User$findOr, 2);
                    user = _yield$db$User$findOr2[0];
                    created = _yield$db$User$findOr2[1];
                    if (created) {
                      _context.n = 4;
                      break;
                    }
                    _context.n = 4;
                    return _index["default"].User.update({
                      roleId: "R3",
                      firstName: firstName,
                      lastName: lastName,
                      address: data.address,
                      gender: data.selectedGender,
                      phoneNumber: data.phoneNumber
                    }, {
                      where: {
                        email: data.email
                      }
                    });
                  case 4:
                    _context.n = 5;
                    return _index["default"].Booking.findOrCreate({
                      where: {
                        patientId: user.id,
                        doctorId: data.doctorId,
                        date: data.date,
                        timeType: data.timeType
                      },
                      defaults: {
                        id: prefix,
                        statusId: "S1",
                        doctorId: data.doctorId,
                        patientId: user.id,
                        date: data.date,
                        timeType: data.timeType,
                        token: token
                      }
                    });
                  case 5:
                    resolve({
                      errCode: 0,
                      errMessage: "Save infor patient succeed!"
                    });
                  case 6:
                    _context.n = 8;
                    break;
                  case 7:
                    _context.p = 7;
                    _t = _context.v;
                    reject(_t);
                  case 8:
                    return _context.a(2);
                }
              }, _callee, null, [[0, 7]]);
            }));
            return function (_x2, _x3) {
              return _ref2.apply(this, arguments);
            };
          }()));
      }
    }, _callee2);
  }));
  return function postBookAppointmentServices(_x) {
    return _ref.apply(this, arguments);
  };
}();
var postVerifyBookAppointment = function postVerifyBookAppointment(data) {
  return new Promise(/*#__PURE__*/function () {
    var _ref3 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3(resolve, reject) {
      var appointment, _t2;
      return _regenerator().w(function (_context3) {
        while (1) switch (_context3.p = _context3.n) {
          case 0:
            _context3.p = 0;
            if (!(!data.token || !data.doctorId)) {
              _context3.n = 1;
              break;
            }
            resolve({
              errCode: 1,
              errMessage: "Missing parameter"
            });
            _context3.n = 5;
            break;
          case 1:
            _context3.n = 2;
            return _index["default"].Booking.findOne({
              where: {
                doctorId: data.doctorId,
                token: data.token,
                statusId: "S1"
              },
              raw: false
            });
          case 2:
            appointment = _context3.v;
            if (!appointment) {
              _context3.n = 4;
              break;
            }
            appointment.statusId = "S2";
            _context3.n = 3;
            return appointment.save();
          case 3:
            resolve({
              errCode: 0,
              errMessage: "Update the appointment succeed"
            });
            _context3.n = 5;
            break;
          case 4:
            resolve({
              errCode: 2,
              errMessage: "Appointment has been activated or does not exist"
            });
          case 5:
            _context3.n = 7;
            break;
          case 6:
            _context3.p = 6;
            _t2 = _context3.v;
            reject(_t2);
          case 7:
            return _context3.a(2);
        }
      }, _callee3, null, [[0, 6]]);
    }));
    return function (_x4, _x5) {
      return _ref3.apply(this, arguments);
    };
  }());
};
var getPatientAppointments = /*#__PURE__*/function () {
  var _ref4 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5(patientId) {
    return _regenerator().w(function (_context5) {
      while (1) switch (_context5.n) {
        case 0:
          return _context5.a(2, new Promise(/*#__PURE__*/function () {
            var _ref5 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4(resolve, reject) {
              var appointments, _t3;
              return _regenerator().w(function (_context4) {
                while (1) switch (_context4.p = _context4.n) {
                  case 0:
                    _context4.p = 0;
                    if (patientId) {
                      _context4.n = 1;
                      break;
                    }
                    resolve({
                      errCode: 1,
                      errMessage: "Missing required parameter: patientId"
                    });
                    _context4.n = 3;
                    break;
                  case 1:
                    _context4.n = 2;
                    return _index["default"].Booking.findAll({
                      where: {
                        patientId: patientId
                      },
                      include: [{
                        model: _index["default"].User,
                        as: "patientData",
                        attributes: ["firstName", "lastName"]
                      }, {
                        model: _index["default"].AllCode,
                        as: "timeTypeDataPatient",
                        attributes: ["valueEn", "valueVi"]
                      }, {
                        model: _index["default"].AllCode,
                        as: "statusDataPatient",
                        attributes: ["valueEn", "valueVi"]
                      }, {
                        model: _index["default"].Doctor_Infor,
                        as: "doctorInforData",
                        include: [{
                          model: _index["default"].User,
                          as: "doctorData",
                          attributes: ["firstName", "lastName"]
                        }, {
                          model: _index["default"].Specialty,
                          as: "doctorSpecialty",
                          attributes: ["name"]
                        }],
                        raw: false,
                        nest: false
                      }],
                      order: [["createdAt", "DESC"]],
                      raw: true,
                      nest: true
                    });
                  case 2:
                    appointments = _context4.v;
                    //console.log("appointments", appointments);
                    if (appointments && appointments.length > 0) {
                      resolve({
                        errCode: 0,
                        data: appointments.map(function (appointment) {
                          return {
                            id: appointment.id,
                            doctorName: "".concat(appointment.doctorInforData.doctorData.firstName, " ").concat(appointment.doctorInforData.doctorData.lastName),
                            specialty: appointment.doctorInforData.doctorSpecialty ? appointment.doctorInforData.doctorSpecialty.name : "N/A",
                            time: appointment.date,
                            timeType: appointment.timeTypeDataPatient.valueVi,
                            status: appointment.statusDataPatient.valueVi
                          };
                        })
                      });
                    } else {
                      resolve({
                        errCode: 0,
                        data: []
                      });
                    }
                  case 3:
                    _context4.n = 5;
                    break;
                  case 4:
                    _context4.p = 4;
                    _t3 = _context4.v;
                    console.error("Error fetching patient appointments:", _t3);
                    resolve({
                      errCode: -1,
                      errMessage: "Error from the server"
                    });
                  case 5:
                    return _context4.a(2);
                }
              }, _callee4, null, [[0, 4]]);
            }));
            return function (_x7, _x8) {
              return _ref5.apply(this, arguments);
            };
          }()));
      }
    }, _callee5);
  }));
  return function getPatientAppointments(_x6) {
    return _ref4.apply(this, arguments);
  };
}();
module.exports = {
  postBookAppointmentServices: postBookAppointmentServices,
  postVerifyBookAppointment: postVerifyBookAppointment,
  getPatientAppointments: getPatientAppointments
};