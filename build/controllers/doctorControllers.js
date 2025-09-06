"use strict";

var _doctorServices = _interopRequireDefault(
  require("../services/doctorServices")
);
function _interopRequireDefault(e) {
  return e && e.__esModule ? e : { default: e };
}
function _regenerator() {
  /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e,
    t,
    r = "function" == typeof Symbol ? Symbol : {},
    n = r.iterator || "@@iterator",
    o = r.toStringTag || "@@toStringTag";
  function i(r, n, o, i) {
    var c = n && n.prototype instanceof Generator ? n : Generator,
      u = Object.create(c.prototype);
    return (
      _regeneratorDefine2(
        u,
        "_invoke",
        (function (r, n, o) {
          var i,
            c,
            u,
            f = 0,
            p = o || [],
            y = !1,
            G = {
              p: 0,
              n: 0,
              v: e,
              a: d,
              f: d.bind(e, 4),
              d: function d(t, r) {
                return (i = t), (c = 0), (u = e), (G.n = r), a;
              },
            };
          function d(r, n) {
            for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) {
              var o,
                i = p[t],
                d = G.p,
                l = i[2];
              r > 3
                ? (o = l === n) &&
                  ((u = i[(c = i[4]) ? 5 : ((c = 3), 3)]), (i[4] = i[5] = e))
                : i[0] <= d &&
                  ((o = r < 2 && d < i[1])
                    ? ((c = 0), (G.v = n), (G.n = i[1]))
                    : d < l &&
                      (o = r < 3 || i[0] > n || n > l) &&
                      ((i[4] = r), (i[5] = n), (G.n = l), (c = 0)));
            }
            if (o || r > 1) return a;
            throw ((y = !0), n);
          }
          return function (o, p, l) {
            if (f > 1) throw TypeError("Generator is already running");
            for (
              y && 1 === p && d(p, l), c = p, u = l;
              (t = c < 2 ? e : u) || !y;

            ) {
              i ||
                (c
                  ? c < 3
                    ? (c > 1 && (G.n = -1), d(c, u))
                    : (G.n = u)
                  : (G.v = u));
              try {
                if (((f = 2), i)) {
                  if ((c || (o = "next"), (t = i[o]))) {
                    if (!(t = t.call(i, u)))
                      throw TypeError("iterator result is not an object");
                    if (!t.done) return t;
                    (u = t.value), c < 2 && (c = 0);
                  } else
                    1 === c && (t = i["return"]) && t.call(i),
                      c < 2 &&
                        ((u = TypeError(
                          "The iterator does not provide a '" + o + "' method"
                        )),
                        (c = 1));
                  i = e;
                } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break;
              } catch (t) {
                (i = e), (c = 1), (u = t);
              } finally {
                f = 1;
              }
            }
            return { value: t, done: y };
          };
        })(r, o, i),
        !0
      ),
      u
    );
  }
  var a = {};
  function Generator() {}
  function GeneratorFunction() {}
  function GeneratorFunctionPrototype() {}
  t = Object.getPrototypeOf;
  var c = [][n]
      ? t(t([][n]()))
      : (_regeneratorDefine2((t = {}), n, function () {
          return this;
        }),
        t),
    u =
      (GeneratorFunctionPrototype.prototype =
      Generator.prototype =
        Object.create(c));
  function f(e) {
    return (
      Object.setPrototypeOf
        ? Object.setPrototypeOf(e, GeneratorFunctionPrototype)
        : ((e.__proto__ = GeneratorFunctionPrototype),
          _regeneratorDefine2(e, o, "GeneratorFunction")),
      (e.prototype = Object.create(u)),
      e
    );
  }
  return (
    (GeneratorFunction.prototype = GeneratorFunctionPrototype),
    _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype),
    _regeneratorDefine2(
      GeneratorFunctionPrototype,
      "constructor",
      GeneratorFunction
    ),
    (GeneratorFunction.displayName = "GeneratorFunction"),
    _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"),
    _regeneratorDefine2(u),
    _regeneratorDefine2(u, o, "Generator"),
    _regeneratorDefine2(u, n, function () {
      return this;
    }),
    _regeneratorDefine2(u, "toString", function () {
      return "[object Generator]";
    }),
    (_regenerator = function _regenerator() {
      return { w: i, m: f };
    })()
  );
}
function _regeneratorDefine2(e, r, n, t) {
  var i = Object.defineProperty;
  try {
    i({}, "", {});
  } catch (e) {
    i = 0;
  }
  (_regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) {
    function o(r, n) {
      _regeneratorDefine2(e, r, function (e) {
        return this._invoke(r, n, e);
      });
    }
    r
      ? i
        ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t })
        : (e[r] = n)
      : (o("next", 0), o("throw", 1), o("return", 2));
  }),
    _regeneratorDefine2(e, r, n, t);
}
function asyncGeneratorStep(n, t, e, r, o, a, c) {
  try {
    var i = n[a](c),
      u = i.value;
  } catch (n) {
    return void e(n);
  }
  i.done ? t(u) : Promise.resolve(u).then(r, o);
}
function _asyncToGenerator(n) {
  return function () {
    var t = this,
      e = arguments;
    return new Promise(function (r, o) {
      var a = n.apply(t, e);
      function _next(n) {
        asyncGeneratorStep(a, r, o, _next, _throw, "next", n);
      }
      function _throw(n) {
        asyncGeneratorStep(a, r, o, _next, _throw, "throw", n);
      }
      _next(void 0);
    });
  };
}
var socket = require("../socket/index");
var getTopDoctorHome = /*#__PURE__*/ (function () {
  var _ref = _asyncToGenerator(
    /*#__PURE__*/ _regenerator().m(function _callee(req, res) {
      var limit, lang, message, _t;
      return _regenerator().w(
        function (_context) {
          while (1)
            switch ((_context.p = _context.n)) {
              case 0:
                limit = req.query.limit;
                lang = req.query.lang;
                if (!limit) limit = 10;
                _context.p = 1;
                _context.n = 2;
                return _doctorServices["default"].getTopDoctorHomeServices(
                  limit,
                  lang
                );
              case 2:
                message = _context.v;
                return _context.a(2, res.status(200).json(message));
              case 3:
                _context.p = 3;
                _t = _context.v;
                return _context.a(
                  2,
                  res.status(200).json({
                    errCode: -1,
                    errMessage: "Lỗi từ server!",
                  })
                );
            }
        },
        _callee,
        null,
        [[1, 3]]
      );
    })
  );
  return function getTopDoctorHome(_x, _x2) {
    return _ref.apply(this, arguments);
  };
})();
var getAllDoctor = /*#__PURE__*/ (function () {
  var _ref2 = _asyncToGenerator(
    /*#__PURE__*/ _regenerator().m(function _callee2(req, res) {
      var message, _t2;
      return _regenerator().w(
        function (_context2) {
          while (1)
            switch ((_context2.p = _context2.n)) {
              case 0:
                _context2.p = 0;
                _context2.n = 1;
                return _doctorServices["default"].getAllDoctorServices();
              case 1:
                message = _context2.v;
                return _context2.a(2, res.status(200).json(message));
              case 2:
                _context2.p = 2;
                _t2 = _context2.v;
                return _context2.a(
                  2,
                  res.status(200).json({
                    errCode: -1,
                    errMessage: "Lỗi từ server!",
                  })
                );
            }
        },
        _callee2,
        null,
        [[0, 2]]
      );
    })
  );
  return function getAllDoctor(_x3, _x4) {
    return _ref2.apply(this, arguments);
  };
})();
var postInforDoctor = /*#__PURE__*/ (function () {
  var _ref3 = _asyncToGenerator(
    /*#__PURE__*/ _regenerator().m(function _callee3(req, res) {
      var message, _t3;
      return _regenerator().w(
        function (_context3) {
          while (1)
            switch ((_context3.p = _context3.n)) {
              case 0:
                _context3.p = 0;
                _context3.n = 1;
                return _doctorServices["default"].saveDetailInforDoctor(
                  req.body
                );
              case 1:
                message = _context3.v;
                return _context3.a(2, res.status(200).json(message));
              case 2:
                _context3.p = 2;
                _t3 = _context3.v;
                return _context3.a(
                  2,
                  res.status(200).json({
                    errCode: -1,
                    errMessage: "Lỗi từ server!",
                  })
                );
            }
        },
        _callee3,
        null,
        [[0, 2]]
      );
    })
  );
  return function postInforDoctor(_x5, _x6) {
    return _ref3.apply(this, arguments);
  };
})();
var getDetailDoctorById = /*#__PURE__*/ (function () {
  var _ref4 = _asyncToGenerator(
    /*#__PURE__*/ _regenerator().m(function _callee4(req, res) {
      var message, _t4;
      return _regenerator().w(
        function (_context4) {
          while (1)
            switch ((_context4.p = _context4.n)) {
              case 0:
                _context4.p = 0;
                _context4.n = 1;
                return _doctorServices["default"].getDetailDoctorByIdServices(
                  req.query.id,
                  req.query.lang
                );
              case 1:
                message = _context4.v;
                return _context4.a(2, res.status(200).json(message));
              case 2:
                _context4.p = 2;
                _t4 = _context4.v;
                return _context4.a(
                  2,
                  res.status(200).json({
                    errCode: -1,
                    errMessage: "Lỗi từ server!",
                  })
                );
            }
        },
        _callee4,
        null,
        [[0, 2]]
      );
    })
  );
  return function getDetailDoctorById(_x7, _x8) {
    return _ref4.apply(this, arguments);
  };
})();
var getBulkCreateSchedule = /*#__PURE__*/ (function () {
  var _ref5 = _asyncToGenerator(
    /*#__PURE__*/ _regenerator().m(function _callee5(req, res) {
      var message, _t5;
      return _regenerator().w(
        function (_context5) {
          while (1)
            switch ((_context5.p = _context5.n)) {
              case 0:
                _context5.p = 0;
                _context5.n = 1;
                return _doctorServices["default"].bulkCreateScheduleServices(
                  req.body
                );
              case 1:
                message = _context5.v;
                return _context5.a(2, res.status(200).json(message));
              case 2:
                _context5.p = 2;
                _t5 = _context5.v;
                return _context5.a(
                  2,
                  res.status(200).json({
                    errCode: -1,
                    errMessage: "Lỗi từ server!",
                  })
                );
            }
        },
        _callee5,
        null,
        [[0, 2]]
      );
    })
  );
  return function getBulkCreateSchedule(_x9, _x0) {
    return _ref5.apply(this, arguments);
  };
})();
var getScheduleDoctorByDate = /*#__PURE__*/ (function () {
  var _ref6 = _asyncToGenerator(
    /*#__PURE__*/ _regenerator().m(function _callee6(req, res) {
      var message, _t6;
      return _regenerator().w(
        function (_context6) {
          while (1)
            switch ((_context6.p = _context6.n)) {
              case 0:
                _context6.p = 0;
                _context6.n = 1;
                return _doctorServices[
                  "default"
                ].getScheduleDoctorByDateServices(
                  req.query.doctorId,
                  req.query.date
                );
              case 1:
                message = _context6.v;
                return _context6.a(2, res.status(200).json(message));
              case 2:
                _context6.p = 2;
                _t6 = _context6.v;
                return _context6.a(
                  2,
                  res.status(200).json({
                    errCode: -1,
                    errMessage: "Lỗi từ server!",
                  })
                );
            }
        },
        _callee6,
        null,
        [[0, 2]]
      );
    })
  );
  return function getScheduleDoctorByDate(_x1, _x10) {
    return _ref6.apply(this, arguments);
  };
})();
var getExtraDoctorInforById = /*#__PURE__*/ (function () {
  var _ref7 = _asyncToGenerator(
    /*#__PURE__*/ _regenerator().m(function _callee7(req, res) {
      var message, _t7;
      return _regenerator().w(
        function (_context7) {
          while (1)
            switch ((_context7.p = _context7.n)) {
              case 0:
                _context7.p = 0;
                _context7.n = 1;
                return _doctorServices[
                  "default"
                ].getExtraDoctorInforByIdServices(
                  req.query.doctorId,
                  req.query.lang
                );
              case 1:
                message = _context7.v;
                return _context7.a(2, res.status(200).json(message));
              case 2:
                _context7.p = 2;
                _t7 = _context7.v;
                return _context7.a(
                  2,
                  res.status(200).json({
                    errCode: -1,
                    errMessage: "Lỗi từ server!",
                  })
                );
            }
        },
        _callee7,
        null,
        [[0, 2]]
      );
    })
  );
  return function getExtraDoctorInforById(_x11, _x12) {
    return _ref7.apply(this, arguments);
  };
})();
var getProfileDoctorById = /*#__PURE__*/ (function () {
  var _ref8 = _asyncToGenerator(
    /*#__PURE__*/ _regenerator().m(function _callee8(req, res) {
      var message, _t8;
      return _regenerator().w(
        function (_context8) {
          while (1)
            switch ((_context8.p = _context8.n)) {
              case 0:
                _context8.p = 0;
                _context8.n = 1;
                return _doctorServices["default"].getProfileDoctorByIdServices(
                  req.query.doctorId,
                  req.query.lang
                );
              case 1:
                message = _context8.v;
                return _context8.a(2, res.status(200).json(message));
              case 2:
                _context8.p = 2;
                _t8 = _context8.v;
                return _context8.a(
                  2,
                  res.status(200).json({
                    errCode: -1,
                    errMessage: "Lỗi từ server!",
                  })
                );
            }
        },
        _callee8,
        null,
        [[0, 2]]
      );
    })
  );
  return function getProfileDoctorById(_x13, _x14) {
    return _ref8.apply(this, arguments);
  };
})();
var getListPatientForDoctor = /*#__PURE__*/ (function () {
  var _ref9 = _asyncToGenerator(
    /*#__PURE__*/ _regenerator().m(function _callee9(req, res) {
      var message, _t9;
      return _regenerator().w(
        function (_context9) {
          while (1)
            switch ((_context9.p = _context9.n)) {
              case 0:
                _context9.p = 0;
                _context9.n = 1;
                return _doctorServices["default"].getListPatientForDoctor(
                  req.query.doctorId,
                  req.query.roleId,
                  req.query.date,
                  req.query.lang
                );
              case 1:
                message = _context9.v;
                return _context9.a(2, res.status(200).json(message));
              case 2:
                _context9.p = 2;
                _t9 = _context9.v;
                return _context9.a(
                  2,
                  res.status(200).json({
                    errCode: -1,
                    errMessage: "Lỗi từ server!",
                  })
                );
            }
        },
        _callee9,
        null,
        [[0, 2]]
      );
    })
  );
  return function getListPatientForDoctor(_x15, _x16) {
    return _ref9.apply(this, arguments);
  };
})();
var sendRemedy = /*#__PURE__*/ (function () {
  var _ref0 = _asyncToGenerator(
    /*#__PURE__*/ _regenerator().m(function _callee0(req, res) {
      var message, _t0;
      return _regenerator().w(
        function (_context0) {
          while (1)
            switch ((_context0.p = _context0.n)) {
              case 0:
                _context0.p = 0;
                _context0.n = 1;
                return _doctorServices["default"].sendRemedyService(req.body);
              case 1:
                message = _context0.v;
                return _context0.a(2, res.status(200).json(message));
              case 2:
                _context0.p = 2;
                _t0 = _context0.v;
                return _context0.a(
                  2,
                  res.status(200).json({
                    errCode: -1,
                    errMessage: "Lỗi từ server!",
                  })
                );
            }
        },
        _callee0,
        null,
        [[0, 2]]
      );
    })
  );
  return function sendRemedy(_x17, _x18) {
    return _ref0.apply(this, arguments);
  };
})();
var getListGDPR = /*#__PURE__*/ (function () {
  var _ref1 = _asyncToGenerator(
    /*#__PURE__*/ _regenerator().m(function _callee1(req, res) {
      var message, _t1;
      return _regenerator().w(
        function (_context1) {
          while (1)
            switch ((_context1.p = _context1.n)) {
              case 0:
                _context1.p = 0;
                _context1.n = 1;
                return _doctorServices["default"].getListGDPR();
              case 1:
                message = _context1.v;
                return _context1.a(2, res.status(200).json(message));
              case 2:
                _context1.p = 2;
                _t1 = _context1.v;
                return _context1.a(
                  2,
                  res.status(200).json({
                    errCode: -1,
                    errMessage: "Lỗi từ server!",
                  })
                );
            }
        },
        _callee1,
        null,
        [[0, 2]]
      );
    })
  );
  return function getListGDPR(_x19, _x20) {
    return _ref1.apply(this, arguments);
  };
})();
var postConfirmPayment = /*#__PURE__*/ (function () {
  var _ref10 = _asyncToGenerator(
    /*#__PURE__*/ _regenerator().m(function _callee10(req, res) {
      var message, _t10;
      return _regenerator().w(
        function (_context10) {
          while (1)
            switch ((_context10.p = _context10.n)) {
              case 0:
                _context10.p = 0;
                _context10.n = 1;
                return _doctorServices["default"].postConfirmPayment(
                  req.body,
                  req.app.get("socketio")
                );
              case 1:
                message = _context10.v;
                return _context10.a(2, res.status(200).json(message));
              case 2:
                _context10.p = 2;
                _t10 = _context10.v;
                return _context10.a(
                  2,
                  res.status(200).json({
                    errCode: -1,
                    errMessage: "Lỗi từ server!",
                  })
                );
            }
        },
        _callee10,
        null,
        [[0, 2]]
      );
    })
  );
  return function postConfirmPayment(_x21, _x22) {
    return _ref10.apply(this, arguments);
  };
})();
var postMedicalAppointmentStatus = /*#__PURE__*/ (function () {
  var _ref11 = _asyncToGenerator(
    /*#__PURE__*/ _regenerator().m(function _callee11(req, res) {
      var message, _t11;
      return _regenerator().w(
        function (_context11) {
          while (1)
            switch ((_context11.p = _context11.n)) {
              case 0:
                _context11.p = 0;
                _context11.n = 1;
                return _doctorServices["default"].postMedicalAppointmentStatus(
                  req.body
                );
              case 1:
                message = _context11.v;
                return _context11.a(2, res.status(200).json(message));
              case 2:
                _context11.p = 2;
                _t11 = _context11.v;
                return _context11.a(
                  2,
                  res.status(200).json({
                    errCode: -1,
                    errMessage: "Lỗi từ server!",
                  })
                );
            }
        },
        _callee11,
        null,
        [[0, 2]]
      );
    })
  );
  return function postMedicalAppointmentStatus(_x23, _x24) {
    return _ref11.apply(this, arguments);
  };
})();
var sendPayment = /*#__PURE__*/ (function () {
  var _ref12 = _asyncToGenerator(
    /*#__PURE__*/ _regenerator().m(function _callee12(req, res) {
      var message, _t12;
      return _regenerator().w(
        function (_context12) {
          while (1)
            switch ((_context12.p = _context12.n)) {
              case 0:
                _context12.p = 0;
                _context12.n = 1;
                return _doctorServices["default"].sendPayment(req.body);
              case 1:
                message = _context12.v;
                return _context12.a(2, res.status(200).json(message));
              case 2:
                _context12.p = 2;
                _t12 = _context12.v;
                return _context12.a(
                  2,
                  res.status(200).json({
                    errCode: -1,
                    errMessage: "Lỗi từ server!",
                  })
                );
            }
        },
        _callee12,
        null,
        [[0, 2]]
      );
    })
  );
  return function sendPayment(_x25, _x26) {
    return _ref12.apply(this, arguments);
  };
})();
module.exports = {
  getTopDoctorHome: getTopDoctorHome,
  getAllDoctor: getAllDoctor,
  postInforDoctor: postInforDoctor,
  getDetailDoctorById: getDetailDoctorById,
  getBulkCreateSchedule: getBulkCreateSchedule,
  getScheduleDoctorByDate: getScheduleDoctorByDate,
  getExtraDoctorInforById: getExtraDoctorInforById,
  getProfileDoctorById: getProfileDoctorById,
  getListPatientForDoctor: getListPatientForDoctor,
  sendRemedy: sendRemedy,
  getListGDPR: getListGDPR,
  postConfirmPayment: postConfirmPayment,
  postMedicalAppointmentStatus: postMedicalAppointmentStatus,
  sendPayment: sendPayment,
};
