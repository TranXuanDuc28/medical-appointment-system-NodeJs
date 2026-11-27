/**
 * RBAC cấp quyền hạn: đồng bộ danh mục quyền, đọc quyền của vai trò (có cache),
 * và các thao tác quản trị vai trò/quyền/người dùng (kèm chống tự khoá hệ thống).
 */
const { Op } = require("sequelize");
const db = require("../models/index");
const {
  PERMISSIONS,
  SYSTEM_ROLES,
  SYSTEM_ROLE_CODES,
  ADMIN_ROLE,
  ADMIN_LOCKED_PERMS,
  DEFAULT_ROLE_PERMISSIONS,
} = require("../config/permissions");

const M = () => db.sequelize.models;
const PERM_TTL_MS = 30 * 1000;
const STATE_TTL_MS = 10 * 1000;

const permCache = new Map(); // roleCode -> { perms:Set, exp }
const stateCache = new Map(); // userId -> { state, exp }

const invalidatePermissions = () => permCache.clear();
const invalidateUser = (userId) => {
  if (userId === undefined) stateCache.clear();
  else stateCache.delete(String(userId));
};

class RbacError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Tạo/đồng bộ vai trò hệ thống + danh mục quyền. Idempotent, chạy lúc khởi động. */
const syncRbac = async () => {
  const { RbacRole, RbacPermission, RbacRolePermission } = M();
  const existingPerms = new Set((await RbacPermission.findAll({ attributes: ["code"], raw: true })).map((p) => p.code));
  const existingRoles = new Set((await RbacRole.findAll({ attributes: ["code"], raw: true })).map((r) => r.code));

  const newPerms = PERMISSIONS.filter((p) => !existingPerms.has(p.code));
  if (newPerms.length) await RbacPermission.bulkCreate(newPerms);

  const newRoles = SYSTEM_ROLES.filter((r) => !existingRoles.has(r.code));
  if (newRoles.length) {
    await RbacRole.bulkCreate(
      newRoles.map((r) => ({ code: r.code, name: r.name, description: r.description, isSystem: true }))
    );
  }

  // Cấp quyền mặc định CHỈ cho (vai trò mới × mọi quyền) và (quyền mới × vai trò hệ thống cũ)
  const grants = [];
  const newPermCodes = new Set(newPerms.map((p) => p.code));
  for (const role of SYSTEM_ROLES) {
    const roleIsNew = !existingRoles.has(role.code);
    for (const code of role.permissions) {
      if (roleIsNew || newPermCodes.has(code)) grants.push({ roleCode: role.code, permissionCode: code });
    }
  }
  if (grants.length) await RbacRolePermission.bulkCreate(grants, { ignoreDuplicates: true });
  invalidatePermissions();

  // Đồng bộ nhãn vai trò vào allcodes (type ROLE) để dropdown vai trò của frontend hiển thị R5–R8
  try {
    const existing = new Set(
      (await db.AllCode.findAll({ where: { type: "ROLE" }, attributes: ["keyMap"], raw: true })).map((a) => a.keyMap)
    );
    const labels = {
      R5: ["Receptionist", "Lễ tân"],
      R6: ["Nurse", "Điều dưỡng"],
      R7: ["Coordinator", "Điều phối viên"],
      R8: ["Display device", "Thiết bị màn hình TV"],
    };
    const missing = Object.entries(labels)
      .filter(([k]) => !existing.has(k))
      .map(([keyMap, [valueEn, valueVi]]) => ({ keyMap, type: "ROLE", valueEn, valueVi }));
    if (missing.length) await db.AllCode.bulkCreate(missing);
  } catch (e) {
    console.warn("[RBAC] Không đồng bộ được allcodes ROLE:", e.message);
  }
  return { newPermissions: newPerms.length, newRoles: newRoles.length, grants: grants.length };
};

