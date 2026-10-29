"use strict";

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
var _sequelize = require("sequelize");
var _models = _interopRequireDefault(require("../models"));
var _bodyParser = require("body-parser");
var _lodash = _interopRequireWildcard(require("lodash"));
var _emailServices = _interopRequireDefault(require("./emailServices"));
var _nodeHtmlToImage = _interopRequireDefault(require("node-html-to-image"));
var _moment = _interopRequireWildcard(require("moment"));
var _inspector = require("inspector");
var _nodeFetch = _interopRequireDefault(require("node-fetch"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function _interopRequireWildcard(e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, "default": e }; if (null === e || "object" != _typeof(e) && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (var _t20 in e) "default" !== _t20 && {}.hasOwnProperty.call(e, _t20) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, _t20)) && (i.get || i.set) ? o(f, _t20, i) : f[_t20] = e[_t20]); return f; })(e, t); }
function _interopRequireDefault(e) { return e && e.__esModule ? e : { "default": e }; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
require("dotenv").config();
var _require = require("../socket/onlineUsers"),
  getOnlineUsers = _require.getOnlineUsers;
var payOS = require("../config/payos");
var _require2 = require("../config/firebase"),
  sendPushNotification = _require2.sendPushNotification;
var path = require("path");
var ejs = require("ejs");
var MAX_NUMBER_SCHEDULE = process.env.MAX_NUMBER_SCHEDULE;
var https = require("https");
var axios = require("axios");
var puppeteer = require("puppeteer");
var getPrescriptionPDFBase64 = /*#__PURE__*/function () {
  var _ref = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(data) {
    var filePath, html, browser, page, pdfBuffer, _t;
    return _regenerator().w(function (_context) {
      while (1) switch (_context.p = _context.n) {
        case 0:
          // Tạo HTML template cho đơn thuốc
          // process.stdout.write(JSON.stringify(data, null, 2) + "\n");
          // process.stdout.write("Oke");
          filePath = path.join(__dirname, "../templates/prescription.ejs"); // process.stdout.write("File path: " + filePath + "\n");
          _context.p = 1;
          _context.n = 2;
          return ejs.renderFile(path.join(__dirname, "../templates/prescription.ejs"), data);
        case 2:
          html = _context.v;
          _context.n = 4;
          break;
        case 3:
          _context.p = 3;
          _t = _context.v;
          process.stdout.write("EJS render error:", _t);
        case 4:
          _context.n = 5;
          return puppeteer.launch({
            headless: true,
            args: ["--no-sandbox"]
          });
        case 5:
          browser = _context.v;
          _context.n = 6;
          return browser.newPage();
        case 6:
          page = _context.v;
          _context.n = 7;
          return page.setContent(html, {
            waitUntil: "networkidle0"
          });
        case 7:
          _context.n = 8;
          return page.pdf({
            format: "A4",
            printBackground: true
          });
        case 8:
          pdfBuffer = _context.v;
          _context.n = 9;
          return browser.close();
        case 9:
          return _context.a(2, pdfBuffer.toString("base64"));
      }
    }, _callee, null, [[1, 3]]);
  }));
  return function getPrescriptionPDFBase64(_x) {
    return _ref.apply(this, arguments);
  };
}();
var getTopDoctorHomeServices = function getTopDoctorHomeServices(limitInput, lang) {
  // console.log("data", limitInput, lang);
  return new Promise(/*#__PURE__*/function () {
    var _ref2 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2(resolve, reject) {
      var doctors, _t2;
      return _regenerator().w(function (_context2) {
        while (1) switch (_context2.p = _context2.n) {
          case 0:
            _context2.p = 0;
            _context2.n = 1;
            return _models["default"].User.findAll({
              limit: limitInput,
              where: {
                roleId: "R2"
              },
              order: [["createdAt", "DESC"]],
              attributes: {
                exclude: ["password"]
              },
              include: [{
                model: _models["default"].AllCode,
                as: "positionData",
                attributes: ["valueEn", "valueVi"]
              }, {
                model: _models["default"].AllCode,
                as: "genderData",
                attributes: ["valueEn", "valueVi"]
              }, {
                model: _models["default"].Doctor_Infor,
                where: {
                  lang: lang
                },
                include: [{
                  model: _models["default"].Specialty,
                  as: "doctorSpecialty",
                  include: [{
                    model: _models["default"].Specialty_Translation,
                    where: {
                      lang: lang
                    },
                    as: "specialtyData"
                  }]
                }]
              }],
              raw: false
            });
          case 1:
            doctors = _context2.v;
            if (doctors && doctors.length > 0) {
              doctors.map(function (item) {
                item.image = Buffer.from(item.image, "base64").toString("binary");
                return item;
              });
            }
            resolve({
              errCode: 0,
              data: doctors
            });
            _context2.n = 3;
            break;
          case 2:
            _context2.p = 2;
            _t2 = _context2.v;
            reject(_t2);
          case 3:
            return _context2.a(2);
        }
      }, _callee2, null, [[0, 2]]);
    }));
    return function (_x2, _x3) {
      return _ref2.apply(this, arguments);
    };
  }());
};
var getAllDoctorServices = function getAllDoctorServices() {
  return new Promise(/*#__PURE__*/function () {
    var _ref3 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3(resolve, reject) {
      var doctors, _t3;
      return _regenerator().w(function (_context3) {
        while (1) switch (_context3.p = _context3.n) {
          case 0:
            _context3.p = 0;
            _context3.n = 1;
            return _models["default"].User.findAll({
              where: {
                roleId: "R2"
              },
              attributes: {
                exclude: ["password"]
              },
              include: [{
                model: _models["default"].AllCode,
                as: "positionData",
                attributes: ["valueEn", "valueVi"]
              }, {
                model: _models["default"].AllCode,
                as: "genderData",
                attributes: ["valueEn", "valueVi"]
              }],
              raw: true,
              nest: true
            });
          case 1:
            doctors = _context3.v;
            if (doctors && doctors.length > 0) {
              doctors.map(function (item) {
                item.image = Buffer.from(item.image, "base64").toString("binary");
                return item;
              });
            }
            resolve({
              errCode: 0,
              data: doctors
            });
            _context3.n = 3;
            break;
          case 2:
            _context3.p = 2;
            _t3 = _context3.v;
            reject(_t3);
          case 3:
            return _context3.a(2);
        }
      }, _callee3, null, [[0, 2]]);
    }));
    return function (_x4, _x5) {
      return _ref3.apply(this, arguments);
    };
  }());
};
var checkRequiredFields = function checkRequiredFields(inputData) {
  var arrFields = ["doctorId", "contentHTML", "contentMarkdown", "action", "selectedPrice", "selectedPayment", "selectedProvince", "nameClinic", "addressClinic", "note"
  // "specialtyId",
  ];
  var isValid = true;
  var element = "";
  for (var i = 0; i < arrFields.length; i++) {
    if (!inputData[arrFields[i]]) {
      isValid = false;
      element = arrFields[i];
      break;
    }
  }
  return {
    isValid: isValid,
    element: element
  };
};
var saveDetailInforDoctor = function saveDetailInforDoctor(inputData) {
  return new Promise(/*#__PURE__*/function () {
    var _ref4 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4(resolve, reject) {
      var checkObj, doctorMarkdown, doctorInfor, _t4, _t5;
      return _regenerator().w(function (_context4) {
        while (1) switch (_context4.p = _context4.n) {
          case 0:
            _context4.p = 0;
            checkObj = checkRequiredFields(inputData);
            if (!(checkObj.isValid === false)) {
              _context4.n = 1;
              break;
            }
            resolve({
              errCode: 1,
              errMessage: "Missing parameter:".concat(checkObj.element)
            });
            _context4.n = 14;
            break;
          case 1:
            if (!(inputData.action === "CREATE")) {
              _context4.n = 3;
              break;
            }
            _context4.n = 2;
            return _models["default"].Markdown.create({
              lang: inputData.lang,
              contentHTML: inputData.contentHTML,
              contentMarkdown: inputData.contentMarkdown,
              description: inputData.description,
              doctorId: inputData.doctorId
            });
          case 2:
            _context4.n = 7;
            break;
          case 3:
            if (!(inputData.action === "UPDATE")) {
              _context4.n = 7;
              break;
            }
            _context4.n = 4;
            return _models["default"].Markdown.findOne({
              where: {
                doctorId: inputData.doctorId,
                lang: inputData.lang
              },
              raw: false
            });
          case 4:
            doctorMarkdown = _context4.v;
            if (!doctorMarkdown) {
              _context4.n = 6;
              break;
            }
            doctorMarkdown.contentHTML = inputData.contentHTML;
            doctorMarkdown.contentMarkdown = inputData.contentMarkdown;
            doctorMarkdown.description = inputData.description;
            doctorMarkdown.updateAt = new Date();
            _context4.n = 5;
            return doctorMarkdown.save();
          case 5:
            _context4.n = 7;
            break;
          case 6:
            _context4.n = 7;
            return _models["default"].Markdown.create({
              lang: inputData.lang,
              contentHTML: inputData.contentHTML,
              contentMarkdown: inputData.contentMarkdown,
              description: inputData.description,
              doctorId: inputData.doctorId
            });
          case 7:
            _context4.n = 8;
            return _models["default"].Doctor_Infor.findOne({
              where: {
                doctorId: inputData.doctorId,
                lang: inputData.lang
              },
              raw: false
            });
          case 8:
            doctorInfor = _context4.v;
            if (!doctorInfor) {
              _context4.n = 10;
              break;
            }
            //update
            doctorInfor.doctorId = inputData.doctorId;
            doctorInfor.priceId = inputData.selectedPrice;
            doctorInfor.provinceId = inputData.selectedProvince;
            doctorInfor.paymentId = inputData.selectedPayment;
            doctorInfor.nameClinic = inputData.nameClinic;
            doctorInfor.addressClinic = inputData.addressClinic;
            doctorInfor.note = inputData.note;
            doctorInfor.specialtyId = inputData.specialtyId;
            doctorInfor.clinicId = inputData.clinicId ? inputData.clinicId : null;
            doctorInfor.lang = inputData.lang;
            _context4.n = 9;
            return doctorInfor.save();
          case 9:
            _context4.n = 13;
            break;
          case 10:
            _context4.p = 10;
            _context4.n = 11;
            return _models["default"].Doctor_Infor.create({
              doctorId: inputData.doctorId,
              priceId: inputData.selectedPrice,
              provinceId: inputData.selectedProvince,
              paymentId: inputData.selectedPayment,
              nameClinic: inputData.nameClinic,
              addressClinic: inputData.addressClinic,
              note: inputData.note,
              specialtyId: inputData.specialtyId,
              clinicId: inputData.clinicId !== "" ? inputData.clinicId : null,
              lang: inputData.lang
            });
          case 11:
            _context4.n = 13;
            break;
          case 12:
            _context4.p = 12;
            _t4 = _context4.v;
            _inspector.console.error("Error creating doctor info:", _t4);
          case 13:
            resolve({
              errCode: 0,
              errMessage: "Save infor doctor succeed!"
            });
          case 14:
            _context4.n = 16;
            break;
          case 15:
            _context4.p = 15;
            _t5 = _context4.v;
            reject(_t5);
          case 16:
            return _context4.a(2);
        }
      }, _callee4, null, [[10, 12], [0, 15]]);
    }));
    return function (_x6, _x7) {
      return _ref4.apply(this, arguments);
    };
  }());
};
var getDetailDoctorByIdServices = function getDetailDoctorByIdServices(inputId, lang) {
  // process.stdout.write("InputId: " + inputId + ", lang: " + lang + "\n");
  return new Promise(/*#__PURE__*/function () {
    var _ref5 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5(resolve, reject) {
      var doctors, _t6;
      return _regenerator().w(function (_context5) {
        while (1) switch (_context5.p = _context5.n) {
          case 0:
            _context5.p = 0;
            if (inputId) {
              _context5.n = 1;
              break;
            }
            resolve({
              errCode: 1,
              errMessage: " Khong co tham so truyen vao"
            });
            _context5.n = 3;
            break;
          case 1:
            _context5.n = 2;
            return _models["default"].User.findOne({
              where: {
                id: inputId
              },
              attributes: {
                exclude: ["password"]
              },
              include: [{
                model: _models["default"].Markdown,
                attributes: ["description", "contentHTML", "contentMarkdown", "lang"],
                where: lang ? {
                  lang: lang
                } : undefined,
                required: false
              }, {
                model: _models["default"].AllCode,
                as: "positionData",
                attributes: ["valueEn", "valueVi"]
              }, {
                model: _models["default"].Doctor_Infor,
                attributes: {
                  exclude: ["id", "doctorId"]
                },
                where: lang ? {
                  lang: lang
                } : undefined,
                include: [{
                  model: _models["default"].AllCode,
                  as: "priceTypeData",
                  attributes: ["valueEn", "valueVi"]
                }, {
                  model: _models["default"].AllCode,
                  as: "paymentTypeData",
                  attributes: ["valueEn", "valueVi"]
                }, {
                  model: _models["default"].AllCode,
                  as: "provinceTypeData",
                  attributes: ["valueEn", "valueVi"]
                }]
              }],
              raw: false,
              nest: true
            });
          case 2:
            doctors = _context5.v;
            // process.stdout.write("Doctor data: " + JSON.stringify(doctors) + "\n");

            if (doctors && doctors.image) {
              doctors.image = Buffer.from(doctors.image, "base64").toString("binary");
            }
            if (!doctors) doctors = {};
            resolve({
              errCode: 0,
              data: doctors
            });
          case 3:
            _context5.n = 5;
            break;
          case 4:
            _context5.p = 4;
            _t6 = _context5.v;
            reject(_t6);
          case 5:
            return _context5.a(2);
        }
      }, _callee5, null, [[0, 4]]);
    }));
    return function (_x8, _x9) {
      return _ref5.apply(this, arguments);
    };
  }());
};
var bulkCreateScheduleServices = function bulkCreateScheduleServices(data) {
  return new Promise(/*#__PURE__*/function () {
    var _ref6 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee6(resolve, reject) {
      var schedule, existing, toCreate, _t7;
      return _regenerator().w(function (_context6) {
        while (1) switch (_context6.p = _context6.n) {
          case 0:
            _context6.p = 0;
            if (!(!data.arrSchedule || !data.doctorId || !data.formatedDate)) {
              _context6.n = 1;
              break;
            }
            resolve({
              errCode: 1,
              errMessage: "Missing required param !"
            });
            _context6.n = 4;
            break;
          case 1:
            schedule = data.arrSchedule;
            if (schedule && schedule.length > 0) {
              schedule = schedule.map(function (item) {
                item.maxNumber = MAX_NUMBER_SCHEDULE;
                return item;
              });
            }
            _context6.n = 2;
            return _models["default"].Schedule.findAll({
              where: {
                doctorId: data.doctorId,
                date: data.formatedDate
              },
              attributes: ["doctorId", "maxNumber", "timeType", "date"],
              raw: true
            });
          case 2:
            existing = _context6.v;
            toCreate = _lodash["default"].differenceWith(schedule, existing, function (a, b) {
              return a.timeType === b.timeType && +a.date === +b.date;
            });
            if (!(toCreate && toCreate.length > 0)) {
              _context6.n = 3;
              break;
            }
            toCreate = toCreate.map(function (item) {
              return _objectSpread(_objectSpread({}, item), {}, {
                status: "available" //gán cho từng schedule
              });
            });
            _context6.n = 3;
            return _models["default"].Schedule.bulkCreate(toCreate);
          case 3:
            resolve({
              errCode: 0,
              errMessage: "OK"
            });
          case 4:
            _context6.n = 6;
            break;
          case 5:
            _context6.p = 5;
            _t7 = _context6.v;
            reject(_t7);
          case 6:
            return _context6.a(2);
        }
      }, _callee6, null, [[0, 5]]);
    }));
    return function (_x0, _x1) {
      return _ref6.apply(this, arguments);
    };
  }());
};
var getScheduleDoctorByDateServices = function getScheduleDoctorByDateServices(_ref7) {
  var doctorId = _ref7.doctorId,
    date = _ref7.date;
  return new Promise(/*#__PURE__*/function () {
    var _ref8 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee7(resolve, reject) {
      var dataSchedule, _t8;
      return _regenerator().w(function (_context7) {
        while (1) switch (_context7.p = _context7.n) {
          case 0:
            _context7.p = 0;
            if (!(!doctorId || !date)) {
              _context7.n = 1;
              break;
            }
            resolve({
              errCode: 1,
              errMessage: "Không có tham số truyền vào"
            });
            _context7.n = 3;
            break;
          case 1:
            _context7.n = 2;
            return _models["default"].Schedule.findAll({
              where: {
                doctorId: doctorId,
                date: date
              },
              include: [{
                model: _models["default"].AllCode,
                as: "timeTypeData",
                attributes: ["valueEn", "valueVi"]
              }, {
                model: _models["default"].User,
                as: "doctorData",
                attributes: ["firstName", "lastName"]
              }],
              raw: false
            });
          case 2:
            dataSchedule = _context7.v;
            // console.log("dataSchedule", dataSchedule);
            resolve({
              errCode: 0,
              data: dataSchedule
            });
          case 3:
            _context7.n = 5;
            break;
          case 4:
            _context7.p = 4;
            _t8 = _context7.v;
            reject(_t8);
          case 5:
            return _context7.a(2);
        }
      }, _callee7, null, [[0, 4]]);
    }));
    return function (_x10, _x11) {
      return _ref8.apply(this, arguments);
    };
  }());
};
var getExtraDoctorInforByIdServices = function getExtraDoctorInforByIdServices(inputId, lang) {
  return new Promise(/*#__PURE__*/function () {
    var _ref9 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee8(resolve, reject) {
      var data, _t9;
      return _regenerator().w(function (_context8) {
        while (1) switch (_context8.p = _context8.n) {
          case 0:
            _context8.p = 0;
            if (inputId) {
              _context8.n = 1;
              break;
            }
            resolve({
              errCode: 1,
              errMessage: " Khong co tham so truyen vao"
            });
            _context8.n = 3;
            break;
          case 1:
            _context8.n = 2;
            return _models["default"].Doctor_Infor.findOne({
              where: {
                doctorId: inputId,
                lang: lang
              },
              attributes: {
                exclude: ["id", "doctorId"]
              },
              include: [{
                model: _models["default"].Specialty_Translation,
                where: {
                  lang: lang
                },
                as: "specialty",
                attributes: ["name"]
              }, {
                model: _models["default"].AllCode,
                as: "priceTypeData",
                attributes: ["valueEn", "valueVi"]
              }, {
                model: _models["default"].AllCode,
                as: "paymentTypeData",
                attributes: ["valueEn", "valueVi"]
              }, {
                model: _models["default"].AllCode,
                as: "provinceTypeData",
                attributes: ["valueEn", "valueVi"]
              }],
              raw: false,
              nest: true
            });
          case 2:
            data = _context8.v;
            // console.log("data", data);

            if (!data) data = {};
            resolve({
              errCode: 0,
              data: data
            });
          case 3:
            _context8.n = 5;
            break;
          case 4:
            _context8.p = 4;
            _t9 = _context8.v;
            reject(_t9);
          case 5:
            return _context8.a(2);
        }
      }, _callee8, null, [[0, 4]]);
    }));
    return function (_x12, _x13) {
      return _ref9.apply(this, arguments);
    };
  }());
};
var getProfileDoctorByIdServices = function getProfileDoctorByIdServices(inputId, lang) {
  return new Promise(/*#__PURE__*/function () {
    var _ref0 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee9(resolve, reject) {
      var doctors, _t0;
      return _regenerator().w(function (_context9) {
        while (1) switch (_context9.p = _context9.n) {
          case 0:
            _context9.p = 0;
            if (inputId) {
              _context9.n = 1;
              break;
            }
            resolve({
              errCode: 1,
              errMessage: " Khong co tham so truyen vao"
            });
            _context9.n = 3;
            break;
          case 1:
            _context9.n = 2;
            return _models["default"].User.findOne({
              where: {
                id: inputId
              },
              attributes: {
                exclude: ["password"]
              },
              include: [{
                model: _models["default"].Markdown,
                where: lang ? {
                  lang: lang
                } : undefined,
                attributes: ["description", "contentHTML", "contentMarkdown", "lang"],
                required: false
              }, {
                model: _models["default"].AllCode,
                as: "positionData",
                attributes: ["valueEn", "valueVi"]
              }, {
                model: _models["default"].Doctor_Infor,
                where: lang ? {
                  lang: lang
                } : undefined,
                attributes: {
                  exclude: ["id", "doctorId"]
                },
                include: [{
                  model: _models["default"].AllCode,
                  as: "priceTypeData",
                  attributes: ["valueEn", "valueVi"]
                }, {
                  model: _models["default"].AllCode,
                  as: "paymentTypeData",
                  attributes: ["valueEn", "valueVi"]
                }, {
                  model: _models["default"].AllCode,
                  as: "provinceTypeData",
                  attributes: ["valueEn", "valueVi"]
                }]
              }],
              raw: false,
              nest: true
            });
          case 2:
            doctors = _context9.v;
            if (doctors && doctors.image) {
              doctors.image = Buffer.from(doctors.image, "base64").toString("binary");
            }
            if (!doctors) doctors = {};
            resolve({
              errCode: 0,
              data: doctors
            });
          case 3:
            _context9.n = 5;
            break;
          case 4:
            _context9.p = 4;
            _t0 = _context9.v;
            reject(_t0);
          case 5:
            return _context9.a(2);
        }
      }, _callee9, null, [[0, 4]]);
    }));
    return function (_x14, _x15) {
      return _ref0.apply(this, arguments);
    };
  }());
};
var getListPatientForDoctor = function getListPatientForDoctor(doctorId, roleId, date, lang) {
  return new Promise(/*#__PURE__*/function () {
    var _ref1 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee0(resolve, reject) {
      var data, _t1;
      return _regenerator().w(function (_context0) {
        while (1) switch (_context0.p = _context0.n) {
          case 0:
            _context0.p = 0;
            if (!(!doctorId || !roleId || !date || !lang)) {
              _context0.n = 1;
              break;
            }
            resolve({
              errCode: 1,
              errMessage: "Missing required parameters"
            });
            _context0.n = 6;
            break;
          case 1:
            data = {};
            if (!(roleId === "R4")) {
              _context0.n = 3;
              break;
            }
            _context0.n = 2;
            return _models["default"].Booking.findAll({
              where: {
                statusId: _defineProperty({}, _sequelize.Op["in"], ["S5", "S6"])
              },
              include: [{
                model: _models["default"].User,
                as: "patientData",
                attributes: ["firstName", "lastName", "email", "phoneNumber", "address", "gender"],
                include: [{
                  model: _models["default"].AllCode,
                  as: "genderData",
                  attributes: ["valueEn", "valueVi"]
                }]
              }, {
                model: _models["default"].AllCode,
                as: "timeTypeDataPatient",
                attributes: ["valueEn", "valueVi"]
              }, {
                model: _models["default"].Doctor_Infor,
                where: {
                  lang: lang
                },
                as: "doctorInforData",
                include: [{
                  model: _models["default"].User,
                  as: "doctorData",
                  attributes: ["firstName", "lastName"]
                }]
              }],
              order: [["createdAt", "DESC"]],
              raw: false,
              nest: true
            });
          case 2:
            data = _context0.v;
            _context0.n = 5;
            break;
          case 3:
            _context0.n = 4;
            return _models["default"].Booking.findAll({
              where: {
                statusId: _defineProperty({}, _sequelize.Op["in"], ["S2", "S3"]),
                doctorId: doctorId,
                date: date
              },
              include: [{
                model: _models["default"].User,
                as: "patientData",
                attributes: ["firstName", "lastName", "email", "phoneNumber", "address", "gender"],
                include: [{
                  model: _models["default"].AllCode,
                  as: "genderData",
                  attributes: ["valueEn", "valueVi"]
                }]
              }, {
                model: _models["default"].AllCode,
                as: "timeTypeDataPatient",
                attributes: ["valueEn", "valueVi"]
              }, {
                model: _models["default"].Doctor_Infor,
                where: {
                  lang: lang
                },
                as: "doctorInforData",
                include: [{
                  model: _models["default"].User,
                  as: "doctorData",
                  attributes: ["firstName", "lastName"]
                }]
              }],
              order: [["createdAt", "DESC"]],
              raw: false,
              nest: true
            });
          case 4:
            data = _context0.v;
          case 5:
            resolve({
              errCode: 0,
              data: data
            });
          case 6:
            _context0.n = 8;
            break;
          case 7:
            _context0.p = 7;
            _t1 = _context0.v;
            reject(_t1);
          case 8:
            return _context0.a(2);
        }
      }, _callee0, null, [[0, 7]]);
    }));
    return function (_x16, _x17) {
      return _ref1.apply(this, arguments);
    };
  }());
};
var buildTimeBooking = function buildTimeBooking(appointmentData) {
  if (appointmentData && !_lodash["default"].isEmpty(appointmentData)) {
    // process.stdout.write(
    //   "Check appointmentData ??? \n" +
    //     JSON.stringify(appointmentData, null, 2) +
    //     "\n"
    // );
    var time = appointmentData.timeTypeDataPatient.valueVi;
    var date = _moment["default"].unix(+appointmentData.date / 1000).locale("vi").format("dddd - DD//MM/YYYY");
    return " ".concat(time, " ").concat(date);
  }
  return "";
};
var sendRemedyService = function sendRemedyService(data) {
  // process.stdout.write("Data: " + JSON.stringify(data, null, 2) + "\n");
  return new Promise(/*#__PURE__*/function () {
    var _ref10 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee1(resolve, reject) {
      var appointment, appointmentData, timeString, doctorName, jobData, _t10;
      return _regenerator().w(function (_context1) {
        while (1) switch (_context1.p = _context1.n) {
          case 0:
            _context1.p = 0;
            if (!(!data.doctorId || !data.patientId || !data.timeType)) {
              _context1.n = 1;
              break;
            }
            resolve({
              errCode: 1,
              errMessage: "Missing required parameters"
            });
            _context1.n = 5;
            break;
          case 1:
            _context1.n = 2;
            return _models["default"].Booking.findOne({
              where: {
                doctorId: data.doctorId,
                patientId: data.patientId,
                timeType: data.timeType,
                statusId: "S2"
              },
              include: [{
                model: _models["default"].Doctor_Infor,
                as: "doctorInforData",
                include: [{
                  model: _models["default"].User,
                  as: "doctorData",
                  attributes: ["firstName", "lastName", "phoneNumber"]
                }]
              }, {
                model: _models["default"].AllCode,
                as: "timeTypeDataPatient",
                attributes: ["valueEn", "valueVi"]
              }],
              raw: false,
              // ✅ để có instance
              nest: true // ✅ để dữ liệu con thành object lồng nhau
            });
          case 2:
            appointment = _context1.v;
            appointmentData = appointment.get({
              plain: true
            }); // Chuyển đổi instance thành object
            if (!appointment) {
              _context1.n = 3;
              break;
            }
            appointment.statusId = "S3"; // S3 means sent remedy
            _context1.n = 3;
            return appointment.save();
          case 3:
            timeString = buildTimeBooking(appointmentData);
            doctorName = "".concat(appointmentData.doctorInforData.doctorData.firstName, " ").concat(appointmentData.doctorInforData.doctorData.lastName); // Prepare job data for worker to process asynchronously
            jobData = _objectSpread(_objectSpread({}, data), {}, {
              bookingId: appointment.id,
              amount: data.totalPrice,
              time: timeString,
              doctorName: doctorName,
              pdfData: {
                time: timeString,
                patientName: data.patientInfo.fullName,
                gender: data.patientInfo.gender,
                birthDate: data.patientInfo.birthDate,
                age: data.patientInfo.age,
                phone: data.patientInfo.phone,
                email: data.patientInfo.email,
                address: data.patientInfo.address,
                city: data.patientInfo.city,
                weight: data.patientInfo.weight,
                height: data.patientInfo.height,
                job: data.patientInfo.occupation,
                note: data.patientInfo.note,
                clinicalExam: data.examInfo.clinicalExam,
                detailExam: data.examInfo.detailExam,
                diagnosis: data.examInfo.diagnosis,
                allergies: data.examInfo.allergy,
                advice: data.examInfo.advice,
                treatment: data.examInfo.conclusion,
                medicines: data.prescription,
                totalPrice: "".concat(data.totalPrice, " VND"),
                doctorName: doctorName
              }
            }); // Queue the task to run in the background
            _context1.n = 4;
            return _emailServices["default"].sendAttachment(jobData);
          case 4:
            resolve({
              errCode: 0,
              errMessage: "Send remedy queued successfully!"
            });
          case 5:
            _context1.n = 7;
            break;
          case 6:
            _context1.p = 6;
            _t10 = _context1.v;
            reject(_t10);
          case 7:
            return _context1.a(2);
        }
      }, _callee1, null, [[0, 6]]);
    }));
    return function (_x18, _x19) {
      return _ref10.apply(this, arguments);
    };
  }());
};
var postMedicalAppointmentStatus = function postMedicalAppointmentStatus(data) {
  return new Promise(/*#__PURE__*/function () {
    var _ref11 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee10(resolve, reject) {
      var appointment, _t11;
      return _regenerator().w(function (_context10) {
        while (1) switch (_context10.p = _context10.n) {
          case 0:
            _context10.p = 0;
            if (!(!data.doctorId || !data.patientId || !data.timeType)) {
              _context10.n = 1;
              break;
            }
            resolve({
              errCode: 1,
              errMessage: "Missing required parameters"
            });
            _context10.n = 4;
            break;
          case 1:
            _context10.n = 2;
            return _models["default"].Booking.findOne({
              where: {
                doctorId: data.doctorId,
                patientId: data.patientId,
                timeType: data.timeType,
                statusId: "S3" // Status Done
              },
              raw: false
            });
          case 2:
            appointment = _context10.v;
            if (!appointment) {
              _context10.n = 3;
              break;
            }
            appointment.statusId = "S6"; // Status UnPaid
            _context10.n = 3;
            return appointment.save();
          case 3:
            resolve({
              errCode: 0,
              errMessage: "Update medical appointments succeed!"
            });
          case 4:
            _context10.n = 6;
            break;
          case 5:
            _context10.p = 5;
            _t11 = _context10.v;
            reject(_t11);
          case 6:
            return _context10.a(2);
        }
      }, _callee10, null, [[0, 5]]);
    }));
    return function (_x20, _x21) {
      return _ref11.apply(this, arguments);
    };
  }());
};
var sendPayment = function sendPayment(data, io) {
  return new Promise(/*#__PURE__*/function () {
    var _ref12 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee11(resolve, reject) {
      var appointment, cashierRecord, onlineUsers, notificationData, cashiers, patient, patientRecord, dataSend, _t12;
      return _regenerator().w(function (_context11) {
        while (1) switch (_context11.p = _context11.n) {
          case 0:
            _context11.p = 0;
            if (!(!data.email || !data.doctorId || !data.patientId || !data.timeType)) {
              _context11.n = 1;
              break;
            }
            resolve({
              errCode: 1,
              errMessage: "Missing required parameters"
            });
            _context11.n = 8;
            break;
          case 1:
            _context11.n = 2;
            return _models["default"].Booking.findOne({
              where: {
                doctorId: data.doctorId,
                patientId: data.patientId,
                timeType: data.timeType,
                statusId: "S6"
              },
              raw: false
            });
          case 2:
            appointment = _context11.v;
            if (!appointment) {
              _context11.n = 6;
              break;
            }
            appointment.statusId = "S5";
            _context11.n = 3;
            return appointment.save();
          case 3:
            _context11.n = 4;
            return _models["default"].Cashier.create({
              cashier: data.cashier,
              date: data.date,
              totalPrice: data.totalPrice,
              description: data.description,
              bookingId: appointment.id
            });
          case 4:
            cashierRecord = _context11.v;
            // Emit PAYMENT_CONFIRMED to cashier and patient
            if (io) {
              onlineUsers = getOnlineUsers();
              notificationData = {
                bookingId: appointment.id,
                patientName: data.patientName,
                amount: data.totalPrice,
                transactionDateTime: data.date,
                doctorId: data.doctorId
              };
              cashiers = onlineUsers.filter(function (user) {
                return user.roleId === "R4";
              });
              patient = onlineUsers.find(function (user) {
                return user.id === data.patientId;
              });
              cashiers.forEach(function (cashier) {
                io.to(cashier.socketId).emit("PAYMENT_CONFIRMED", _objectSpread(_objectSpread({}, notificationData), {}, {
                  role: "cashier"
                }));
              });
              if (patient) {
                io.to(patient.socketId).emit("PAYMENT_CONFIRMED", _objectSpread(_objectSpread({}, notificationData), {}, {
                  role: "patient"
                }));
              }
            }
            _context11.n = 5;
            return _models["default"].User.findOne({
              where: {
                id: data.patientId
              },
              attributes: ["fcmToken"]
            });
          case 5:
            patientRecord = _context11.v;
            if (patientRecord && patientRecord.fcmToken) {
              sendPushNotification(patientRecord.fcmToken, "Thanh toán thành công", "L\u1ECBch h\u1EB9n kh\xE1m c\u1EE7a b\u1EA1n (M\xE3: BOOKING".concat(appointment.id, ") \u0111\xE3 \u0111\u01B0\u1EE3c thanh to\xE1n th\xE0nh c\xF4ng s\u1ED1 ti\u1EC1n ").concat(data.totalPrice, " VN\u0110."), {
                bookingId: String(appointment.id),
                status: "paid"
              });
            }
          case 6:
            dataSend = {
              reciverEmail: data.email,
              patientName: data.patientName,
              amount: data.totalPrice,
              time: data.date,
              language: "vi"
            };
            _context11.n = 7;
            return _emailServices["default"].sendEmailPaymentSuccess(dataSend);
          case 7:
            resolve({
              errCode: 0,
              errMessage: "Send remedy succeed!"
            });
          case 8:
            _context11.n = 10;
            break;
          case 9:
            _context11.p = 9;
            _t12 = _context11.v;
            reject(_t12);
          case 10:
            return _context11.a(2);
        }
      }, _callee11, null, [[0, 9]]);
    }));
    return function (_x22, _x23) {
      return _ref12.apply(this, arguments);
    };
  }());
};
var API_KEY = "AK_CS.847d23a062bd11f0b2ed09df87a53c97.WNGep6eCqDZZ8uteyJpi2cNGZrRNUzS37pnVMek7H8oxhcPOMnPM1w3wSTH5ItDzBusmpL0W";
var API_GET_PAID = "https://oauth.casso.vn/v2/transactions";
var getListGDPR = function getListGDPR() {
  return new Promise(/*#__PURE__*/function () {
    var _ref13 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee12(resolve, reject) {
      var response, data, _t13;
      return _regenerator().w(function (_context12) {
        while (1) switch (_context12.p = _context12.n) {
          case 0:
            _context12.p = 0;
            _context12.n = 1;
            return (0, _nodeFetch["default"])(API_GET_PAID, {
              headers: {
                Authorization: "apikey ".concat(API_KEY),
                "Content-Type": "application/json"
              }
            });
          case 1:
            response = _context12.v;
            _context12.n = 2;
            return response.json();
          case 2:
            data = _context12.v;
            resolve({
              errCode: 0,
              data: data.data.records
            });
            _context12.n = 4;
            break;
          case 3:
            _context12.p = 3;
            _t13 = _context12.v;
            _inspector.console.error("Error fetching GDPR data:", _t13);
            resolve({
              errCode: 1,
              errMessage: "Failed to fetch GDPR data"
            });
          case 4:
            return _context12.a(2);
        }
      }, _callee12, null, [[0, 3]]);
    }));
    return function (_x24, _x25) {
      return _ref13.apply(this, arguments);
    };
  }());
};
var updateBookingPaymentStatus = /*#__PURE__*/function () {
  var _ref14 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee13(bookingId, amount, transactionDateTime, io) {
    var booking, _patient, dataSend, onlineUsers, notificationData, cashiers, patient, _t14;
    return _regenerator().w(function (_context13) {
      while (1) switch (_context13.p = _context13.n) {
        case 0:
          _context13.n = 1;
          return _models["default"].Booking.findOne({
            where: {
              id: bookingId
            },
            include: [{
              model: _models["default"].User,
              as: "patientData",
              attributes: ["id", "email", "firstName", "fcmToken"]
            }],
            raw: false
          });
        case 1:
          booking = _context13.v;
          if (!booking) {
            _context13.n = 6;
            break;
          }
          booking.statusId = "S5";
          _context13.n = 2;
          return booking.save();
        case 2:
          _context13.p = 2;
          _patient = booking.patientData;
          dataSend = {
            reciverEmail: _patient.email,
            patientName: _patient.firstName,
            amount: amount,
            time: transactionDateTime,
            language: "vi"
          };
          _context13.n = 3;
          return _emailServices["default"].sendEmailPaymentSuccess(dataSend);
        case 3:
          _context13.n = 5;
          break;
        case 4:
          _context13.p = 4;
          _t14 = _context13.v;
          _inspector.console.error("Gửi email xác nhận thanh toán thất bại:", _t14);
        case 5:
          // Emit PAYMENT_CONFIRMED to cashier and patient
          onlineUsers = getOnlineUsers();
          notificationData = {
            bookingId: bookingId,
            patientName: booking.patientData ? booking.patientData.firstName : "",
            amount: amount,
            transactionDateTime: transactionDateTime,
            doctorId: booking.doctorId
          };
          cashiers = onlineUsers.filter(function (user) {
            return user.roleId === "R4";
          });
          patient = onlineUsers.find(function (user) {
            return user.id === (booking.patientData ? booking.patientData.id : null);
          });
          cashiers.forEach(function (cashier) {
            if (io) {
              io.to(cashier.socketId).emit("PAYMENT_CONFIRMED", _objectSpread(_objectSpread({}, notificationData), {}, {
                role: "cashier"
              }));
            }
          });
          if (patient && io) {
            io.to(patient.socketId).emit("PAYMENT_CONFIRMED", _objectSpread(_objectSpread({}, notificationData), {}, {
              role: "patient"
            }));
          }
          if (booking.patientData && booking.patientData.fcmToken) {
            sendPushNotification(booking.patientData.fcmToken, "Thanh toán thành công", "L\u1ECBch h\u1EB9n kh\xE1m c\u1EE7a b\u1EA1n (M\xE3: BOOKING".concat(bookingId, ") \u0111\xE3 \u0111\u01B0\u1EE3c thanh to\xE1n th\xE0nh c\xF4ng s\u1ED1 ti\u1EC1n ").concat(amount, " VN\u0110."), {
              bookingId: String(bookingId),
              status: "paid"
            });
          }
          return _context13.a(2, true);
        case 6:
          return _context13.a(2, false);
      }
    }, _callee13, null, [[2, 4]]);
  }));
  return function updateBookingPaymentStatus(_x26, _x27, _x28, _x29) {
    return _ref14.apply(this, arguments);
  };
}();

