const { rateLimit } = require("express-rate-limit");

const make = (windowMinutes, max, message) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit: max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (req, res) =>
      res.status(429).json({ errCode: -1, errMessage: message }),
  });

// Chống dò mật khẩu / spam đăng ký
const authLimiter = make(15, 30, "Quá nhiều lần thử, vui lòng thử lại sau 15 phút");
// Chống spam giữ chỗ / gửi email hàng loạt
const bookingLimiter = make(10, 15, "Bạn thao tác đặt lịch quá nhanh, vui lòng thử lại sau");
// Gợi ý chuyên khoa công khai: chống lạm dụng tài nguyên AI
const aiLimiter = make(10, 40, "Bạn gửi quá nhiều yêu cầu gợi ý, vui lòng thử lại sau");
// Giới hạn chung cho toàn bộ API
const apiLimiter = make(1, 600, "Quá nhiều yêu cầu, vui lòng chậm lại");

module.exports = { authLimiter, bookingLimiter, aiLimiter, apiLimiter };
