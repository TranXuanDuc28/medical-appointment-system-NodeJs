"use strict";

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
var _sequelize = require("sequelize");
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
var db = require("../models");
var saveMsg = function saveMsg(data) {
  return new Promise(/*#__PURE__*/function () {
    var _ref = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(resolve, reject) {
      var savedMsg, senderUser, receiverUser, senderImage, receiverImage, result, _t;
      return _regenerator().w(function (_context) {
        while (1) switch (_context.p = _context.n) {
          case 0:
            _context.p = 0;
            if (!(!data.sender || !data.receiver)) {
              _context.n = 1;
              break;
            }
            resolve({
              errCode: 1,
              errMessage: "Missing parameter"
            });
            _context.n = 5;
            break;
          case 1:
            _context.n = 2;
            return db.Message.create({
              msg: data.msg,
              sender_id: data.sender.id,
              sender_name: data.sender.lastName,
              sender_email: data.sender.email,
              receiver_id: data.receiver._id || data.receiver.id,
              receiver_name: data.receiver.lastName,
              receiver_email: data.receiver.email,
              file_url: data.file_url || null,
              file_type: data.file_type || null,
              file_name: data.file_name || null
            });
          case 2:
            savedMsg = _context.v;
            _context.n = 3;
            return db.User.findOne({
              where: {
                id: savedMsg.sender_id
              }
            });
          case 3:
            senderUser = _context.v;
            _context.n = 4;
            return db.User.findOne({
              where: {
                id: savedMsg.receiver_id
              }
            });
          case 4:
            receiverUser = _context.v;
            senderImage = senderUser !== null && senderUser !== void 0 && senderUser.image ? Buffer.from(senderUser.image, "base64").toString("binary") : null;
            receiverImage = receiverUser !== null && receiverUser !== void 0 && receiverUser.image ? Buffer.from(receiverUser.image, "base64").toString("binary") : null;
            result = {
              id: savedMsg.id,
              msg: savedMsg.msg,
              sender: {
                id: savedMsg.sender_id,
                name: savedMsg.sender_name,
                email: savedMsg.sender_email,
                image: senderImage
              },
              receiver: {
                id: savedMsg.receiver_id,
                name: savedMsg.receiver_name,
                email: savedMsg.receiver_email,
                image: receiverImage
              },
              file_url: savedMsg.file_url,
              file_type: savedMsg.file_type,
              file_name: savedMsg.file_name,
              createdAt: savedMsg.createdAt,
              updatedAt: savedMsg.updatedAt
            };
            resolve({
              errCode: 0,
              errMesssage: "Save Message Succesfull",
              data: result
            });
          case 5:
            _context.n = 7;
            break;
          case 6:
            _context.p = 6;
            _t = _context.v;
            reject(_t);
          case 7:
            return _context.a(2);
        }
      }, _callee, null, [[0, 6]]);
    }));
    return function (_x, _x2) {
      return _ref.apply(this, arguments);
    };
  }());
};
var getMsg = function getMsg(id, userId, offset) {
  return new Promise(/*#__PURE__*/function () {
    var _ref2 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3(resolve, reject) {
      var allMsg, result, _t2;
      return _regenerator().w(function (_context3) {
        while (1) switch (_context3.p = _context3.n) {
          case 0:
            _context3.p = 0;
            if (!(!id || !userId)) {
              _context3.n = 1;
              break;
            }
            return _context3.a(2, resolve({
              errCode: 1,
              errMessage: "Missing parameter",
              data: []
            }));
          case 1:
            _context3.n = 2;
            return db.Message.findAll({
              where: _defineProperty({}, _sequelize.Op.or, [{
                sender_id: id,
                receiver_id: userId
              }, {
                sender_id: userId,
                receiver_id: id
              }]),
              order: [["createdAt", "DESC"]],
              limit: 10,
              offset: offset
            });
          case 2:
            allMsg = _context3.v;
            _context3.n = 3;
            return Promise.all((allMsg || []).reverse().map(/*#__PURE__*/function () {
              var _ref3 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2(savedMsg) {
                var senderUser, receiverUser, senderImage, receiverImage;
                return _regenerator().w(function (_context2) {
                  while (1) switch (_context2.n) {
                    case 0:
                      _context2.n = 1;
                      return db.User.findOne({
                        where: {
                          id: savedMsg.sender_id
                        }
                      });
                    case 1:
                      senderUser = _context2.v;
                      _context2.n = 2;
                      return db.User.findOne({
                        where: {
                          id: savedMsg.receiver_id
                        }
                      });
                    case 2:
                      receiverUser = _context2.v;
                      senderImage = senderUser !== null && senderUser !== void 0 && senderUser.image ? Buffer.from(senderUser.image, "base64").toString("binary") : null;
                      receiverImage = receiverUser !== null && receiverUser !== void 0 && receiverUser.image ? Buffer.from(receiverUser.image, "base64").toString("binary") : null;
                      return _context2.a(2, {
                        id: savedMsg.id,
                        msg: savedMsg.msg,
                        sender: {
                          id: savedMsg.sender_id,
                          name: savedMsg.sender_name,
                          email: savedMsg.sender_email,
                          image: senderImage
                        },
                        receiver: {
                          id: savedMsg.receiver_id,
                          name: savedMsg.receiver_name,
                          email: savedMsg.receiver_email,
                          image: receiverImage
                        },
                        file_url: savedMsg.file_url,
                        file_type: savedMsg.file_type,
                        file_name: savedMsg.file_name,
                        createdAt: savedMsg.createdAt,
                        updatedAt: savedMsg.updatedAt
                      });
                  }
                }, _callee2);
              }));
              return function (_x5) {
                return _ref3.apply(this, arguments);
              };
            }()));
          case 3:
            result = _context3.v;
            // Trả kết quả, dù rỗng
            resolve({
              errCode: 0,
              errMessage: "Fetched messages successfully",
              data: result
            });
            _context3.n = 5;
            break;
          case 4:
            _context3.p = 4;
            _t2 = _context3.v;
            console.error("Error in getMsg:", _t2);
            reject({
              errCode: -1,
              errMessage: "Internal server error",
              data: []
            });
          case 5:
            return _context3.a(2);
        }
      }, _callee3, null, [[0, 4]]);
    }));
    return function (_x3, _x4) {
      return _ref2.apply(this, arguments);
    };
  }());
};
var delMsg = function delMsg(_ref4) {
  var msgId = _ref4.msgId,
    userId = _ref4.userId;
  return new Promise(/*#__PURE__*/function () {
    var _ref5 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4(resolve, reject) {
      var msg, _t3;
      return _regenerator().w(function (_context4) {
        while (1) switch (_context4.p = _context4.n) {
          case 0:
            _context4.p = 0;
            if (msgId) {
              _context4.n = 1;
              break;
            }
            console.log("1");
            resolve({
              errCode: 1,
              errMessage: "Missing parameter"
            });
            _context4.n = 6;
            break;
          case 1:
            _context4.n = 2;
            return db.Message.findOne({
              where: {
                id: msgId
              },
              raw: false
            });
          case 2:
            msg = _context4.v;
            console.log("msg", msg);
            if (msg) {
              _context4.n = 3;
              break;
            }
            console.log("2");
            resolve({
              errCode: 2,
              errMessage: "Message not found"
            });
            _context4.n = 6;
            break;
          case 3:
            if (!(msg.sender_id != userId)) {
              _context4.n = 4;
              break;
            }
            console.log("3", msg.senderId, userId);
            return _context4.a(2, {
              errCode: 3,
              errMessage: "Unauthorized to delete this message"
            });
          case 4:
            _context4.n = 5;
            return msg.destroy();
          case 5:
            // // Lấy thông tin hình ảnh của sender và receiver
            // const senderUser = await db.User.findOne({
            //   where: { id: msg.sender_id },
            // });
            // const receiverUser = await db.User.findOne({
            //   where: { id: msg.receiver_id },
            // });
            // const senderImage = senderUser?.image
            //   ? Buffer.from(senderUser.image, "base64").toString("binary")
            //   : null;
            // const receiverImage = receiverUser?.image
            //   ? Buffer.from(receiverUser.image, "base64").toString("binary")
            //   : null;

            // let msgData = {
            //   id: msg.id,
            //   msg: msg.msg,
            //   sender: {
            //     id: msg.sender_id,
            //     name: msg.sender_name,
            //     email: msg.sender_email,
            //     image: senderImage,
            //   },
            //   receiver: {
            //     id: msg.receiver_id,
            //     name: msg.receiver_name,
            //     email: msg.receiver_email,
            //     image: receiverImage,
            //   },
            //   createdAt: msg.createdAt,
            //   updatedAt: msg.updatedAt,
            // };

            resolve({
              errMessage: "delMsg",
              errCode: 0
              // data: msgData,
            });
          case 6:
            _context4.n = 8;
            break;
          case 7:
            _context4.p = 7;
            _t3 = _context4.v;
            reject(_t3);
          case 8:
            return _context4.a(2);
        }
      }, _callee4, null, [[0, 7]]);
    }));
    return function (_x6, _x7) {
      return _ref5.apply(this, arguments);
    };
  }());
};
module.exports = {
  saveMsg: saveMsg,
  getMsg: getMsg,
  delMsg: delMsg
};