// Get all payment and update booking status (Hỗ trợ PayOS và Casso Webhook)
var postConfirmPayment = function postConfirmPayment(inputData, io) {
  return new Promise(/*#__PURE__*/function () {
    var _ref15 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee14(resolve, reject) {
      var paymentData, description, match, bookingId, amount, transactionDateTime, success, _t15, _t16;
      return _regenerator().w(function (_context14) {
        while (1) switch (_context14.p = _context14.n) {
          case 0:
            _context14.p = 0;
            paymentData = null; // 1. Nếu là webhook từ PayOS có kèm signature
            if (!(inputData && inputData.signature && payOS)) {
              _context14.n = 5;
              break;
            }
            _context14.p = 1;
            _context14.n = 2;
            return payOS.webhooks.verify(inputData);
          case 2:
            paymentData = _context14.v;
            _inspector.console.log("✅ PayOS webhook verified successfully:", paymentData);
            _context14.n = 4;
            break;
          case 3:
            _context14.p = 3;
            _t15 = _context14.v;
            _inspector.console.warn("⚠️ PayOS webhook signature verification failed:", _t15.message);
            paymentData = inputData.data || inputData;
          case 4:
            _context14.n = 6;
            break;
          case 5:
            if (inputData && inputData.data) {
              // 2. Format tiêu chuẩn: inputData.data (PayOS hoặc Casso)
              paymentData = inputData.data;
            } else {
              paymentData = inputData;
            }
          case 6:
            if (!(paymentData && (paymentData.description === "test" || paymentData.orderCode === 123 || paymentData.isTest))) {
              _context14.n = 7;
              break;
            }
            return _context14.a(2, resolve({
              error: 0,
              errCode: 0,
              message: "PayOS test webhook received successfully"
            }));
          case 7:
            if (paymentData) {
              _context14.n = 8;
              break;
            }
            return _context14.a(2, resolve({
              error: 1,
              errCode: 1,
              message: "No payment data provided"
            }));
          case 8:
            description = paymentData.description || "";
            match = description.match(/BOOKING([a-zA-Z0-9]+)/i);
            if (match) {
              _context14.n = 9;
              break;
            }
            _inspector.console.warn("Không tìm thấy bookingId trong description:", description);
            return _context14.a(2, resolve({
              error: 0,
              errCode: 0,
              message: "Webhook processed (no matching booking pattern)"
            }));
          case 9:
            bookingId = match[1];
            amount = paymentData.amount;
            transactionDateTime = paymentData.transactionDateTime || new Date().toISOString();
            _context14.n = 10;
            return updateBookingPaymentStatus(bookingId, amount, transactionDateTime, io);
          case 10:
            success = _context14.v;
            if (!success) {
              _context14.n = 11;
              break;
            }
            return _context14.a(2, resolve({
              error: 0,
              errCode: 0,
              errMessage: "Payment confirmed and booking updated successfully",
              message: "Success"
            }));
          case 11:
            return _context14.a(2, resolve({
              error: 0,
              errCode: 2,
              errMessage: "Booking ".concat(bookingId, " not found")
            }));
          case 12:
            _context14.n = 14;
            break;
          case 13:
            _context14.p = 13;
            _t16 = _context14.v;
            _inspector.console.error("Lỗi xử lý webhook payment:", _t16);
            reject(_t16);
          case 14:
            return _context14.a(2);
        }
      }, _callee14, null, [[1, 3], [0, 13]]);
    }));
    return function (_x30, _x31) {
      return _ref15.apply(this, arguments);
    };
  }());
};

