"use strict";

function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
module.exports = {
  up: function () {
    var _up = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(queryInterface, Sequelize) {
      return _regenerator().w(function (_context) {
        while (1) switch (_context.n) {
          case 0:
            _context.n = 1;
            return queryInterface.bulkInsert("Facilities", [{
              name: "Doctor Check - Tầm Soát Bệnh Để Sống Thọ Hơn",
              description: "Disease Screening for a Longer Life",
              logo: "/images/facilities/092249-doctor-check.jpg",
              address: "123 Đường ABC, Quận 1, TP.HCM",
              phone: "028-1234-5678",
              email: "info@doctorcheck.com",
              website: "https://doctorcheck.com",
              type: "medical_center",
              level: "private",
              isActive: true,
              isFeatured: true,
              rating: 4.5,
              totalReviews: 150,
              workingHours: JSON.stringify({
                monday: "8:00-17:00",
                tuesday: "8:00-17:00",
                wednesday: "8:00-17:00",
                thursday: "8:00-17:00",
                friday: "8:00-17:00",
                saturday: "8:00-12:00",
                sunday: "Closed"
              }),
              services: JSON.stringify(["Khám tổng quát", "Xét nghiệm máu", "Siêu âm", "X-quang"]),
              specialties: JSON.stringify(["Nội khoa", "Ngoại khoa", "Tim mạch", "Tiêu hóa"]),
              images: JSON.stringify(["facility1.jpg", "facility2.jpg"]),
              location: JSON.stringify({
                lat: 10.762622,
                lng: 106.660172
              }),
              createdAt: new Date(),
              updatedAt: new Date()
            }, {
              name: "Phòng khám Bệnh viện Đại học Y Dược 1",
              description: "Điều trị chuyên nghiệp - Nâng tầm Y Việt",
              logo: "/images/facilities/155206-logo-y-duoc-1.png",
              address: "215 Hồng Bàng, Quận 5, TP.HCM",
              phone: "028-3855-8419",
              email: "info@umc1.com",
              website: "https://umc1.com",
              type: "hospital",
              level: "provincial",
              isActive: true,
              isFeatured: true,
              rating: 4.8,
              totalReviews: 300,
              workingHours: JSON.stringify({
                monday: "7:00-17:00",
                tuesday: "7:00-17:00",
                wednesday: "7:00-17:00",
                thursday: "7:00-17:00",
                friday: "7:00-17:00",
                saturday: "7:00-12:00",
                sunday: "Closed"
              }),
              services: JSON.stringify(["Khám tổng quát", "Chuyên khoa", "Phẫu thuật", "Cấp cứu"]),
              specialties: JSON.stringify(["Tim mạch", "Thần kinh", "Tiêu hóa", "Nhi khoa"]),
              images: JSON.stringify(["umc1.jpg", "umc2.jpg"]),
              location: JSON.stringify({
                lat: 10.754,
                lng: 106.6624
              }),
              createdAt: new Date(),
              updatedAt: new Date()
            }, {
              name: "Hệ thống Y tế Thu Cúc TCI",
              description: "HỆ THỐNG Y TẾ THUCUC",
              logo: "/images/facilities/103904-logo-thucuc.png",
              address: "286 Thụy Khuê, Tây Hồ, Hà Nội",
              phone: "024-3835-5566",
              email: "info@thucuc.com",
              website: "https://thucuc.com",
              type: "hospital",
              level: "private",
              isActive: true,
              isFeatured: true,
              rating: 4.6,
              totalReviews: 250,
              workingHours: JSON.stringify({
                monday: "7:30-17:30",
                tuesday: "7:30-17:30",
                wednesday: "7:30-17:30",
                thursday: "7:30-17:30",
                friday: "7:30-17:30",
                saturday: "7:30-12:30",
                sunday: "Closed"
              }),
              services: JSON.stringify(["Khám tổng quát", "Chuyên khoa", "Phẫu thuật", "Thẩm mỹ"]),
              specialties: JSON.stringify(["Tim mạch", "Thần kinh", "Tiêu hóa", "Phụ khoa"]),
              images: JSON.stringify(["thucuc1.jpg", "thucuc2.jpg"]),
              location: JSON.stringify({
                lat: 21.0285,
                lng: 105.8542
              }),
              createdAt: new Date(),
              updatedAt: new Date()
            }, {
              name: "Bệnh viện Nam học và Hiếm muộn Hà Nội",
              description: "AF HANOI",
              logo: "/images/facilities/114326-benh-vien-nam-hoc-va-hiem-muon-ha-noi.png",
              address: "431 Tam Trinh, Hoàng Mai, Hà Nội",
              phone: "024-3634-1638",
              email: "info@namhoc.com",
              website: "https://namhoc.com",
              type: "hospital",
              level: "provincial",
              isActive: true,
              isFeatured: true,
              rating: 4.4,
              totalReviews: 180,
              workingHours: JSON.stringify({
                monday: "7:00-17:00",
                tuesday: "7:00-17:00",
                wednesday: "7:00-17:00",
                thursday: "7:00-17:00",
                friday: "7:00-17:00",
                saturday: "7:00-12:00",
                sunday: "Closed"
              }),
              services: JSON.stringify(["Nam khoa", "Hiếm muộn", "Sinh sản", "Tiền hôn nhân"]),
              specialties: JSON.stringify(["Nam khoa", "Hiếm muộn", "Sinh sản"]),
              images: JSON.stringify(["namhoc1.jpg", "namhoc2.jpg"]),
              location: JSON.stringify({
                lat: 20.9843,
                lng: 105.8412
              }),
              createdAt: new Date(),
              updatedAt: new Date()
            }, {
              name: "Bệnh viện Đa khoa Hồng Phát",
              description: "HỒNG PHÁ - Trao y đức - nhận niềm tin",
              logo: "/images/facilities/170119-logobaoson.png",
              address: "456 Lê Văn Việt, Quận 9, TP.HCM",
              phone: "028-3730-1234",
              email: "info@hongphat.com",
              website: "https://hongphat.com",
              type: "hospital",
              level: "private",
              isActive: true,
              isFeatured: true,
              rating: 4.3,
              totalReviews: 120,
              workingHours: JSON.stringify({
                monday: "7:00-17:00",
                tuesday: "7:00-17:00",
                wednesday: "7:00-17:00",
                thursday: "7:00-17:00",
                friday: "7:00-17:00",
                saturday: "7:00-12:00",
                sunday: "Closed"
              }),
              services: JSON.stringify(["Khám tổng quát", "Chuyên khoa", "Phẫu thuật", "Cấp cứu"]),
              specialties: JSON.stringify(["Nội khoa", "Ngoại khoa", "Sản khoa", "Nhi khoa"]),
              images: JSON.stringify(["hongphat1.jpg", "hongphat2.jpg"]),
              location: JSON.stringify({
                lat: 10.8417,
                lng: 106.8097
              }),
              createdAt: new Date(),
              updatedAt: new Date()
            }], {});
          case 1:
            return _context.a(2);
        }
      }, _callee);
    }));
    function up(_x, _x2) {
      return _up.apply(this, arguments);
    }
    return up;
  }(),
  down: function () {
    var _down = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2(queryInterface, Sequelize) {
      return _regenerator().w(function (_context2) {
        while (1) switch (_context2.n) {
          case 0:
            _context2.n = 1;
            return queryInterface.bulkDelete("Facilities", null, {});
          case 1:
            return _context2.a(2);
        }
      }, _callee2);
    }));
    function down(_x3, _x4) {
      return _down.apply(this, arguments);
    }
    return down;
  }()
};