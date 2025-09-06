"use strict";

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
var db = require("../models");
var checkRequiredFields = function checkRequiredFields(inputData) {
  var arrFields = ["action", "title", "authors", "reviewers", "published", "updated", "category", "imageBase64", "contentHTML", "contentMarkdown"];
  var isValid = true;
  var element = "";
  for (var i = 0; i < arrFields.length; i++) {
    var field = arrFields[i];
    var value = inputData[field];

    // check riêng cho reviewers (mảng)
    if (field === "reviewers" || field === "authors") {
      if (!Array.isArray(value) || value.length === 0) {
        isValid = false;
        element = field;
        break;
      }
    } else {
      if (!value || value.toString().trim() === "") {
        isValid = false;
        element = field;
        break;
      }
    }
  }
  return {
    isValid: isValid,
    element: element
  };
};
var createHandBook = function createHandBook(inputData) {
  return new Promise(/*#__PURE__*/function () {
    var _ref = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(resolve, reject) {
      var checkObj, handbookData, handbook, handbook_translations, handbookMarkdown, _t;
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
            return db.HandBook.create({
              image: inputData.imageBase64,
              authors: Array.isArray(inputData.authors) ? JSON.stringify(inputData.authors) : inputData.authors || "",
              reviewers: Array.isArray(inputData.reviewers) ? JSON.stringify(inputData.reviewers) : inputData.reviewers || "",
              published: inputData.published || new Date().toISOString().split("T")[0],
              updated: inputData.updated || new Date().toISOString().split("T")[0],
              views: inputData.views || 0,
              category: inputData.category || "Cẩm nang"
            });
          case 2:
            handbookData = _context.v;
            _context.n = 3;
            return db.HandBook_Translation.create({
              handbookId: handbookData.id,
              title: inputData.title,
              lang: inputData.lang
            });
          case 3:
            _context.n = 4;
            return db.Markdown.create({
              handbookId: handbookData.id,
              contentHTML: inputData.contentHTML,
              contentMarkdown: inputData.contentMarkdown,
              lang: inputData.lang
            });
          case 4:
            return _context.a(2, resolve({
              errCode: 0,
              errMessage: "Tạo cẩm nang thành công"
            }));
          case 5:
            if (!(inputData.action === "UPDATE")) {
              _context.n = 17;
              break;
            }
            _context.n = 6;
            return db.HandBook.findOne({
              where: {
                id: inputData.handbookId
              },
              raw: false
            });
          case 6:
            handbook = _context.v;
            if (handbook) {
              _context.n = 7;
              break;
            }
            return _context.a(2, resolve({
              errCode: 2,
              errMessage: "Không tìm thấy cẩm nang để cập nhật"
            }));
          case 7:
            handbook.authors = Array.isArray(inputData.authors) ? JSON.stringify(inputData.authors) : inputData.authors || "";
            handbook.image = inputData.imageBase64;
            handbook.reviewers = Array.isArray(inputData.reviewers) ? JSON.stringify(inputData.reviewers) : inputData.reviewers || "";
            handbook.published = inputData.published;
            handbook.updated = inputData.updated;
            handbook.category = inputData.category;
            _context.n = 8;
            return handbook.save();
          case 8:
            _context.n = 9;
            return db.HandBook_Translation.findOne({
              where: {
                handbookId: inputData.handbookId,
                lang: inputData.lang
              },
              raw: false
            });
          case 9:
            handbook_translations = _context.v;
            if (!handbook_translations) {
              _context.n = 11;
              break;
            }
            console.log("handbook_translations", handbook_translations);
            handbook_translations.handbookId = inputData.handbookId;
            handbook_translations.title = inputData.title;
            handbook_translations.lang = inputData.lang;
            _context.n = 10;
            return handbook_translations.save();
          case 10:
            _context.n = 12;
            break;
          case 11:
            console.log("handbook_translations chua co");
            // Nếu chưa có HandBook_Translation thì tạo mới
            _context.n = 12;
            return db.HandBook_Translation.create({
              handbookId: handbook.id,
              title: inputData.title,
              lang: inputData.lang
            });
          case 12:
            _context.n = 13;
            return db.Markdown.findOne({
              where: {
                handbookId: inputData.handbookId,
                lang: inputData.lang
              },
              raw: false
            });
          case 13:
            handbookMarkdown = _context.v;
            if (!handbookMarkdown) {
              _context.n = 15;
              break;
            }
            handbookMarkdown.contentHTML = inputData.contentHTML;
            handbookMarkdown.contentMarkdown = inputData.contentMarkdown;
            handbookMarkdown.lang = inputData.lang;
            handbookMarkdown.updatedAt = new Date();
            _context.n = 14;
            return handbookMarkdown.save();
          case 14:
            _context.n = 16;
            break;
          case 15:
            _context.n = 16;
            return db.Markdown.create({
              handbookId: handbook.id,
              contentHTML: inputData.contentHTML,
              contentMarkdown: inputData.contentMarkdown,
              lang: inputData.lang
            });
          case 16:
            return _context.a(2, resolve({
              errCode: 0,
              errMessage: "Cập nhật cẩm nang thành công"
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
var getAllHandBook = function getAllHandBook(lang) {
  return new Promise(/*#__PURE__*/function () {
    var _ref2 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2(resolve, reject) {
      var data, _t2;
      return _regenerator().w(function (_context2) {
        while (1) switch (_context2.p = _context2.n) {
          case 0:
            _context2.p = 0;
            _context2.n = 1;
            return db.HandBook.findAll({
              attributes: ["id", "image", "published", "updated", "views", "category", "authors"],
              include: [{
                model: db.HandBook_Translation,
                where: {
                  lang: lang
                },
                attributes: {
                  exclude: ["id"]
                },
                as: "handbookData",
                required: false
              }, {
                model: db.Markdown,
                where: {
                  lang: lang
                },
                attributes: ["contentHTML", "contentMarkdown"],
                as: "handbookMarkdown",
                require: false
              }],
              order: [["createdAt", "DESC"]],
              raw: false
            });
          case 1:
            data = _context2.v;
            if (data && data.length > 0) {
              data.map(function (item) {
                if (item.image) {
                  item.image = new Buffer(item.image, "base64").toString("binary");
                }
                return item;
              });
            }
            resolve({
              errMessage: "Lấy tất cả cẩm nang",
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
var getDetailHandBookById = function getDetailHandBookById(id, lang) {
  return new Promise(/*#__PURE__*/function () {
    var _ref3 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3(resolve, reject) {
      var handbook, _t3;
      return _regenerator().w(function (_context3) {
        while (1) switch (_context3.p = _context3.n) {
          case 0:
            _context3.p = 0;
            if (!id || !lang) {
              resolve({
                errCode: 1,
                errMessage: "Missing parameter"
              });
            }
            _context3.n = 1;
            return db.HandBook.findOne({
              where: {
                id: id
              },
              attributes: ["id", "image", "authors", "reviewers", "published", "updated", "views", "category", "createdAt", "updatedAt"],
              include: [{
                model: db.HandBook_Translation,
                where: {
                  handbookId: id,
                  lang: lang
                },
                attributes: {
                  exclude: ["id"] // bỏ cột id
                },
                as: "handbookData",
                required: false
              }, {
                model: db.Markdown,
                where: {
                  handbookId: id,
                  lang: lang
                },
                attributes: ["contentHTML", "contentMarkdown"],
                as: "handbookMarkdown",
                required: false
              }],
              raw: true,
              nest: true
            });
          case 1:
            handbook = _context3.v;
            if (!handbook) {
              _context3.n = 3;
              break;
            }
            // Convert image from base64
            if (handbook.image) {
              handbook.image = new Buffer(handbook.image, "base64").toString("binary");
            }
            // Parse authors and reviewers as arrays if they're stored as JSON strings
            try {
              if (handbook.authors) {
                handbook.authors = JSON.parse(handbook.authors);
              } else {
                handbook.authors = ["BookingCare Team"];
              }
            } catch (e) {
              handbook.authors = handbook.authors ? [handbook.authors] : ["BookingCare Team"];
            }
            try {
              if (handbook.reviewers) {
                handbook.reviewers = JSON.parse(handbook.reviewers);
              } else {
                handbook.reviewers = [];
              }
            } catch (e) {
              handbook.reviewers = handbook.reviewers ? [handbook.reviewers] : [];
            }

            // Increment view count
            _context3.n = 2;
            return db.HandBook.increment("views", {
              where: {
                id: id
              }
            });
          case 2:
            resolve({
              errCode: 0,
              errMessage: "ok",
              data: handbook
            });
            _context3.n = 4;
            break;
          case 3:
            resolve({
              errCode: 2,
              errMessage: "Handbook not found"
            });
          case 4:
            _context3.n = 6;
            break;
          case 5:
            _context3.p = 5;
            _t3 = _context3.v;
            reject(_t3);
          case 6:
            return _context3.a(2);
        }
      }, _callee3, null, [[0, 5]]);
    }));
    return function (_x5, _x6) {
      return _ref3.apply(this, arguments);
    };
  }());
};
var getRelatedHandBooks = function getRelatedHandBooks(currentId) {
  var limit = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 4;
  var lang = arguments.length > 2 ? arguments[2] : undefined;
  return new Promise(/*#__PURE__*/function () {
    var _ref4 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4(resolve, reject) {
      var data, _t4;
      return _regenerator().w(function (_context4) {
        while (1) switch (_context4.p = _context4.n) {
          case 0:
            _context4.p = 0;
            _context4.n = 1;
            return db.HandBook.findAll({
              where: {
                id: _defineProperty({}, db.Sequelize.Op.ne, currentId)
              },
              attributes: ["id", "image", "published", "updated", "views", "category", "authors"],
              include: [{
                model: db.HandBook_Translation,
                where: {
                  handbookId: currentId,
                  lang: lang
                },
                attributes: {
                  exclude: ["id"] // bỏ cột id
                },
                as: "handbookData",
                required: false
              }],
              order: [["views", "DESC"], ["createdAt", "DESC"]],
              limit: limit,
              raw: true,
              nest: true
            });
          case 1:
            data = _context4.v;
            if (data && data.length > 0) {
              data.map(function (item) {
                if (item.image) {
                  item.image = new Buffer(item.image, "base64").toString("binary");
                }
                return item;
              });
            }

            //console.log("Related handbooks:", data);

            resolve({
              errMessage: "ok",
              errCode: 0,
              data: data
            });
            _context4.n = 3;
            break;
          case 2:
            _context4.p = 2;
            _t4 = _context4.v;
            reject(_t4);
          case 3:
            return _context4.a(2);
        }
      }, _callee4, null, [[0, 2]]);
    }));
    return function (_x7, _x8) {
      return _ref4.apply(this, arguments);
    };
  }());
};
module.exports = {
  createHandBook: createHandBook,
  getAllHandBook: getAllHandBook,
  getDetailHandBookById: getDetailHandBookById,
  getRelatedHandBooks: getRelatedHandBooks
};