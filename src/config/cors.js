require("dotenv").config();

const DEV_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3})(:\d+)?$/;

const allowedList = () =>
  [process.env.URL_REACT, ...(process.env.CORS_ORIGINS || "").split(",")]
    .map((s) => (s || "").trim().replace(/\/$/, ""))
    .filter(Boolean);

/**
 * Whitelist origin. Request không có Origin (curl, server-to-server như chatbot) được cho qua.
 * localhost / mạng LAN chỉ được phép khi KHÔNG chạy production
 * (muốn demo qua LAN ở production hãy khai báo vào CORS_ORIGINS).
 */
const isOriginAllowed = (origin) => {
  if (!origin) return true;
  if (allowedList().includes(origin.replace(/\/$/, ""))) return true;
  if (process.env.NODE_ENV !== "production" && DEV_ORIGIN.test(origin)) return true;
  return false;
};

const corsOptions = {
  origin: (origin, cb) => cb(null, isOriginAllowed(origin)),
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["X-Requested-With", "Content-Type", "Authorization", "Origin", "Accept"],
};

module.exports = { isOriginAllowed, corsOptions };