// Create PayOS Payment Link
var createPayOSPaymentLink = function createPayOSPaymentLink(data) {
  return new Promise(/*#__PURE__*/function () {
    var _ref16 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee15(resolve, reject) {
      var bookingId, amount, description, orderCode, desc, returnUrl, cancelUrl, paymentBody, paymentLinkRes, _t17;
      return _regenerator().w(function (_context15) {
        while (1) switch (_context15.p = _context15.n) {
          case 0:
            _context15.p = 0;
            if (payOS) {
              _context15.n = 1;
              break;
            }
            return _context15.a(2, resolve({
              errCode: -1,
              errMessage: "PayOS chưa được cấu hình Client ID, API Key hoặc Checksum Key trong file .env"
            }));
          case 1:
            if (!(!data.bookingId || !data.amount)) {
              _context15.n = 2;
              break;
            }
            return _context15.a(2, resolve({
              errCode: 1,
              errMessage: "Missing required parameters: bookingId or amount"
            }));
          case 2:
            bookingId = data.bookingId, amount = data.amount, description = data.description; // orderCode must be a number <= 9007199254740991
            orderCode = Number(String(Date.now()).slice(-6) + Math.floor(1000 + Math.random() * 9000));
            desc = (description || "BOOKING".concat(bookingId)).slice(0, 25);
            returnUrl = data.returnUrl || "".concat(process.env.URL_REACT || "http://localhost:3000", "/payment-success");
            cancelUrl = data.cancelUrl || "".concat(process.env.URL_REACT || "http://localhost:3000", "/payment-cancel");
            paymentBody = {
              orderCode: orderCode,
              amount: Number(amount) || 10000,
              description: desc,
              cancelUrl: cancelUrl,
              returnUrl: returnUrl
            };
            _context15.n = 3;
            return payOS.paymentRequests.create(paymentBody);
          case 3:
            paymentLinkRes = _context15.v;
            resolve({
              errCode: 0,
              errMessage: "Create payment link succeed",
              checkoutUrl: paymentLinkRes.checkoutUrl,
              qrCode: paymentLinkRes.qrCode,
              data: paymentLinkRes
            });
            _context15.n = 5;
            break;
          case 4:
            _context15.p = 4;
            _t17 = _context15.v;
            _inspector.console.error("Lỗi tạo link thanh toán PayOS:", _t17);
            resolve({
              errCode: 1,
              errMessage: _t17.message || "Tạo link thanh toán thất bại"
            });
          case 5:
            return _context15.a(2);
        }
      }, _callee15, null, [[0, 4]]);
    }));
    return function (_x32, _x33) {
      return _ref16.apply(this, arguments);
    };
  }());
};

