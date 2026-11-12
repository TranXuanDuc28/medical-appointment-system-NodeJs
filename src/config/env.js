require("dotenv").config();

const REQUIRED = [
  "DB_DATABASE_NAME",
  "DB_USERNAME",
  "DB_HOST",
  "DB_DIALECT",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
];

/**
 * Dừng ứng dụng ngay lúc khởi động nếu thiếu biến môi trường bắt buộc.
 * Không còn secret mặc định hard-code (trước đây token có thể bị giả mạo nếu quên set .env).
 */
const validateEnv = () => {
  const missing = REQUIRED.filter((k) => !process.env[k] || !process.env[k].trim());
  if (missing.length) {
    throw new Error(
      `Thiếu biến môi trường bắt buộc: ${missing.join(", ")}. Xem backend/.env.example`
    );
  }
  if (process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) {
    throw new Error("JWT_SECRET và JWT_REFRESH_SECRET phải khác nhau");
  }
  const weak = ["JWT_SECRET", "JWT_REFRESH_SECRET"].filter(
    (k) => process.env[k].length < 32
  );
  if (weak.length && process.env.NODE_ENV === "production") {
    throw new Error(`${weak.join(", ")} phải dài tối thiểu 32 ký tự khi chạy production`);
  }
  if (weak.length) {
    console.warn(`⚠️ ${weak.join(", ")} ngắn hơn 32 ký tự – chỉ chấp nhận ở môi trường dev.`);
  }
};

module.exports = { validateEnv };
