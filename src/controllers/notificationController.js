const notifications = require("../services/notificationService");

/** Mọi endpoint chỉ thao tác trên thông báo của CHÍNH người đăng nhập (userId lấy từ token, không nhận từ client). */
const fail = (res, e, tag) => {
  console.error(`[Notifications] ${tag}:`, e);
  return res.status(500).json({ errCode: -1, errMessage: "Lỗi từ server!" });
};

/** GET /api/notifications?limit=20&before=<id>&unread=1 */
const list = async (req, res) => {
  try {
    const data = await notifications.list({
      userId: req.user.id, limit: req.query.limit, before: req.query.before, unreadOnly: req.query.unread === "1" || req.query.unread === "true",
    });
    return res.status(200).json({ errCode: 0, errMessage: "OK", data });
  } catch (e) {
    return fail(res, e, "list");
  }
};

/** GET /api/notifications/unread-count – số hiện trên chuông */
const unreadCount = async (req, res) => {
  try {
    return res.status(200).json({ errCode: 0, errMessage: "OK", data: { unreadCount: await notifications.unreadCount(req.user.id) } });
  } catch (e) {
    return fail(res, e, "unreadCount");
  }
};

/** POST /api/notifications/:id/read */
const markRead = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ errCode: 1, errMessage: "Mã thông báo không hợp lệ" });
    const r = await notifications.markRead({ userId: req.user.id, id });
    if (!r.found) return res.status(404).json({ errCode: 2, errMessage: "Không tìm thấy thông báo" });
    return res.status(200).json({ errCode: 0, errMessage: "OK", data: { unreadCount: r.unreadCount } });
  } catch (e) {
    return fail(res, e, "markRead");
  }
};

/** POST /api/notifications/read-all */
const markAllRead = async (req, res) => {
  try {
    return res.status(200).json({ errCode: 0, errMessage: "OK", data: await notifications.markAllRead({ userId: req.user.id }) });
  } catch (e) {
    return fail(res, e, "markAllRead");
  }
};

module.exports = { list, unreadCount, markRead, markAllRead };
