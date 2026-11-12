const rbac = require("../services/rbacService");
const audit = require("../services/auditService");
const db = require("../models/index");
const { P } = require("../config/permissions");

/** Ngắt các socket đang mở của user (đổi vai trò / khoá tài khoản có hiệu lực ngay). */
const kickSockets = (req, userId) => {
  try {
    const io = req.app && req.app.get("socketio");
    if (io) io.in(`user:${userId}`).disconnectSockets(true);
  } catch (e) {
    console.error("[RBAC] kickSockets:", e.message);
  }
};

const handle = (fn) => async (req, res) => {
  try {
    const data = await fn(req, res);
    if (!res.headersSent) return res.status(200).json({ errCode: 0, errMessage: "OK", ...(data || {}) });
  } catch (e) {
    if (e instanceof rbac.RbacError) {
      return res.status(e.status).json({ errCode: e.status, errMessage: e.message });
    }
    console.error("[RBAC controller]", e);
    return res.status(500).json({ errCode: -1, errMessage: "Lỗi từ server!" });
  }
};

/** Quyền hiệu lực của người đang đăng nhập (frontend dùng để ẩn/hiện chức năng). */
const me = handle(async (req) => ({
  user: { id: req.user.id, email: req.user.email, roleId: req.user.roleId },
  permissions: [...req.user.permissions].sort(),
}));

const listRoles = handle(async () => ({ roles: await rbac.listRoles() }));
const listPermissions = handle(async () => ({ permissions: await rbac.listPermissions() }));

const createRole = handle(async (req) => {
  await rbac.createRole(req.body || {});
  audit.log({ req, action: "ROLE_CREATE", resource: "role", resourceId: req.body.code });
});

const setRolePermissions = handle(async (req) => {
  const { before, after } = await rbac.setRolePermissions(req.params.code, (req.body || {}).permissions);
  audit.log({
    req,
    action: "ROLE_PERMISSIONS_CHANGE",
    resource: "role",
    resourceId: req.params.code,
    meta: {
      added: after.filter((p) => !before.includes(p)),
      removed: before.filter((p) => !after.includes(p)),
    },
  });
});

const deleteRole = handle(async (req) => {
  await rbac.deleteRole(req.params.code);
  audit.log({ req, action: "ROLE_DELETE", resource: "role", resourceId: req.params.code });
});

const assignRole = handle(async (req) => {
  const { before, after } = await rbac.assignRole({
    actorId: req.user.id,
    userId: req.params.id,
    roleCode: (req.body || {}).roleId,
  });
  kickSockets(req, req.params.id);
  audit.log({ req, action: "ROLE_ASSIGN", resource: "user", resourceId: req.params.id, meta: { before, after } });
});

const setActive = handle(async (req) => {
  const isActive = !!(req.body || {}).isActive;
  await rbac.setActive({ actorId: req.user.id, userId: req.params.id, isActive });
  if (!isActive) kickSockets(req, req.params.id);
  audit.log({ req, action: isActive ? "USER_ACTIVATE" : "USER_DEACTIVATE", resource: "user", resourceId: req.params.id });
});

const auditLogs = handle(async (req) => audit.search(req.query));

/**
 * Chặn đổi vai trò "lén" qua create_new_users / edit_users:
 *  - đổi vai trò cần quyền role:assign, không được tự đổi vai trò của chính mình
 *  - tạo user mới với vai trò khác bệnh nhân (R3) cũng cần role:assign
 *  - phải còn ≥1 admin hoạt động; đổi vai trò -> thu hồi token cũ (xử lý trong rbac.assignRole)
 * Với edit_users: nếu roleId đổi, chuyển sang rbac.assignRole để dùng chung các ràng buộc.
 */
const guardRoleChange = async (req, res, next) => {
  try {
    const body = req.body || {};
    const canAssign = req.user.permissions.has(P.ROLE_ASSIGN);
    const deny = (msg) => res.status(403).json({ errCode: -1, errMessage: msg });

    if (req.method === "POST") {
      if (body.roleId && body.roleId !== "R3" && !canAssign) return deny("Cần quyền gán vai trò");
      return next();
    }
    // PUT /api/edit_users
    if (!body.id || !body.roleId) return next();
    const target = await db.User.findOne({ where: { id: body.id }, attributes: ["id", "roleId"], raw: true });
    if (target && target.roleId !== body.roleId) {
      if (!canAssign) return deny("Cần quyền gán vai trò");
      const { before, after } = await rbac.assignRole({
        actorId: req.user.id,
        userId: body.id,
        roleCode: body.roleId,
      });
      kickSockets(req, body.id);
      audit.log({ req, action: "ROLE_ASSIGN", resource: "user", resourceId: body.id, meta: { before, after } });
    }
    return next();
  } catch (e) {
    if (e instanceof rbac.RbacError) return res.status(e.status).json({ errCode: e.status, errMessage: e.message });
    console.error("[guardRoleChange]", e);
    return res.status(500).json({ errCode: -1, errMessage: "Lỗi từ server!" });
  }
};

module.exports = {
  me,
  listRoles,
  listPermissions,
  createRole,
  setRolePermissions,
  deleteRole,
  assignRole,
  setActive,
  auditLogs,
  guardRoleChange,
};
