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
var db = require("../models");
var checkRequiredFields = function checkRequiredFields(inputData) {
  var arrFields = ["action", "imageBase64", "contentHTML", "contentMarkdown", "lang"];
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
var createSpecialty = function createSpecialty(inputData) {
  return new Promise(/*#__PURE__*/function () {
    var _ref = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(resolve, reject) {
      var checkObj, specialtyData, _specialtyData, specialty_translations, specialtyMarkdown, _t;
      return _regenerator().w(function (_context) {
        while (1) switch (_context.p = _context.n) {
          case 0:
            _context.p = 0;
            checkObj = checkRequiredFields(inputData);
            if (checkObj.isValid) {
              _context.n = 1;
              break;
            }
            return _context.a(2, resolve({
              errCode: 1,
              errMessage: "Missing parameter: ".concat(checkObj.element)
            }));
          case 1:
            if (!(inputData.action === "CREATE")) {
              _context.n = 5;
              break;
            }
            _context.n = 2;
            return db.Specialty.create({
              image: inputData.imageBase64
            });
          case 2:
            specialtyData = _context.v;
            _context.n = 3;
            return db.Specialty_Translation.create({
              specialtyId: specialtyData.id,
              name: inputData.name,
              lang: inputData.lang
            });
          case 3:
            _context.n = 4;
            return db.Markdown.create({
              specialtyId: specialtyData.id,
              contentHTML: inputData.contentHTML,
              contentMarkdown: inputData.contentMarkdown,
              lang: inputData.lang
            });
          case 4:
            resolve({
              errCode: 0,
              errMesssage: "Tạo chuyên khoa thành công"
            });
          case 5:
            if (!(inputData.action === "UPDATE")) {
              _context.n = 17;
              break;
            }
            _context.n = 6;
            return db.Specialty.findOne({
              where: {
                id: inputData.specialtyId
              },
              raw: false
            });
          case 6:
            _specialtyData = _context.v;
            if (_specialtyData) {
              _context.n = 7;
              break;
            }
            return _context.a(2, resolve({
              errCode: 2,
              errMessage: "Không tìm thấy chuyên khoa để cập nhật"
            }));
          case 7:
            _specialtyData.image = inputData.imageBase64;
            _context.n = 8;
            return _specialtyData.save();
          case 8:
            _context.n = 9;
            return db.Specialty_Translation.findOne({
              where: {
                specialtyId: inputData.specialtyId,
                lang: inputData.lang
              },
              raw: false
            });
          case 9:
            specialty_translations = _context.v;
            if (!specialty_translations) {
              _context.n = 11;
              break;
            }
            specialty_translations.specialtyId = inputData.specialtyId;
            specialty_translations.name = inputData.name;
            specialty_translations.lang = inputData.lang;
            _context.n = 10;
            return specialty_translations.save();
          case 10:
            _context.n = 12;
            break;
          case 11:
            _context.n = 12;
            return db.Specialty_Translation.create({
              specialtyId: inputData.specialtyId,
              name: inputData.name,
              lang: inputData.lang
            });
          case 12:
            _context.n = 13;
            return db.Markdown.findOne({
              where: {
                specialtyId: inputData.specialtyId,
                lang: inputData.lang
              },
              raw: false
            });
          case 13:
            specialtyMarkdown = _context.v;
            if (!specialtyMarkdown) {
              _context.n = 15;
              break;
            }
            specialtyMarkdown.contentHTML = inputData.contentHTML;
            specialtyMarkdown.contentMarkdown = inputData.contentMarkdown;
            specialtyMarkdown.lang = inputData.lang;
            specialtyMarkdown.updatedAt = new Date();
            _context.n = 14;
            return specialtyMarkdown.save();
          case 14:
            _context.n = 16;
            break;
          case 15:
            _context.n = 16;
            return db.Markdown.create({
              specialtyId: inputData.specialtyId,
              contentHTML: inputData.contentHTML,
              contentMarkdown: inputData.contentMarkdown,
              lang: inputData.lang
            });
          case 16:
            return _context.a(2, resolve({
              errCode: 0,
              errMessage: "Cập nhật chuyên khoa thành công"
            }));
          case 17:
            return _context.a(2, resolve({
              errCode: 3,
              errMessage: "Hành động không hợp lệ"
            }));
          case 18:
            _context.p = 18;
            _t = _context.v;
            reject(_t);
          case 19:
            return _context.a(2);
        }
      }, _callee, null, [[0, 18]]);
    }));
    return function (_x, _x2) {
      return _ref.apply(this, arguments);
    };
  }());
};
var getAllSpecialty = function getAllSpecialty(lang) {
  return new Promise(/*#__PURE__*/function () {
    var _ref2 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2(resolve, reject) {
      var specialtyResult, data, _t2;
      return _regenerator().w(function (_context2) {
        while (1) switch (_context2.p = _context2.n) {
          case 0:
            _context2.p = 0;
            _context2.n = 1;
            return db.Specialty.findAll({
              include: [{
                model: db.Specialty_Translation,
                where: {
                  lang: lang
                },
                attributes: {
                  exclude: ["id"]
                },
                as: "specialtyData",
                required: false
              }, {
                model: db.Markdown,
                where: {
                  lang: lang
                },
                attributes: ["contentHTML", "contentMarkdown"],
                as: "specialtyMarkdown",
                require: false
              }],
              raw: true,
              nest: true
            });
          case 1:
            specialtyResult = _context2.v;
            // console.log("specialtyResult", specialtyResult);

            if (specialtyResult && specialtyResult.length > 0) {
              specialtyResult.map(function (item) {
                if (item.image) {
                  item.image = new Buffer(item.image, "base64").toString("binary");
                  return item;
                }
              });
            }
            data = specialtyResult.map(function (item) {
              return _objectSpread(_objectSpread({}, item), item.specialtyData);
            });
            resolve({
              errMessage: "Lấy tất cả chuyên khoa",
              errCode: 0,
              data: data
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
    return function (_x3, _x4) {
      return _ref2.apply(this, arguments);
    };
  }());
};
var getDetailSpecialtyById = function getDetailSpecialtyById(inputId, location, lang) {
  return new Promise(/*#__PURE__*/function () {
    var _ref3 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3(resolve, reject) {
      var data, _t3;
      return _regenerator().w(function (_context3) {
        while (1) switch (_context3.p = _context3.n) {
          case 0:
            _context3.p = 0;
            if (!(!inputId || !location || !lang)) {
              _context3.n = 1;
              break;
            }
            resolve({
              errCode: 1,
              errMessage: "Missing parameter"
            });
            _context3.n = 6;
            break;
          case 1:
            data = {};
            if (!(location === "ALL")) {
              _context3.n = 3;
              break;
            }
            _context3.n = 2;
            return db.Specialty.findOne({
              where: {
                id: inputId
              },
              attributes: ["image"],
              include: [{
                model: db.Specialty_Translation,
                where: {
                  specialtyId: inputId,
                  lang: lang
                },
                attributes: {
                  exclude: ["id"] // bỏ cột id
                },
                as: "specialtyData",
                required: false
              }, {
                model: db.Doctor_Infor,
                as: "doctorSpecialty",
                where: {
                  lang: lang
                },
                attributes: ["doctorId", "provinceId"]
              }, {
                model: db.Markdown,
                attributes: ["contentHTML", "contentMarkdown"],
                as: "specialtyMarkdown",
                where: {
                  specialtyId: inputId,
                  lang: lang
                },
                required: false
              }],
              raw: false
            });
          case 2:
            data = _context3.v;
            _context3.n = 5;
            break;
          case 3:
            _context3.n = 4;
            return db.Specialty.findOne({
              where: {
                id: inputId
              },
              attributes: ["image"],
              include: [{
                model: db.Specialty_Translation,
                where: {
                  specialtyId: inputId,
                  lang: lang
                },
                attributes: {
                  exclude: ["id"] // bỏ cột id
                },
                as: "specialtyData",
                required: false
              }, {
                model: db.Doctor_Infor,
                where: {
                  provinceId: location,
                  lang: lang
                },
                attributes: ["doctorId", "provinceId"],
                as: "doctorSpecialty",
                required: false
              }, {
                model: db.Markdown,
                attributes: ["contentHTML", "contentMarkdown"],
                as: "specialtyMarkdown",
                where: {
                  specialtyId: inputId,
                  lang: lang
                },
                required: false
              }],
              raw: true
            });
          case 4:
            data = _context3.v;
          case 5:
            if (data.image) {
              data.image = new Buffer.from(data.image, "base64").toString("binary");
            }

            //console.log("Duc data", data);
            resolve({
              errMessage: "ok",
              errCode: 0,
              data: data
            });
          case 6:
            _context3.n = 8;
            break;
          case 7:
            _context3.p = 7;
            _t3 = _context3.v;
            reject(_t3);
          case 8:
            return _context3.a(2);
        }
      }, _callee3, null, [[0, 7]]);
    }));
    return function (_x5, _x6) {
      return _ref3.apply(this, arguments);
    };
  }());
};
module.exports = {
  createSpecialty: createSpecialty,
  getAllSpecialty: getAllSpecialty,
  getDetailSpecialtyById: getDetailSpecialtyById
};