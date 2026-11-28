/**
 * Gửi thông báo cho người dùng: ghi bảng notifications (INAPP) rồi đẩy FCM tới mọi thiết bị.
 * dedupeKey UNIQUE => cùng một sự kiện chỉ gửi đúng 1 lần dù scheduler quét lặp hoặc job retry.
 */
const db = require("../models/index");
const deviceTokens = require("./deviceTokenService");
const { sendPushNotification } = require("../config/firebase");

const isDuplicate = (e) => e && (e.name === "SequelizeUniqueConstraintError" || (e.parent && e.parent.code === "ER_DUP_ENTRY"));

/**
 * @returns {Promise<{sent:boolean, duplicate?:boolean, id?:number}>}
 */
const notify = async ({ userId, type, title, body, payload = null, dedupeKey = null, push = true }) => {
  let row;
  try {
    row = await db.Notification.create({ userId, type, channel: "INAPP", title, body, payload, dedupeKey }, { raw: false });
  } catch (e) {
    if (isDuplicate(e)) return { sent: false, duplicate: true };
    throw e;
  }
  if (push) {
    try {
      const tokens = await deviceTokens.getTokens(userId);
      await Promise.all(
        tokens.map((t) => Promise.resolve(sendPushNotification(t, title, body, { type, ...(payload || {}) })).catch(() => {}))
      );
    } catch (e) {
      console.error("[Notify] đẩy push lỗi:", e.message); // thông báo INAPP đã lưu, push lỗi không làm hỏng luồng
    }
  }
  await row.update({ sentAt: new Date() });
  return { sent: true, id: Number(row.id) };
};

module.exports = { notify };