/** Quyền của một vai trò (Set). Lỗi DB -> dùng bộ quyền mặc định trong code (baseline an toàn). */
const getRolePermissions = async (roleCode) => {
  const hit = permCache.get(roleCode);
  if (hit && hit.exp > Date.now()) return hit.perms;
  let perms;
  try {
    const rows = await M().RbacRolePermission.findAll({ where: { roleCode }, attributes: ["permissionCode"], raw: true });
    const roleExists = await M().RbacRole.count({ where: { code: roleCode } });
    perms = roleExists ? new Set(rows.map((r) => r.permissionCode)) : new Set();
  } catch (e) {
    console.warn("[RBAC] Không đọc được quyền từ DB, dùng mặc định:", e.message);
    perms = new Set(DEFAULT_ROLE_PERMISSIONS[roleCode] || []);
  }
  permCache.set(roleCode, { perms, exp: Date.now() + PERM_TTL_MS });
  return perms;
};

/** Trạng thái tài khoản dùng cho xác thực mỗi request: vai trò hiện tại, khoá, tokenVersion. */
const getUserState = async (userId) => {
  const key = String(userId);
  const hit = stateCache.get(key);
  if (hit && hit.exp > Date.now()) return hit.state;
  const row = await db.User.findOne({
    where: { id: userId },
    attributes: ["id", "email", "roleId", "isActive", "tokenVersion"],
    raw: true,
  });
  const state = row
    ? { id: row.id, email: row.email, roleId: row.roleId, isActive: row.isActive !== 0 && row.isActive !== false, tokenVersion: Number(row.tokenVersion || 0) }
    : null;
  stateCache.set(key, { state, exp: Date.now() + STATE_TTL_MS });
  return state;
};

/* ------------------------- Quản trị vai trò / quyền ------------------------- */

const listRoles = async () => {
  const roles = await M().RbacRole.findAll({ order: [["code", "ASC"]], raw: true });
  const links = await M().RbacRolePermission.findAll({ raw: true });
  const counts = await db.User.findAll({
    attributes: ["roleId", [db.sequelize.fn("COUNT", db.sequelize.col("id")), "n"]],
    group: ["roleId"],
    raw: true,
  });
  const countMap = Object.fromEntries(counts.map((c) => [c.roleId, Number(c.n)]));
  return roles.map((r) => ({
    ...r,
    isSystem: !!r.isSystem,
    userCount: countMap[r.code] || 0,
    permissions: links.filter((l) => l.roleCode === r.code).map((l) => l.permissionCode).sort(),
  }));
};

const listPermissions = () => M().RbacPermission.findAll({ order: [["group", "ASC"], ["code", "ASC"]], raw: true });

const setRolePermissions = async (roleCode, permissionCodes) => {
  if (!Array.isArray(permissionCodes)) throw new RbacError(400, "permissions phải là mảng");
  const role = await M().RbacRole.findOne({ where: { code: roleCode }, raw: true });
  if (!role) throw new RbacError(404, "Không tìm thấy vai trò");
  const unique = [...new Set(permissionCodes)];
  const valid = new Set((await M().RbacPermission.findAll({ attributes: ["code"], raw: true })).map((p) => p.code));
  const unknown = unique.filter((c) => !valid.has(c));
  if (unknown.length) throw new RbacError(400, `Quyền không tồn tại: ${unknown.join(", ")}`);
  if (roleCode === ADMIN_ROLE) {
    const lost = ADMIN_LOCKED_PERMS.filter((c) => !unique.includes(c));
    if (lost.length) throw new RbacError(400, `Không thể gỡ quyền bắt buộc của ADMIN: ${lost.join(", ")}`);
  }
  const before = (await M().RbacRolePermission.findAll({ where: { roleCode }, raw: true })).map((l) => l.permissionCode);
  await db.sequelize.transaction(async (transaction) => {
    await M().RbacRolePermission.destroy({ where: { roleCode }, transaction });
    if (unique.length) {
      await M().RbacRolePermission.bulkCreate(unique.map((permissionCode) => ({ roleCode, permissionCode })), { transaction });
    }
  });
  invalidatePermissions();
  return { before, after: unique };
};

