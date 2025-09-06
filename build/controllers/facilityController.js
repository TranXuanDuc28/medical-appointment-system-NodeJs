"use strict";

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
var _bodyParser = require("body-parser");
var _index = _interopRequireDefault(require("../models/index"));
var _sequelize = require("sequelize");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { "default": e }; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
var getAllFacilities = /*#__PURE__*/function () {
  var _ref = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(req, res) {
    var facilities, _t;
    return _regenerator().w(function (_context) {
      while (1) switch (_context.p = _context.n) {
        case 0:
          _context.p = 0;
          _context.n = 1;
          return _index["default"].Facility.findAll({
            where: {
              isActive: true
            },
            order: [['isFeatured', 'DESC'], ['rating', 'DESC']],
            raw: false
          });
        case 1:
          facilities = _context.v;
          return _context.a(2, res.status(200).json({
            errCode: 0,
            message: 'OK',
            data: facilities
          }));
        case 2:
          _context.p = 2;
          _t = _context.v;
          console.log(_t);
          return _context.a(2, res.status(500).json({
            errCode: -1,
            message: 'Error from server',
            error: _t.message
          }));
      }
    }, _callee, null, [[0, 2]]);
  }));
  return function getAllFacilities(_x, _x2) {
    return _ref.apply(this, arguments);
  };
}();
var getFeaturedFacilities = /*#__PURE__*/function () {
  var _ref2 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2(req, res) {
    var facilities, _t2;
    return _regenerator().w(function (_context2) {
      while (1) switch (_context2.p = _context2.n) {
        case 0:
          _context2.p = 0;
          _context2.n = 1;
          return _index["default"].Facility.findAll({
            where: {
              isActive: true,
              isFeatured: true
            },
            order: [['rating', 'DESC'], ['totalReviews', 'DESC']],
            limit: 10,
            raw: false
          });
        case 1:
          facilities = _context2.v;
          return _context2.a(2, res.status(200).json({
            errCode: 0,
            message: 'OK',
            data: facilities
          }));
        case 2:
          _context2.p = 2;
          _t2 = _context2.v;
          console.log(_t2);
          return _context2.a(2, res.status(500).json({
            errCode: -1,
            message: 'Error from server',
            error: _t2.message
          }));
      }
    }, _callee2, null, [[0, 2]]);
  }));
  return function getFeaturedFacilities(_x3, _x4) {
    return _ref2.apply(this, arguments);
  };
}();
var getFacilityById = /*#__PURE__*/function () {
  var _ref3 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3(req, res) {
    var id, facility, _t3;
    return _regenerator().w(function (_context3) {
      while (1) switch (_context3.p = _context3.n) {
        case 0:
          _context3.p = 0;
          id = req.params.id;
          if (id) {
            _context3.n = 1;
            break;
          }
          return _context3.a(2, res.status(400).json({
            errCode: 1,
            message: 'Missing required parameter'
          }));
        case 1:
          _context3.n = 2;
          return _index["default"].Facility.findOne({
            where: {
              id: id,
              isActive: true
            },
            include: [{
              model: _index["default"].Package,
              as: 'packages',
              where: {
                isActive: true
              },
              required: false,
              attributes: ['id', 'name', 'price', 'category', 'image']
            }],
            raw: false
          });
        case 2:
          facility = _context3.v;
          if (facility) {
            _context3.n = 3;
            break;
          }
          return _context3.a(2, res.status(404).json({
            errCode: 2,
            message: 'Facility not found'
          }));
        case 3:
          return _context3.a(2, res.status(200).json({
            errCode: 0,
            message: 'OK',
            data: facility
          }));
        case 4:
          _context3.p = 4;
          _t3 = _context3.v;
          console.log(_t3);
          return _context3.a(2, res.status(500).json({
            errCode: -1,
            message: 'Error from server',
            error: _t3.message
          }));
      }
    }, _callee3, null, [[0, 4]]);
  }));
  return function getFacilityById(_x5, _x6) {
    return _ref3.apply(this, arguments);
  };
}();
var searchFacilities = /*#__PURE__*/function () {
  var _ref4 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4(req, res) {
    var _req$query, keyword, type, level, minRating, _req$query$sortBy, sortBy, _req$query$sortOrder, sortOrder, _req$query$limit, limit, _req$query$offset, offset, whereClause, allowedSortFields, allowedSortOrders, orderClause, facilities, types, levels, _t4;
    return _regenerator().w(function (_context4) {
      while (1) switch (_context4.p = _context4.n) {
        case 0:
          _context4.p = 0;
          _req$query = req.query, keyword = _req$query.keyword, type = _req$query.type, level = _req$query.level, minRating = _req$query.minRating, _req$query$sortBy = _req$query.sortBy, sortBy = _req$query$sortBy === void 0 ? 'rating' : _req$query$sortBy, _req$query$sortOrder = _req$query.sortOrder, sortOrder = _req$query$sortOrder === void 0 ? 'DESC' : _req$query$sortOrder, _req$query$limit = _req$query.limit, limit = _req$query$limit === void 0 ? 10 : _req$query$limit, _req$query$offset = _req$query.offset, offset = _req$query$offset === void 0 ? 0 : _req$query$offset;
          whereClause = {
            isActive: true
          }; // Search by keyword in name and description
          if (keyword) {
            whereClause[_sequelize.Op.or] = [{
              name: _defineProperty({}, _sequelize.Op.like, "%".concat(keyword, "%"))
            }, {
              description: _defineProperty({}, _sequelize.Op.like, "%".concat(keyword, "%"))
            }, {
              address: _defineProperty({}, _sequelize.Op.like, "%".concat(keyword, "%"))
            }];
          }

          // Filter by type
          if (type) {
            whereClause.type = type;
          }

          // Filter by level
          if (level) {
            whereClause.level = level;
          }

          // Filter by minimum rating
          if (minRating) {
            whereClause.rating = _defineProperty({}, _sequelize.Op.gte, parseFloat(minRating));
          }

          // Validate sort parameters
          allowedSortFields = ['name', 'rating', 'totalReviews', 'createdAt', 'isFeatured'];
          allowedSortOrders = ['ASC', 'DESC'];
          if (!allowedSortFields.includes(sortBy)) {
            sortBy = 'rating';
          }
          if (!allowedSortOrders.includes(sortOrder.toUpperCase())) {
            sortOrder = 'DESC';
          }
          orderClause = [[sortBy, sortOrder.toUpperCase()]];
          if (sortBy !== 'isFeatured') {
            orderClause.unshift(['isFeatured', 'DESC']);
          }
          _context4.n = 1;
          return _index["default"].Facility.findAndCountAll({
            where: whereClause,
            include: [{
              model: _index["default"].Package,
              as: 'packages',
              where: {
                isActive: true
              },
              required: false,
              attributes: ['id', 'name', 'price', 'category']
            }],
            order: orderClause,
            limit: parseInt(limit),
            offset: parseInt(offset),
            raw: false
          });
        case 1:
          facilities = _context4.v;
          _context4.n = 2;
          return _index["default"].Facility.findAll({
            where: {
              isActive: true
            },
            attributes: [[_index["default"].sequelize.fn('DISTINCT', _index["default"].sequelize.col('type')), 'type']],
            raw: true
          });
        case 2:
          types = _context4.v;
          _context4.n = 3;
          return _index["default"].Facility.findAll({
            where: {
              isActive: true
            },
            attributes: [[_index["default"].sequelize.fn('DISTINCT', _index["default"].sequelize.col('level')), 'level']],
            raw: true
          });
        case 3:
          levels = _context4.v;
          return _context4.a(2, res.status(200).json({
            errCode: 0,
            message: 'OK',
            data: {
              facilities: facilities.rows,
              total: facilities.count,
              limit: parseInt(limit),
              offset: parseInt(offset),
              filters: {
                types: types.map(function (t) {
                  return t.type;
                }).filter(Boolean),
                levels: levels.map(function (l) {
                  return l.level;
                }).filter(Boolean)
              }
            }
          }));
        case 4:
          _context4.p = 4;
          _t4 = _context4.v;
          console.log(_t4);
          return _context4.a(2, res.status(500).json({
            errCode: -1,
            message: 'Error from server',
            error: _t4.message
          }));
      }
    }, _callee4, null, [[0, 4]]);
  }));
  return function searchFacilities(_x7, _x8) {
    return _ref4.apply(this, arguments);
  };
}();
var createFacility = /*#__PURE__*/function () {
  var _ref5 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5(req, res) {
    var data, newFacility, _t5;
    return _regenerator().w(function (_context5) {
      while (1) switch (_context5.p = _context5.n) {
        case 0:
          _context5.p = 0;
          data = req.body;
          if (data.name) {
            _context5.n = 1;
            break;
          }
          return _context5.a(2, res.status(400).json({
            errCode: 1,
            message: 'Missing required fields'
          }));
        case 1:
          _context5.n = 2;
          return _index["default"].Facility.create({
            name: data.name,
            description: data.description,
            logo: data.logo,
            address: data.address,
            phone: data.phone,
            email: data.email,
            website: data.website,
            type: data.type || 'clinic',
            level: data.level || 'private',
            isActive: data.isActive !== undefined ? data.isActive : true,
            isFeatured: data.isFeatured || false,
            rating: data.rating || 0,
            totalReviews: data.totalReviews || 0,
            workingHours: data.workingHours ? JSON.stringify(data.workingHours) : null,
            services: data.services ? JSON.stringify(data.services) : null,
            specialties: data.specialties ? JSON.stringify(data.specialties) : null,
            images: data.images ? JSON.stringify(data.images) : null,
            location: data.location ? JSON.stringify(data.location) : null
          });
        case 2:
          newFacility = _context5.v;
          return _context5.a(2, res.status(201).json({
            errCode: 0,
            message: 'Facility created successfully',
            data: newFacility
          }));
        case 3:
          _context5.p = 3;
          _t5 = _context5.v;
          console.log(_t5);
          return _context5.a(2, res.status(500).json({
            errCode: -1,
            message: 'Error from server',
            error: _t5.message
          }));
      }
    }, _callee5, null, [[0, 3]]);
  }));
  return function createFacility(_x9, _x0) {
    return _ref5.apply(this, arguments);
  };
}();
var updateFacility = /*#__PURE__*/function () {
  var _ref6 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee6(req, res) {
    var id, data, facility, _t6;
    return _regenerator().w(function (_context6) {
      while (1) switch (_context6.p = _context6.n) {
        case 0:
          _context6.p = 0;
          id = req.params.id;
          data = req.body;
          if (id) {
            _context6.n = 1;
            break;
          }
          return _context6.a(2, res.status(400).json({
            errCode: 1,
            message: 'Missing facility ID'
          }));
        case 1:
          _context6.n = 2;
          return _index["default"].Facility.findByPk(id);
        case 2:
          facility = _context6.v;
          if (facility) {
            _context6.n = 3;
            break;
          }
          return _context6.a(2, res.status(404).json({
            errCode: 2,
            message: 'Facility not found'
          }));
        case 3:
          _context6.n = 4;
          return facility.update({
            name: data.name || facility.name,
            description: data.description || facility.description,
            logo: data.logo || facility.logo,
            address: data.address || facility.address,
            phone: data.phone || facility.phone,
            email: data.email || facility.email,
            website: data.website || facility.website,
            type: data.type || facility.type,
            level: data.level || facility.level,
            isActive: data.isActive !== undefined ? data.isActive : facility.isActive,
            isFeatured: data.isFeatured !== undefined ? data.isFeatured : facility.isFeatured,
            rating: data.rating || facility.rating,
            totalReviews: data.totalReviews || facility.totalReviews,
            workingHours: data.workingHours ? JSON.stringify(data.workingHours) : facility.workingHours,
            services: data.services ? JSON.stringify(data.services) : facility.services,
            specialties: data.specialties ? JSON.stringify(data.specialties) : facility.specialties,
            images: data.images ? JSON.stringify(data.images) : facility.images,
            location: data.location ? JSON.stringify(data.location) : facility.location
          });
        case 4:
          return _context6.a(2, res.status(200).json({
            errCode: 0,
            message: 'Facility updated successfully',
            data: facility
          }));
        case 5:
          _context6.p = 5;
          _t6 = _context6.v;
          console.log(_t6);
          return _context6.a(2, res.status(500).json({
            errCode: -1,
            message: 'Error from server',
            error: _t6.message
          }));
      }
    }, _callee6, null, [[0, 5]]);
  }));
  return function updateFacility(_x1, _x10) {
    return _ref6.apply(this, arguments);
  };
}();
var deleteFacility = /*#__PURE__*/function () {
  var _ref7 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee7(req, res) {
    var id, facility, _t7;
    return _regenerator().w(function (_context7) {
      while (1) switch (_context7.p = _context7.n) {
        case 0:
          _context7.p = 0;
          id = req.params.id;
          if (id) {
            _context7.n = 1;
            break;
          }
          return _context7.a(2, res.status(400).json({
            errCode: 1,
            message: 'Missing facility ID'
          }));
        case 1:
          _context7.n = 2;
          return _index["default"].Facility.findByPk(id);
        case 2:
          facility = _context7.v;
          if (facility) {
            _context7.n = 3;
            break;
          }
          return _context7.a(2, res.status(404).json({
            errCode: 2,
            message: 'Facility not found'
          }));
        case 3:
          _context7.n = 4;
          return facility.update({
            isActive: false
          });
        case 4:
          return _context7.a(2, res.status(200).json({
            errCode: 0,
            message: 'Facility deleted successfully'
          }));
        case 5:
          _context7.p = 5;
          _t7 = _context7.v;
          console.log(_t7);
          return _context7.a(2, res.status(500).json({
            errCode: -1,
            message: 'Error from server',
            error: _t7.message
          }));
      }
    }, _callee7, null, [[0, 5]]);
  }));
  return function deleteFacility(_x11, _x12) {
    return _ref7.apply(this, arguments);
  };
}();
var getFilterOptions = /*#__PURE__*/function () {
  var _ref8 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee8(req, res) {
    var types, levels, ratingStats, _t8;
    return _regenerator().w(function (_context8) {
      while (1) switch (_context8.p = _context8.n) {
        case 0:
          _context8.p = 0;
          _context8.n = 1;
          return _index["default"].Facility.findAll({
            where: {
              isActive: true
            },
            attributes: [[_index["default"].sequelize.fn('DISTINCT', _index["default"].sequelize.col('type')), 'type']],
            raw: true
          });
        case 1:
          types = _context8.v;
          _context8.n = 2;
          return _index["default"].Facility.findAll({
            where: {
              isActive: true
            },
            attributes: [[_index["default"].sequelize.fn('DISTINCT', _index["default"].sequelize.col('level')), 'level']],
            raw: true
          });
        case 2:
          levels = _context8.v;
          _context8.n = 3;
          return _index["default"].Facility.findOne({
            where: {
              isActive: true
            },
            attributes: [[_index["default"].sequelize.fn('MIN', _index["default"].sequelize.col('rating')), 'minRating'], [_index["default"].sequelize.fn('MAX', _index["default"].sequelize.col('rating')), 'maxRating']],
            raw: true
          });
        case 3:
          ratingStats = _context8.v;
          return _context8.a(2, res.status(200).json({
            errCode: 0,
            message: 'OK',
            data: {
              types: types.map(function (t) {
                return t.type;
              }).filter(Boolean),
              levels: levels.map(function (l) {
                return l.level;
              }).filter(Boolean),
              ratingRange: {
                min: ratingStats.minRating || 0,
                max: ratingStats.maxRating || 5
              }
            }
          }));
        case 4:
          _context8.p = 4;
          _t8 = _context8.v;
          console.log(_t8);
          return _context8.a(2, res.status(500).json({
            errCode: -1,
            message: 'Error from server',
            error: _t8.message
          }));
      }
    }, _callee8, null, [[0, 4]]);
  }));
  return function getFilterOptions(_x13, _x14) {
    return _ref8.apply(this, arguments);
  };
}();
module.exports = {
  getAllFacilities: getAllFacilities,
  getFeaturedFacilities: getFeaturedFacilities,
  getFacilityById: getFacilityById,
  searchFacilities: searchFacilities,
  getFilterOptions: getFilterOptions,
  createFacility: createFacility,
  updateFacility: updateFacility,
  deleteFacility: deleteFacility
};