"use strict";

var _userServices = _interopRequireDefault(require("../services/userServices"));
var _JWTaction = _interopRequireDefault(require("../middleware/JWTaction"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { "default": e }; }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
var handleRegister = /*#__PURE__*/function () {
  var _ref = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(req, res) {
    var email, password, firstName, lastName, phoneNumber, userData;
    return _regenerator().w(function (_context) {
      while (1) switch (_context.n) {
        case 0:
          // ... existing code
          email = req.body.email;
          password = req.body.password;
          firstName = req.body.firstName;
          lastName = req.body.lastName;
          phoneNumber = req.body.phoneNumber;
          if (!(!email || !password || !firstName || !lastName || !phoneNumber)) {
            _context.n = 1;
            break;
          }
          return _context.a(2, res.status(500).json({
            errCode: 1,
            errMessage: "Chua co tham so dau vao!"
          }));
        case 1:
          _context.n = 2;
          return _userServices["default"].handleUserRegister(email, password, firstName, lastName, phoneNumber);
        case 2:
          userData = _context.v;
          return _context.a(2, res.status(200).json({
            errCode: userData.errCode,
            errMessage: userData.errMessage,
            users: userData.users ? userData.users : {}
          }));
      }
    }, _callee);
  }));
  return function handleRegister(_x, _x2) {
    return _ref.apply(this, arguments);
  };
}();
var handleLogin = /*#__PURE__*/function () {
  var _ref2 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2(req, res) {
    var email, password, userData, payload, token, refreshToken, cookieMaxAge, cookieRefreshMaxAge;
    return _regenerator().w(function (_context2) {
      while (1) switch (_context2.n) {
        case 0:
          email = req.body.email;
          password = req.body.password;
          if (!(!email || !password)) {
            _context2.n = 1;
            break;
          }
          return _context2.a(2, res.status(500).json({
            errCode: 1,
            errMessage: "Chua co tham so dau vao!"
          }));
        case 1:
          _context2.n = 2;
          return _userServices["default"].handleUserLogin(email, password);
        case 2:
          userData = _context2.v;
          if (userData && userData.errCode === 0) {
            payload = {
              email: userData.users.email,
              roles: userData.users.Group && userData.users.Group.Roles ? userData.users.Group.Roles : []
            };
            token = _JWTaction["default"].createJWT(payload);
            refreshToken = _JWTaction["default"].createRefreshToken(payload);
            cookieMaxAge = process.env.COOKIE_EXPIRES_IN && !isNaN(+process.env.COOKIE_EXPIRES_IN) ? +process.env.COOKIE_EXPIRES_IN : 86400000;
            cookieRefreshMaxAge = process.env.COOKIE_REFRESH_EXPIRES_IN && !isNaN(+process.env.COOKIE_REFRESH_EXPIRES_IN) ? +process.env.COOKIE_REFRESH_EXPIRES_IN : 86400000 * 7;
            if (token) {
              res.cookie("jwt", token, {
                httpOnly: true,
                maxAge: cookieMaxAge
              });
            }
            if (refreshToken) {
              res.cookie("refreshToken", refreshToken, {
                httpOnly: true,
                maxAge: cookieRefreshMaxAge
              });
            }
            userData.token = token;
            userData.refreshToken = refreshToken;
          }
          return _context2.a(2, res.status(200).json({
            errCode: userData.errCode,
            errMessage: userData.errMessage,
            users: userData.users ? userData.users : {},
            token: userData.token ? userData.token : ""
          }));
      }
    }, _callee2);
  }));
  return function handleLogin(_x3, _x4) {
    return _ref2.apply(this, arguments);
  };
}();
var handleLogout = function handleLogout(req, res) {
  res.clearCookie("jwt");
  res.clearCookie("refreshToken");
  return res.status(200).json({
    errCode: 0,
    message: "Clear cookie success!"
  });
};
var handlePatientChatLogin = /*#__PURE__*/function () {
  var _ref3 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3(req, res) {
    var email, password, userData, payload, token, refreshToken;
    return _regenerator().w(function (_context3) {
      while (1) switch (_context3.n) {
        case 0:
          email = req.body.email;
          password = req.body.password;
          if (!(!email || !password)) {
            _context3.n = 1;
            break;
          }
          return _context3.a(2, res.status(500).json({
            errCode: 1,
            errMessage: "Chua co tham so dau vao!"
          }));
        case 1:
          _context3.n = 2;
          return _userServices["default"].handlePatientChatLogin(email, password);
        case 2:
          userData = _context3.v;
          if (userData && userData.errCode === 0) {
            payload = {
              email: userData.users.email,
              roles: userData.users.Group && userData.users.Group.Roles ? userData.users.Group.Roles : []
            };
            token = _JWTaction["default"].createJWT(payload);
            refreshToken = _JWTaction["default"].createRefreshToken(payload);
            res.cookie("jwt", token, {
              httpOnly: true,
              maxAge: +process.env.COOKIE_EXPIRES_IN
            });
            res.cookie("refreshToken", refreshToken, {
              httpOnly: true,
              maxAge: +process.env.COOKIE_REFRESH_EXPIRES_IN
            });
            userData.token = token;
            userData.refreshToken = refreshToken;
          }
          return _context3.a(2, res.status(200).json({
            errCode: userData.errCode,
            errMessage: userData.errMessage,
            users: userData.users ? userData.users : {},
            token: userData.token ? userData.token : ""
          }));
      }
    }, _callee3);
  }));
  return function handlePatientChatLogin(_x5, _x6) {
    return _ref3.apply(this, arguments);
  };
}();
var handleRefreshToken = /*#__PURE__*/function () {
  var _ref4 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4(req, res) {
    var refreshToken, decoded, userData, payload, newAccessToken, _t;
    return _regenerator().w(function (_context4) {
      while (1) switch (_context4.p = _context4.n) {
        case 0:
          _context4.p = 0;
          refreshToken = req.cookies.refreshToken;
          if (refreshToken) {
            _context4.n = 1;
            break;
          }
          return _context4.a(2, res.status(401).json({
            errCode: -1,
            errMessage: "Không tìm thấy Refresh Token!"
          }));
        case 1:
          decoded = _JWTaction["default"].verifyRefreshToken(refreshToken);
          if (decoded) {
            _context4.n = 2;
            break;
          }
          return _context4.a(2, res.status(401).json({
            errCode: -1,
            errMessage: "Refresh Token hết hạn hoặc không hợp lệ!"
          }));
        case 2:
          _context4.n = 3;
          return _userServices["default"].getUserByEmail(decoded.email);
        case 3:
          userData = _context4.v;
          if (!(userData && userData.errCode === 0)) {
            _context4.n = 4;
            break;
          }
          payload = {
            email: userData.users.email,
            roles: userData.users.Group && userData.users.Group.Roles ? userData.users.Group.Roles : []
          };
          newAccessToken = _JWTaction["default"].createJWT(payload);
          res.cookie("jwt", newAccessToken, {
            httpOnly: true,
            maxAge: +process.env.COOKIE_EXPIRES_IN
          });
          return _context4.a(2, res.status(200).json({
            errCode: 0,
            errMessage: "Làm mới Access Token thành công!",
            token: newAccessToken
          }));
        case 4:
          return _context4.a(2, res.status(401).json({
            errCode: -1,
            errMessage: "Không tìm thấy người dùng của Token này!"
          }));
        case 5:
          _context4.n = 7;
          break;
        case 6:
          _context4.p = 6;
          _t = _context4.v;
          console.error("Lỗi khi refresh token:", _t);
          return _context4.a(2, res.status(500).json({
            errCode: -1,
            errMessage: "Lỗi hệ thống khi refresh token!"
          }));
        case 7:
          return _context4.a(2);
      }
    }, _callee4, null, [[0, 6]]);
  }));
  return function handleRefreshToken(_x7, _x8) {
    return _ref4.apply(this, arguments);
  };
}();
var handleGetAllUsers = /*#__PURE__*/function () {
  var _ref5 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5(req, res) {
    var id, users;
    return _regenerator().w(function (_context5) {
      while (1) switch (_context5.n) {
        case 0:
          id = req.query.id;
          if (id) {
            _context5.n = 1;
            break;
          }
          return _context5.a(2, res.status(200).json({
            errCode: 1,
            errMessage: "Chua co tham so dau vao",
            users: []
          }));
        case 1:
          _context5.n = 2;
          return _userServices["default"].getAllUsers(id);
        case 2:
          users = _context5.v;
          return _context5.a(2, res.status(200).json({
            errCode: 0,
            errMessage: "Ok!",
            users: users
          }));
      }
    }, _callee5);
  }));
  return function handleGetAllUsers(_x9, _x0) {
    return _ref5.apply(this, arguments);
  };
}();
var handleCreateNewUsers = /*#__PURE__*/function () {
  var _ref6 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee6(req, res) {
    var message;
    return _regenerator().w(function (_context6) {
      while (1) switch (_context6.n) {
        case 0:
          _context6.n = 1;
          return _userServices["default"].createNewUsers(req.body);
        case 1:
          message = _context6.v;
          return _context6.a(2, res.status(200).json(message));
      }
    }, _callee6);
  }));
  return function handleCreateNewUsers(_x1, _x10) {
    return _ref6.apply(this, arguments);
  };
}();
var handleDeleteUsers = /*#__PURE__*/function () {
  var _ref7 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee7(req, res) {
    var userId, message;
    return _regenerator().w(function (_context7) {
      while (1) switch (_context7.n) {
        case 0:
          userId = req.body.id;
          if (!userId) {
            _context7.n = 2;
            break;
          }
          _context7.n = 1;
          return _userServices["default"].deleteUsers(userId);
        case 1:
          message = _context7.v;
          return _context7.a(2, res.status(200).json(message));
        case 2:
          return _context7.a(2, res.status(200).json({
            errCode: 1,
            errMessage: "Chua co tham so dau vao!"
          }));
        case 3:
          return _context7.a(2);
      }
    }, _callee7);
  }));
  return function handleDeleteUsers(_x11, _x12) {
    return _ref7.apply(this, arguments);
  };
}();
var handleEditUsers = /*#__PURE__*/function () {
  var _ref8 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee8(req, res) {
    var data, message;
    return _regenerator().w(function (_context8) {
      while (1) switch (_context8.n) {
        case 0:
          data = req.body;
          if (!data) {
            _context8.n = 2;
            break;
          }
          _context8.n = 1;
          return _userServices["default"].updateUserData(data);
        case 1:
          message = _context8.v;
          return _context8.a(2, res.status(200).json(message));
        case 2:
          return _context8.a(2);
      }
    }, _callee8);
  }));
  return function handleEditUsers(_x13, _x14) {
    return _ref8.apply(this, arguments);
  };
}();
var getAllCode = /*#__PURE__*/function () {
  var _ref9 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee9(req, res) {
    var typeInput, message, _t2;
    return _regenerator().w(function (_context9) {
      while (1) switch (_context9.p = _context9.n) {
        case 0:
          typeInput = req.query.type;
          _context9.p = 1;
          if (!typeInput) {
            _context9.n = 3;
            break;
          }
          _context9.n = 2;
          return _userServices["default"].getAllCodeServices(typeInput);
        case 2:
          message = _context9.v;
          return _context9.a(2, res.status(200).json(message));
        case 3:
          return _context9.a(2, res.status(200).json({
            errCode: 1,
            errMessage: "Chua co tham so dau vao!"
          }));
        case 4:
          _context9.n = 6;
          break;
        case 5:
          _context9.p = 5;
          _t2 = _context9.v;
          return _context9.a(2, res.status(200).json({
            errCode: -1,
            errMessage: "Lỗi từ server!"
          }));
        case 6:
          return _context9.a(2);
      }
    }, _callee9, null, [[1, 5]]);
  }));
  return function getAllCode(_x15, _x16) {
    return _ref9.apply(this, arguments);
  };
}();
var saveFCMToken = /*#__PURE__*/function () {
  var _ref0 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee0(req, res) {
    var message, _t3;
    return _regenerator().w(function (_context0) {
      while (1) switch (_context0.p = _context0.n) {
        case 0:
          _context0.p = 0;
          _context0.n = 1;
          return _userServices["default"].saveFCMToken(req.body);
        case 1:
          message = _context0.v;
          return _context0.a(2, res.status(200).json(message));
        case 2:
          _context0.p = 2;
          _t3 = _context0.v;
          return _context0.a(2, res.status(200).json({
            errCode: -1,
            errMessage: "Lỗi từ server!"
          }));
      }
    }, _callee0, null, [[0, 2]]);
  }));
  return function saveFCMToken(_x17, _x18) {
    return _ref0.apply(this, arguments);
  };
}();
module.exports = {
  handleRegister: handleRegister,
  handleLogin: handleLogin,
  handleGetAllUsers: handleGetAllUsers,
  handleCreateNewUsers: handleCreateNewUsers,
  handleDeleteUsers: handleDeleteUsers,
  handleEditUsers: handleEditUsers,
  getAllCode: getAllCode,
  handlePatientChatLogin: handlePatientChatLogin,
  handleLogout: handleLogout,
  handleRefreshToken: handleRefreshToken,
  saveFCMToken: saveFCMToken
};