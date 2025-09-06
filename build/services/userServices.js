"use strict";

var _bcryptjs = _interopRequireDefault(require("bcryptjs"));
var _index = _interopRequireDefault(require("../models/index"));
var _sequelize = require("sequelize");
var _bodyParser = require("body-parser");
var _user = _interopRequireDefault(require("../models/user"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { "default": e }; }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
var salt = _bcryptjs["default"].genSaltSync(10);
var handleUserRegister = function handleUserRegister(email, password, firstName, lastName, phoneNumber) {
  return new Promise(/*#__PURE__*/function () {
    var _ref = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(resolve, reject) {
      var userData, isExits, hashPasswordFromBcrypt, _t;
      return _regenerator().w(function (_context) {
        while (1) switch (_context.p = _context.n) {
          case 0:
            _context.p = 0;
            userData = {};
            _context.n = 1;
            return checkUserEmail(email);
          case 1:
            isExits = _context.v;
            if (!isExits) {
              _context.n = 2;
              break;
            }
            userData.errCode = 1;
            userData.errMessage = "Email này đã được đăng ký!";
            _context.n = 5;
            break;
          case 2:
            _context.n = 3;
            return hashUserPassword(password);
          case 3:
            hashPasswordFromBcrypt = _context.v;
            _context.n = 4;
            return _index["default"].User.create({
              email: email,
              firstName: firstName,
              lastName: lastName,
              password: hashPasswordFromBcrypt,
              phoneNumber: phoneNumber,
              roleId: "R3"
            });
          case 4:
            userData.errCode = 0;
            userData.errMessage = "Đăng ký thành công!";
          case 5:
            resolve(userData);
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
var handleUserLogin = function handleUserLogin(email, password) {
  return new Promise(/*#__PURE__*/function () {
    var _ref2 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2(resolve, reject) {
      var userData, isExits, users, check, _t2;
      return _regenerator().w(function (_context2) {
        while (1) switch (_context2.p = _context2.n) {
          case 0:
            _context2.p = 0;
            userData = {};
            _context2.n = 1;
            return checkUserEmail(email);
          case 1:
            isExits = _context2.v;
            if (!isExits) {
              _context2.n = 3;
              break;
            }
            _context2.n = 2;
            return _index["default"].User.findOne({
              attributes: ["id", "email", "roleId", "firstName", "lastName", "password", "image"],
              where: {
                email: email
              },
              include: [{
                model: _index["default"].AllCode,
                as: "roleData",
                attributes: ["valueEn", "valueVi"]
              }, {
                model: _index["default"].AllCode,
                as: "positionData",
                attributes: ["valueEn", "valueVi"]
              }],
              raw: true,
              nest: true
            });
          case 2:
            users = _context2.v;
            if (users) {
              check = _bcryptjs["default"].compareSync(password, users.password);
              if (check) {
                userData.errCode = 0;
                userData.errMessage = "Ok!";
                delete users.password;
                //Nếu users là object (findOne), chuyển image sang binary string
                if (users.image) {
                  users.image = new Buffer(users.image, "base64").toString("binary");
                }
                userData.users = users;
              } else {
                userData.errCode = 3;
                userData.errMessage = "Sai mật khẩu!";
              }
            } else {
              userData.errCode = 2;
              userData.errMessage = "Không tìm thấy người dùng!";
            }
            _context2.n = 4;
            break;
          case 3:
            userData.errCode = 1;
            userData.errMessage = "Email của bạn chưa tồn tại! Vui lòng đăng ký tài khoản!";
          case 4:
            resolve(userData);
            _context2.n = 6;
            break;
          case 5:
            _context2.p = 5;
            _t2 = _context2.v;
            reject(_t2);
          case 6:
            return _context2.a(2);
        }
      }, _callee2, null, [[0, 5]]);
    }));
    return function (_x3, _x4) {
      return _ref2.apply(this, arguments);
    };
  }());
};
var handlePatientChatLogin = function handlePatientChatLogin(email, password) {
  return new Promise(/*#__PURE__*/function () {
    var _ref3 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3(resolve, reject) {
      var userData, isExits, users, check, _t3;
      return _regenerator().w(function (_context3) {
        while (1) switch (_context3.p = _context3.n) {
          case 0:
            _context3.p = 0;
            userData = {};
            _context3.n = 1;
            return checkUserEmail(email);
          case 1:
            isExits = _context3.v;
            if (!isExits) {
              _context3.n = 3;
              break;
            }
            _context3.n = 2;
            return _index["default"].User.findOne({
              attributes: ["id", "email", "roleId", "firstName", "lastName", "password"],
              where: {
                email: email
              },
              raw: true
            });
          case 2:
            users = _context3.v;
            if (users) {
              check = _bcryptjs["default"].compareSync(password, users.password);
              if (check) {
                if (users.roleId !== "R3") {
                  userData.errCode = 4;
                  userData.errMessage = "Chỉ tài khoản bệnh nhân mới được đăng nhập chat!";
                } else {
                  userData.errCode = 0;
                  userData.errMessage = "Ok!";
                  delete users.password;
                  userData.users = users;
                }
              } else {
                userData.errCode = 3;
                userData.errMessage = "Sai mật khẩu!";
              }
            } else {
              userData.errCode = 2;
              userData.errMessage = "Không tìm thấy người dùng!";
            }
            _context3.n = 4;
            break;
          case 3:
            userData.errCode = 1;
            userData.errMessage = "Email chưa tồn tại!";
          case 4:
            resolve(userData);
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
var checkUserEmail = function checkUserEmail(userEmail) {
  return new Promise(/*#__PURE__*/function () {
    var _ref4 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4(resolve, reject) {
      var users, _t4;
      return _regenerator().w(function (_context4) {
        while (1) switch (_context4.p = _context4.n) {
          case 0:
            _context4.p = 0;
            _context4.n = 1;
            return _index["default"].User.findOne({
              where: {
                email: userEmail
              }
            });
          case 1:
            users = _context4.v;
            if (users) {
              resolve(true);
            } else {
              resolve(false);
            }
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
var getAllUsers = function getAllUsers(userId) {
  return new Promise(/*#__PURE__*/function () {
    var _ref5 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5(resolve, reject) {
      var users, _t5;
      return _regenerator().w(function (_context5) {
        while (1) switch (_context5.p = _context5.n) {
          case 0:
            _context5.p = 0;
            users = "";
            if (!(userId === "ALL")) {
              _context5.n = 2;
              break;
            }
            _context5.n = 1;
            return _index["default"].User.findAll({
              attributes: {
                exclude: ["passWord"]
              }
            });
          case 1:
            users = _context5.v;
          case 2:
            if (!(userId && userId !== "ALL")) {
              _context5.n = 4;
              break;
            }
            _context5.n = 3;
            return _index["default"].User.findOne({
              where: {
                id: userId
              },
              attributes: {
                exclude: ["passWord"]
              }
            });
          case 3:
            users = _context5.v;
          case 4:
            resolve(users);
            _context5.n = 6;
            break;
          case 5:
            _context5.p = 5;
            _t5 = _context5.v;
            reject(_t5);
          case 6:
            return _context5.a(2);
        }
      }, _callee5, null, [[0, 5]]);
    }));
    return function (_x9, _x0) {
      return _ref5.apply(this, arguments);
    };
  }());
};
var createNewUsers = function createNewUsers(data) {
  return new Promise(/*#__PURE__*/function () {
    var _ref6 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee6(resolve, reject) {
      var check, hashPasswordFromBcrypt, _t6;
      return _regenerator().w(function (_context6) {
        while (1) switch (_context6.p = _context6.n) {
          case 0:
            _context6.p = 0;
            _context6.n = 1;
            return checkUserEmail(data.email);
          case 1:
            check = _context6.v;
            if (!(check === true)) {
              _context6.n = 2;
              break;
            }
            resolve({
              errCode: 1,
              errMessage: "Email da ton tai! Vui long thu email khac!"
            });
            _context6.n = 5;
            break;
          case 2:
            _context6.n = 3;
            return hashUserPassword(data.password);
          case 3:
            hashPasswordFromBcrypt = _context6.v;
            _context6.n = 4;
            return _index["default"].User.create({
              email: data.email,
              firstName: data.firstName,
              lastName: data.lastName,
              password: hashPasswordFromBcrypt,
              address: data.address,
              phoneNumber: data.phoneNumber,
              gender: data.gender,
              roleId: data.roleId,
              positionId: data.positionId,
              image: data.avatar
            });
          case 4:
            resolve({
              errCode: 0,
              errMessage: "OK!"
            });
          case 5:
            _context6.n = 7;
            break;
          case 6:
            _context6.p = 6;
            _t6 = _context6.v;
            reject(_t6);
          case 7:
            return _context6.a(2);
        }
      }, _callee6, null, [[0, 6]]);
    }));
    return function (_x1, _x10) {
      return _ref6.apply(this, arguments);
    };
  }());
};
var hashUserPassword = function hashUserPassword(password) {
  return new Promise(/*#__PURE__*/function () {
    var _ref7 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee7(resolve, reject) {
      var hashPassword, _t7;
      return _regenerator().w(function (_context7) {
        while (1) switch (_context7.p = _context7.n) {
          case 0:
            _context7.p = 0;
            _context7.n = 1;
            return _bcryptjs["default"].hashSync(password, salt);
          case 1:
            hashPassword = _context7.v;
            resolve(hashPassword);
            _context7.n = 3;
            break;
          case 2:
            _context7.p = 2;
            _t7 = _context7.v;
            reject(_t7);
          case 3:
            return _context7.a(2);
        }
      }, _callee7, null, [[0, 2]]);
    }));
    return function (_x11, _x12) {
      return _ref7.apply(this, arguments);
    };
  }());
};
var deleteUsers = function deleteUsers(userId) {
  return new Promise(/*#__PURE__*/function () {
    var _ref8 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee8(resolve, reject) {
      var users, _t8;
      return _regenerator().w(function (_context8) {
        while (1) switch (_context8.p = _context8.n) {
          case 0:
            _context8.p = 0;
            _context8.n = 1;
            return _index["default"].User.findOne({
              where: {
                id: userId
              },
              raw: false
            });
          case 1:
            users = _context8.v;
            if (!users) {
              _context8.n = 3;
              break;
            }
            _context8.n = 2;
            return users.destroy();
          case 2:
            resolve({
              errCode: 0,
              errMessage: "Xoa thanh cong!"
            });
            _context8.n = 4;
            break;
          case 3:
            resolve({
              errCode: 0,
              errMessage: "Khong tim thay email nguoi dung!"
            });
          case 4:
            _context8.n = 6;
            break;
          case 5:
            _context8.p = 5;
            _t8 = _context8.v;
            reject(_t8);
          case 6:
            return _context8.a(2);
        }
      }, _callee8, null, [[0, 5]]);
    }));
    return function (_x13, _x14) {
      return _ref8.apply(this, arguments);
    };
  }());
};
var updateUserData = function updateUserData(data) {
  console.log(data);
  return new Promise(/*#__PURE__*/function () {
    var _ref9 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee9(resolve, reject) {
      var users, _t9;
      return _regenerator().w(function (_context9) {
        while (1) switch (_context9.p = _context9.n) {
          case 0:
            _context9.p = 0;
            if (!data.id || !data.roleId || !data.gender) {
              resolve({
                errCode: 2,
                errMessage: "Khong co tham so truyen vao!"
              });
            }
            _context9.n = 1;
            return _index["default"].User.findOne({
              where: {
                id: data.id
              },
              raw: false
            });
          case 1:
            users = _context9.v;
            if (!users) {
              _context9.n = 3;
              break;
            }
            users.email = data.email, users.firstName = data.firstName, users.lastName = data.lastName, users.address = data.address, users.phoneNumber = data.phoneNumber, users.gender = data.gender, users.roleId = data.roleId;
            users.positionId = data.positionId;
            if (data.avatar) {
              users.image = data.avatar;
            }
            _context9.n = 2;
            return users.save();
          case 2:
            resolve({
              errCode: 0,
              errMessage: "Cập nhập thành công!"
            });
            _context9.n = 4;
            break;
          case 3:
            resolve({
              errCode: 1,
              errMessage: "Không tìm thấy email người dùng!"
            });
          case 4:
            _context9.n = 6;
            break;
          case 5:
            _context9.p = 5;
            _t9 = _context9.v;
            reject(_t9);
          case 6:
            return _context9.a(2);
        }
      }, _callee9, null, [[0, 5]]);
    }));
    return function (_x15, _x16) {
      return _ref9.apply(this, arguments);
    };
  }());
};
var getAllCodeServices = function getAllCodeServices(typeInput) {
  return new Promise(/*#__PURE__*/function () {
    var _ref0 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee0(resolve, reject) {
      var res, allcode, _t0;
      return _regenerator().w(function (_context0) {
        while (1) switch (_context0.p = _context0.n) {
          case 0:
            _context0.p = 0;
            res = {};
            _context0.n = 1;
            return _index["default"].AllCode.findAll({
              where: {
                type: typeInput
              }
            });
          case 1:
            allcode = _context0.v;
            res.errCode = 0;
            res.data = allcode;
            resolve(res);
            _context0.n = 3;
            break;
          case 2:
            _context0.p = 2;
            _t0 = _context0.v;
            reject(_t0);
          case 3:
            return _context0.a(2);
        }
      }, _callee0, null, [[0, 2]]);
    }));
    return function (_x17, _x18) {
      return _ref0.apply(this, arguments);
    };
  }());
};
module.exports = {
  handleUserRegister: handleUserRegister,
  handleUserLogin: handleUserLogin,
  handlePatientChatLogin: handlePatientChatLogin,
  getAllUsers: getAllUsers,
  createNewUsers: createNewUsers,
  deleteUsers: deleteUsers,
  updateUserData: updateUserData,
  getAllCodeServices: getAllCodeServices
};