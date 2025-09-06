"use strict";

var _express = _interopRequireDefault(require("express"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { "default": e }; }
// import

//khoi tao configViewEngine
var configViewEngine = function configViewEngine(app) {
  app.use(_express["default"]["static"]("./src/public"));
  app.set("view engine", "ejs");
  app.set("views", "./src/views");
};

//exports vao module
module.exports = configViewEngine;