const createRole = async ({ code, name, description }) => {
  if (!/^[A-Z][A-Z0-9_]{1,30}$/.test(code || "")) {
    throw new RbacError(400, "code vai trò phải là chữ HOA/số/_ (2–31 ký tự)");
  }
  if (!name) throw new RbacError(400, "Thiếu tên vai trò");
  if (await M().RbacRole.count({ where: { code } })) throw new RbacError(409, "Mã vai trò đã tồn tại");
  await M().RbacRole.create({ code, name, description: description || null, isSystem: false });
  invalidatePermissions();
};

const deleteRole = async (code) => {
  const role = await M().RbacRole.findOne({ where: { code }, raw: true });
  if (!role) throw new RbacError(404, "Không tìm thấy vai trò");
  if (role.isSystem || SYSTEM_ROLE_CODES.includes(code)) throw new RbacError(400, "Không thể xoá vai trò hệ thống");
  if (await db.User.count({ where: { roleId: code } })) throw new RbacError(409, "Còn người dùng đang giữ vai trò này");
  await M().RbacRole.destroy({ where: { code } });
  invalidatePermissions();
};

const countActiveAdmins = (excludeUserId) =>
  db.User.count({
    where: {
      roleId: ADMIN_ROLE,
      isActive: true,
      ...(excludeUserId ? { id: { [Op.ne]: excludeUserId } } : {}),
    },
  });

/** Đổi vai trò người dùng: không tự đổi, luôn còn >=1 admin, thu hồi token cũ. */
const assignRole = async ({ actorId, userId, roleCode }) => {
  if (String(actorId) === String(userId)) throw new RbacError(400, "Không thể tự thay đổi vai trò của chính mình");
  if (!(await M().RbacRole.count({ where: { code: roleCode } }))) throw new RbacError(400, "Vai trò không tồn tại");
  const user = await db.User.findOne({ where: { id: userId }, raw: false });
  if (!user) throw new RbacError(404, "Không tìm thấy người dùng");
  const before = user.roleId;
  if (before === roleCode) return { before, after: roleCode };
  if (before === ADMIN_ROLE && (await countActiveAdmins(user.id)) < 1) {
    throw new RbacError(400, "Phải còn ít nhất 1 quản trị viên đang hoạt động");
  }
  await user.update({ roleId: roleCode, tokenVersion: Number(user.tokenVersion || 0) + 1 });
  await revokeAllRefreshTokens(user.id);
  invalidateUser(user.id);
  return { before, after: roleCode };
};

/** Khoá/mở tài khoản: không tự khoá, luôn còn >=1 admin, thu hồi token. */
const setActive = async ({ actorId, userId, isActive }) => {
  if (String(actorId) === String(userId) && !isActive) throw new RbacError(400, "Không thể tự khoá tài khoản của chính mình");
  const user = await db.User.findOne({ where: { id: userId }, raw: false });
  if (!user) throw new RbacError(404, "Không tìm thấy người dùng");
  if (!isActive && user.roleId === ADMIN_ROLE && (await countActiveAdmins(user.id)) < 1) {
    throw new RbacError(400, "Phải còn ít nhất 1 quản trị viên đang hoạt động");
  }
  await user.update({ isActive: !!isActive, tokenVersion: Number(user.tokenVersion || 0) + 1 });
  await revokeAllRefreshTokens(user.id);
  invalidateUser(user.id);
};

/** Thu hồi mọi refresh token của user (dùng khi đổi quyền/khoá/phát hiện reuse). */
const revokeAllRefreshTokens = async (userId) => {
  try {
    await M().RefreshToken.update({ revokedAt: new Date() }, { where: { userId, revokedAt: null } });
  } catch (e) {
    console.error("[RBAC] revokeAllRefreshTokens:", e.message);
  }
};

module.exports = {
  RbacError,
  syncRbac,
  getRolePermissions,
  getUserState,
  invalidatePermissions,
  invalidateUser,
  listRoles,
  listPermissions,
  setRolePermissions,
  createRole,
  deleteRole,
  assignRole,
  setActive,
  revokeAllRefreshTokens,
  countActiveAdmins,
};
