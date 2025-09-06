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
            return queryInterface.bulkInsert("Packages", [{
              name: "Gói khám sức khỏe tiền hôn nhân cho NỮ (NHHM8F)",
              description: "Gói khám sức khỏe toàn diện dành cho nữ trước khi kết hôn",
              price: 1400000.0,
              image: "/images/packages/101828-thn-nu.jpeg",
              category: "Tiền hôn nhân",
              gender: "female",
              ageRange: "18-45",
              duration: 120,
              isActive: true,
              isFeatured: true,
              facilityId: 24,
              // Bệnh viện Nam học và Hiếm muộn Hà Nội
              specialtyId: 1,
              includedServices: JSON.stringify(["Khám tổng quát", "Xét nghiệm máu", "Xét nghiệm nước tiểu", "Siêu âm ổ bụng", "X-quang tim phổi", "Điện tâm đồ", "Khám phụ khoa", "Tư vấn sức khỏe sinh sản"]),
              excludedServices: JSON.stringify(["Thuốc điều trị", "Phẫu thuật", "Điều trị chuyên khoa"]),
              requirements: "Nhịn ăn 8-12 giờ trước khi khám, không uống rượu bia 24h trước",
              notes: "Kết quả có sau 2-3 ngày làm việc",
              createdAt: new Date(),
              updatedAt: new Date()
            }, {
              name: "Gói khám tổng quát tiêu chuẩn dành cho nam (SG2M)",
              description: "Gói khám sức khỏe cơ bản dành cho nam giới",
              price: 0.0,
              // Chưa xác định
              image: "/images/packages/235248-tam-soat-ung-thu-nam.jpg",
              category: "Tiêu chuẩn",
              gender: "male",
              ageRange: "18-65",
              duration: 90,
              isActive: true,
              isFeatured: true,
              facilityId: 22,
              // Phòng khám Bệnh viện Đại học Y Dược 1
              specialtyId: 1,
              includedServices: JSON.stringify(["Khám tổng quát", "Xét nghiệm máu cơ bản", "Xét nghiệm nước tiểu", "Siêu âm ổ bụng", "X-quang tim phổi", "Điện tâm đồ"]),
              excludedServices: JSON.stringify(["Thuốc điều trị", "Phẫu thuật", "Điều trị chuyên khoa"]),
              requirements: "Nhịn ăn 8-12 giờ trước khi khám",
              notes: "Liên hệ để biết thêm thông tin về giá",
              createdAt: new Date(),
              updatedAt: new Date()
            }, {
              name: "Gói khám NINGEN DOCK BERNARD Gold dành cho Nữ",
              description: "Gói khám sức khỏe cao cấp theo tiêu chuẩn Nhật Bản",
              price: 25000000.0,
              image: "/images/packages/095545-dock.png",
              category: "Premium",
              gender: "female",
              ageRange: "25-70",
              duration: 240,
              isActive: true,
              isFeatured: true,
              facilityId: 21,
              // Doctor Check
              specialtyId: 1,
              includedServices: JSON.stringify(["Khám tổng quát toàn diện", "Xét nghiệm máu nâng cao", "Xét nghiệm nước tiểu", "Siêu âm toàn bộ", "X-quang toàn thân", "Điện tâm đồ", "Nội soi dạ dày", "Nội soi đại tràng", "Chụp CT toàn thân", "Chụp MRI não", "Tư vấn dinh dưỡng", "Tư vấn sức khỏe"]),
              excludedServices: JSON.stringify(["Thuốc điều trị", "Phẫu thuật"]),
              requirements: "Nhịn ăn 12 giờ trước khi khám, không uống rượu bia 48h trước",
              notes: "Gói khám cao cấp theo tiêu chuẩn Nhật Bản, kết quả chi tiết",
              createdAt: new Date(),
              updatedAt: new Date()
            }, {
              name: "Gói khám sức khỏe tiền hôn nhân cho Nam (NHHM8M)",
              description: "Gói khám sức khỏe toàn diện dành cho nam trước khi kết hôn",
              price: 1500000.0,
              image: "/images/packages/094819-thn-nam.jpeg",
              category: "Tiền hôn nhân",
              gender: "male",
              ageRange: "18-45",
              duration: 120,
              isActive: true,
              isFeatured: true,
              facilityId: 24,
              // Bệnh viện Nam học và Hiếm muộn Hà Nội
              specialtyId: 1,
              includedServices: JSON.stringify(["Khám tổng quát", "Xét nghiệm máu", "Xét nghiệm nước tiểu", "Siêu âm ổ bụng", "X-quang tim phổi", "Điện tâm đồ", "Khám nam khoa", "Tư vấn sức khỏe sinh sản"]),
              excludedServices: JSON.stringify(["Thuốc điều trị", "Phẫu thuật", "Điều trị chuyên khoa"]),
              requirements: "Nhịn ăn 8-12 giờ trước khi khám, không uống rượu bia 24h trước",
              notes: "Kết quả có sau 2-3 ngày làm việc",
              createdAt: new Date(),
              updatedAt: new Date()
            }, {
              name: "Gói khám sức khỏe tổng quát cơ bản cho nam (PKYD1M)",
              description: "Gói khám sức khỏe cơ bản dành cho nam giới",
              price: 2200000.0,
              image: "/images/packages/093819goi-kham-suc-khoe-co-ban.jpg",
              category: "Cơ bản",
              gender: "male",
              ageRange: "18-65",
              duration: 90,
              isActive: true,
              isFeatured: true,
              facilityId: 22,
              // Phòng khám Bệnh viện Đại học Y Dược 1
              specialtyId: 1,
              includedServices: JSON.stringify(["Khám tổng quát", "Xét nghiệm máu cơ bản", "Xét nghiệm nước tiểu", "Siêu âm ổ bụng", "X-quang tim phổi", "Điện tâm đồ", "Tư vấn sức khỏe"]),
              excludedServices: JSON.stringify(["Thuốc điều trị", "Phẫu thuật", "Điều trị chuyên khoa"]),
              requirements: "Nhịn ăn 8-12 giờ trước khi khám",
              notes: "Gói khám cơ bản phù hợp cho mọi lứa tuổi",
              createdAt: new Date(),
              updatedAt: new Date()
            }, {
              name: "Gói khám sức khỏe tổng quát cơ bản cho nữ (PKYD1F)",
              description: "Gói khám sức khỏe cơ bản dành cho nữ giới",
              price: 2200000.0,
              image: "/images/packages/093819goi-kham-suc-khoe-co-ban.jpg",
              category: "Cơ bản",
              gender: "female",
              ageRange: "18-65",
              duration: 90,
              isActive: true,
              isFeatured: true,
              facilityId: 22,
              // Phòng khám Bệnh viện Đại học Y Dược 1
              specialtyId: 1,
              includedServices: JSON.stringify(["Khám tổng quát", "Xét nghiệm máu cơ bản", "Xét nghiệm nước tiểu", "Siêu âm ổ bụng", "X-quang tim phổi", "Điện tâm đồ", "Khám phụ khoa cơ bản", "Tư vấn sức khỏe"]),
              excludedServices: JSON.stringify(["Thuốc điều trị", "Phẫu thuật", "Điều trị chuyên khoa"]),
              requirements: "Nhịn ăn 8-12 giờ trước khi khám",
              notes: "Gói khám cơ bản phù hợp cho mọi lứa tuổi",
              createdAt: new Date(),
              updatedAt: new Date()
            }, {
              name: "Gói khám sức khỏe tổng quát định kỳ nâng cao Nữ (TC3F)",
              description: "Gói khám sức khỏe nâng cao dành cho nữ giới",
              price: 4524000.0,
              image: "/images/packages/141342-goi-kham-dinh-ky-tong-quat-nang-cao.jpg",
              category: "Nâng cao",
              gender: "female",
              ageRange: "25-70",
              duration: 180,
              isActive: true,
              isFeatured: true,
              facilityId: 23,
              // Hệ thống Y tế Thu Cúc TCI
              specialtyId: 1,
              includedServices: JSON.stringify(["Khám tổng quát nâng cao", "Xét nghiệm máu nâng cao", "Xét nghiệm nước tiểu", "Siêu âm toàn bộ", "X-quang tim phổi", "Điện tâm đồ", "Nội soi dạ dày", "Khám phụ khoa nâng cao", "Tư vấn dinh dưỡng", "Tư vấn sức khỏe"]),
              excludedServices: JSON.stringify(["Thuốc điều trị", "Phẫu thuật"]),
              requirements: "Nhịn ăn 12 giờ trước khi khám",
              notes: "Gói khám nâng cao với nhiều xét nghiệm chuyên sâu",
              createdAt: new Date(),
              updatedAt: new Date()
            }, {
              name: "Gói khám sức khỏe tổng quát định kỳ nâng cao Nam (TC3M)",
              description: "Gói khám sức khỏe nâng cao dành cho nam giới",
              price: 3960000.0,
              image: "/images/packages/141342-goi-kham-dinh-ky-tong-quat-nang-cao (1).jpg",
              category: "Nâng cao",
              gender: "male",
              ageRange: "25-70",
              duration: 180,
              isActive: true,
              isFeatured: true,
              facilityId: 23,
              // Hệ thống Y tế Thu Cúc TCI
              specialtyId: 1,
              includedServices: JSON.stringify(["Khám tổng quát nâng cao", "Xét nghiệm máu nâng cao", "Xét nghiệm nước tiểu", "Siêu âm toàn bộ", "X-quang tim phổi", "Điện tâm đồ", "Nội soi dạ dày", "Khám nam khoa nâng cao", "Tư vấn dinh dưỡng", "Tư vấn sức khỏe"]),
              excludedServices: JSON.stringify(["Thuốc điều trị", "Phẫu thuật"]),
              requirements: "Nhịn ăn 12 giờ trước khi khám",
              notes: "Gói khám nâng cao với nhiều xét nghiệm chuyên sâu",
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
            return queryInterface.bulkDelete("Packages", null, {});
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