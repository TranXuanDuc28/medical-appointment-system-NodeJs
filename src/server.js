require("dotenv").config();
import { validateEnv } from "./config/env";
// Dừng sớm nếu thiếu cấu hình bắt buộc (JWT secret, DB...)
validateEnv();

import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import helmet from "helmet";
import viewEngine from "./config/viewEngine";
import initWebRoutes from "./route/web";
import cookieParser from "cookie-parser";
import connectDB from "./config/connectDB";
import http from "http";
import { socketInit } from "./socket/index.js";
import path from "path";
import { initRedis } from "./utils/redis";
import { initQueue } from "./utils/queue";
import { corsOptions } from "./config/cors";
import { accessControl } from "./middleware/accessControl";
import { apiLimiter } from "./middleware/rateLimit";
import { startHoldSweeper } from "./services/bookingService";
import { syncRbac } from "./services/rbacService";
import { purgeExpired } from "./services/tokenService";

let app = express();

// Đứng sau reverse proxy (Railway/Nginx...) thì bật để rate-limit lấy đúng IP
if (process.env.TRUST_PROXY) app.set("trust proxy", Number(process.env.TRUST_PROXY) || 1);

// Header bảo mật; cho phép ảnh /uploads được nhúng từ frontend khác origin
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors(corsOptions));

// 10MB đủ cho ảnh base64 / nội dung markdown; upload file lớn đi qua multer riêng
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));
app.use(cookieParser());

viewEngine(app);

// Giới hạn tần suất chung + phân quyền default-deny cho mọi /api/*
app.use("/api", apiLimiter);
app.use(accessControl);

initWebRoutes(app);

// Serve static cho thư mục uploads
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// Error handler cuối cùng: không lộ stack trace
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("[Unhandled]", err);
  if (err && err.type === "entity.too.large") {
    return res.status(413).json({ errCode: -1, errMessage: "Dữ liệu gửi lên quá lớn" });
  }
  return res.status(err && err.status ? err.status : 500).json({
    errCode: -1,
    errMessage: "Lỗi từ server!",
  });
});

connectDB().then(async () => {
  try {
    const r = await syncRbac();
    console.log("✅ RBAC đã đồng bộ:", JSON.stringify(r));
    purgeExpired().catch(() => {});
    setInterval(() => purgeExpired().catch(() => {}), 24 * 3600 * 1000).unref();
  } catch (e) {
    console.error(
      "❌ Không đồng bộ được RBAC. Đã chạy migration chưa? (npx sequelize-cli db:migrate):",
      e.message
    );
  }
});
initRedis();
initQueue();
startHoldSweeper(); // nhả slot đặt lịch quá hạn xác nhận email

const server = http.createServer(app);
socketInit(app, server);

let port = process.env.PORT || 6969;
server.listen(port, () => {
  console.log("Backend Nodejs dang chay voi cong port: " + port);
});
