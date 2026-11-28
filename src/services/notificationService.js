/**
 * Gửi thông báo cho người dùng: ghi bảng notifications (INAPP) rồi đẩy FCM tới mọi thiết bị.
 * dedupeKey UNIQUE => cùng một sự kiện chỉ gửi đúng 1 lần dù scheduler quét lặp hoặc job retry.
 */
const { Op } = require("sequelize");
const db = require("../models/index");
const deviceTokens = require("./deviceTokenService");
const { sendPushNotification } = require("../config/firebase");
const { emitNotified } = require("../utils/queueBus");

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
  emitNotified({ userId: Number(userId), notification: toPublic(row.get({ plain: true })) });
  return { sent: true, id: Number(row.id) };
};

/* ------------------------------ đọc thông báo (API cho frontend) ------------------------------ */

/** Dạng trả về cho client: không lộ dedupe_key/kênh nội bộ. */
const toPublic = (r) => {
  let payload = r.payload;
  if (typeof payload === "string") {
    try { payload = JSON.parse(payload); } catch (_) { payload = null; }
  }
  return {
    id: Number(r.id), type: r.type, title: r.title, body: r.body, payload: payload || null,
    createdAt: r.createdAt || r.created_at, readAt: r.readAt || r.read_at || null, isRead: !!(r.readAt || r.read_at),
  };
};

const unreadCount = (userId) => db.Notification.count({ where: { userId, readAt: null } });

/**
 * Danh sách thông báo của chính người dùng, mới nhất trước, phân trang theo con trỏ (before = id nhỏ nhất đã có).
 * @returns {{items, unreadCount, nextBefore}}  nextBefore = null khi hết dữ liệu
 */
const list = async ({ userId, limit = 20, before = null, unreadOnly = false }) => {
  const n = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const where = { userId };
  if (unreadOnly) where.readAt = null;
  const b = parseInt(before, 10);
  if (Number.isInteger(b) && b > 0) where.id = { [Op.lt]: b };
  const rows = await db.Notification.findAll({ where, order: [["id", "DESC"]], limit: n + 1, raw: true });
  const more = rows.length > n;
  const items = rows.slice(0, n).map(toPublic);
  return { items, unreadCount: await unreadCount(userId), nextBefore: more ? items[items.length - 1].id : null };
};

/** Đánh dấu đã đọc một thông báo (chỉ của chính mình). Idempotent. */
const markRead = async ({ userId, id }) => {
  const row = await db.Notification.findOne({ where: { id, userId }, attributes: ["id", "readAt"], raw: true });
  if (!row) return { found: false };
  if (!row.readAt) await db.Notification.update({ readAt: new Date() }, { where: { id, userId, readAt: null } });
  return { found: true, unreadCount: await unreadCount(userId) };
};

const markAllRead = async ({ userId }) => {
  const [updated] = await db.Notification.update({ readAt: new Date() }, { where: { userId, readAt: null } });
  return { updated, unreadCount: 0 };
};

module.exports = { notify, list, unreadCount, markRead, markAllRead, toPublic };
