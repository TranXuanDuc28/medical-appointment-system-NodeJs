"use strict";

var _express = _interopRequireDefault(require("express"));
var _bodyParser = _interopRequireDefault(require("body-parser"));
var _viewEngine = _interopRequireDefault(require("./config/viewEngine"));
var _web = _interopRequireDefault(require("./route/web"));
var _connectDB = _interopRequireDefault(require("./config/connectDB"));
var _http = _interopRequireDefault(require("http"));
var _index = require("./socket/index.js");
var _path = _interopRequireDefault(require("path"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { "default": e }; }
require("dotenv").config();
var app = (0, _express["default"])();
// app.use(cors({origin: true}));
app.use(function (req, res, next) {
  // Website you wish to allow to connect
  res.setHeader("Access-Control-Allow-Origin", process.env.URL_REACT);

  // Request methods you wish to allow
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");

  // Request headers you wish to allow
  res.setHeader("Access-Control-Allow-Headers", "X-Requested-With,content-type");

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader("Access-Control-Allow-Credentials", true);

  // Pass to next layer of middleware
  next();
});
//config app

app.use(_bodyParser["default"].json({
  limit: "50mb"
}));
app.use(_bodyParser["default"].urlencoded({
  limit: "50mb",
  extended: true
}));
(0, _viewEngine["default"])(app);
(0, _web["default"])(app);

// Serve static cho thư mục uploads
app.use("/uploads", _express["default"]["static"](_path["default"].join(__dirname, "public/uploads")));
(0, _connectDB["default"])();
var server = _http["default"].createServer(app);
(0, _index.socketInit)(app, server);
var port = process.env.PORT || 6969;
server.listen(port, function () {
  console.log("Backend Nodejs dang chay voi cong port: " + port);
});