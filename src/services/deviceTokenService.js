/** FCM token đa thiết bị (bảng device_tokens). Thay cho users.fcmToken cũ. */
const crypto = require("crypto");
const db = require("../models/index");

const hash = (t) => crypto.createHash("sha256").update(String(t)).digest("hex");

/** Danh sách token của một user (mảng chuỗi). */
const getTokens = async (userId) => {
  const rows = await db.DeviceToken.findAll({ where: { userId }, attributes: ["token"], raw: true });
  return rows.map((r) => r.token);
};

/** Lưu token (idempotent: token đã có thì chuyển về user hiện tại + cập nhật last_seen). */
const saveToken = async (userId, token, platform = "web") => {
  const tokenHash = hash(token);
  const existing = await db.DeviceToken.findOne({ where: { tokenHash }, raw: false });
  if (existing) {
    await existing.update({ userId, lastSeenAt: new Date(), platform });
    return existing;
  }
  return db.DeviceToken.create({ userId, token, tokenHash, platform, lastSeenAt: new Date() });
};

const removeToken = (token) => db.DeviceToken.destroy({ where: { tokenHash: hash(token) } });

module.exports = { getTokens, saveToken, removeToken };
