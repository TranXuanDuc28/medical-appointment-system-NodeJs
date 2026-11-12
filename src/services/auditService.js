/**
 * Nhật ký truy cập/thao tác nhạy cảm (đọc hồ sơ bệnh án, đổi quyền, đăng nhập...).
 * Ghi bất đồng bộ, lỗi ghi log không được làm hỏng request.
 */
const db = require("../models/index");

const clientIp = (req) => (req && (req.ip || (req.socket && req.socket.remoteAddress))) || null;

/**
 * @param {object} p
 * @param {object} [p.req]      request (lấy user, ip)
 * @param {object} [p.actor]    {id, roleId} nếu không có req
 * @param {string} p.action     vd. RECORD_READ, ROLE_ASSIGN, LOGIN_FAILED
 * @param {string} [p.resource] vd. patient-record
 * @param {string|number} [p.resourceId]
 * @param {'ALLOWED'|'DENIED'|'FAILED'} [p.result]
 * @param {object} [p.meta]
 */
const log = ({ req, actor, action, resource, resourceId, result = "ALLOWED", meta }) => {
  const user = actor || (req && req.user) || {};
  const row = {
    userId: user.id || null,
    roleCode: user.roleId || null,
    action,
    resource: resource || null,
    resourceId: resourceId !== undefined && resourceId !== null ? String(resourceId).slice(0, 64) : null,
    result,
    ip: clientIp(req),
    meta: meta ? JSON.stringify(meta).slice(0, 4000) : null,
  };
  const p = db.sequelize.models.AccessAuditLog.create(row).catch((e) =>
    console.error("[Audit] ghi log lỗi:", e.message)
  );
  return p; // test có thể await; production bỏ qua
};

const search = async ({ userId, action, resource, resourceId, result, from, to, limit = 50, offset = 0 }) => {
  const { Op } = require("sequelize");
  const where = {};
  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (resource) where.resource = resource;
  if (resourceId) where.resourceId = String(resourceId);
  if (result) where.result = result;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt[Op.gte] = new Date(from);
    if (to) where.createdAt[Op.lte] = new Date(to);
  }
  const lim = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const { rows, count } = await db.sequelize.models.AccessAuditLog.findAndCountAll({
    where,
    order: [["id", "DESC"]],
    limit: lim,
    offset: Math.max(Number(offset) || 0, 0),
    raw: true,
  });
  return { total: count, items: rows };
};

module.exports = { log, search };