// Handle PayOS Webhook
var handlePayOSWebhook = function handlePayOSWebhook(webhookBody, io) {
  return new Promise(/*#__PURE__*/function () {
    var _ref17 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee16(resolve, reject) {
      var verifiedData, description, match, bookingId, success, _t18, _t19;
      return _regenerator().w(function (_context16) {
        while (1) switch (_context16.p = _context16.n) {
          case 0:
            _context16.p = 0;
            if (webhookBody) {
              _context16.n = 1;
              break;
            }
            resolve({
              errCode: 1,
              errMessage: "Missing webhook data"
            });
            return _context16.a(2);
          case 1:
            if (payOS) {
              _context16.n = 2;
              break;
            }
            resolve({
              errCode: -1,
              errMessage: "PayOS is not initialized"
            });
            return _context16.a(2);
          case 2:
            verifiedData = null;
            _context16.p = 3;
            _context16.n = 4;
            return payOS.webhooks.verify(webhookBody);
          case 4:
            verifiedData = _context16.v;
            _context16.n = 6;
            break;
          case 5:
            _context16.p = 5;
            _t18 = _context16.v;
            _inspector.console.warn("⚠️ PayOS webhook signature verification failed:", _t18.message);
            verifiedData = webhookBody.data || webhookBody;
          case 6:
            if (!(verifiedData && (verifiedData.description === "test" || verifiedData.orderCode === 123 || verifiedData.isTest))) {
              _context16.n = 7;
              break;
            }
            return _context16.a(2, resolve({
              error: 0,
              errCode: 0,
              message: "PayOS test webhook received successfully"
            }));
          case 7:
            if (!(verifiedData.desc === "success" || verifiedData.success === true || verifiedData.code === "00")) {
              _context16.n = 10;
              break;
            }
            description = verifiedData.description || "";
            match = description.match(/BOOKING([a-zA-Z0-9]+)/i);
            if (match) {
              _context16.n = 8;
              break;
            }
            resolve({
              errCode: 2,
              errMessage: "No bookingId found in description"
            });
            return _context16.a(2);
          case 8:
            bookingId = match[1];
            _context16.n = 9;
            return updateBookingPaymentStatus(bookingId, verifiedData.amount, verifiedData.transactionDateTime || new Date().toISOString(), io);
          case 9:
            success = _context16.v;
            if (success) {
              resolve({
                error: 0,
                errCode: 0,
                errMessage: "PayOS payment verified and booking updated successfully",
                message: "Success"
              });
            } else {
              resolve({
                errCode: 3,
                errMessage: "Booking not found"
              });
            }
            _context16.n = 11;
            break;
          case 10:
            resolve({
              errCode: 4,
              errMessage: "Transaction was not successful"
            });
          case 11:
            _context16.n = 13;
            break;
          case 12:
            _context16.p = 12;
            _t19 = _context16.v;
            _inspector.console.error("Lỗi Webhook PayOS:", _t19);
            reject(_t19);
          case 13:
            return _context16.a(2);
        }
      }, _callee16, null, [[3, 5], [0, 12]]);
    }));
    return function (_x34, _x35) {
      return _ref17.apply(this, arguments);
    };
  }());
};
module.exports = {
  getTopDoctorHomeServices: getTopDoctorHomeServices,
  getAllDoctorServices: getAllDoctorServices,
  saveDetailInforDoctor: saveDetailInforDoctor,
  getDetailDoctorByIdServices: getDetailDoctorByIdServices,
  bulkCreateScheduleServices: bulkCreateScheduleServices,
  getScheduleDoctorByDateServices: getScheduleDoctorByDateServices,
  getExtraDoctorInforByIdServices: getExtraDoctorInforByIdServices,
  getProfileDoctorByIdServices: getProfileDoctorByIdServices,
  getListPatientForDoctor: getListPatientForDoctor,
  sendRemedyService: sendRemedyService,
  getListGDPR: getListGDPR,
  postConfirmPayment: postConfirmPayment,
  postMedicalAppointmentStatus: postMedicalAppointmentStatus,
  sendPayment: sendPayment,
  createPayOSPaymentLink: createPayOSPaymentLink,
  handlePayOSWebhook: handlePayOSWebhook,
  getPrescriptionPDFBase64: getPrescriptionPDFBase64
};