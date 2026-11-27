const jwt = require("jsonwebtoken");
require("dotenv").config();

// Secret đọc lazily và KHÔNG có giá trị mặc định: thiếu biến môi trường là lỗi (xem config/env.js)
const need = (name) => {
  const v = process.env[name];
  if (!v) throw new Error(`Thiếu biến môi trường ${name}`);
  return v;
};

const sign = (payload, secretName, expiresIn) =>
  jwt.sign(payload, need(secretName), { expiresIn });

const verify = (token, secretName) => {
  try {
    return jwt.verify(token, need(secretName));
  } catch (err) {
    return null; // token sai/hết hạn: không log stack trace cho mỗi request
  }
};

const createJWT = (payload) =>
  sign(payload, "JWT_SECRET", process.env.JWT_EXPIRES_IN || "15m");

const verifyToken = (token) => verify(token, "JWT_SECRET");

const createRefreshToken = (payload) =>
  sign(payload, "JWT_REFRESH_SECRET", process.env.JWT_REFRESH_EXPIRES_IN || "7d");

const verifyRefreshToken = (token) => verify(token, "JWT_REFRESH_SECRET");

module.exports = {
  createJWT,
  verifyToken,
  createRefreshToken,
  verifyRefreshToken,
};
