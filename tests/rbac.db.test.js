/**
 * Test tích hợp RBAC + refresh token – cần MySQL đã chạy migration 20261112000001. Mặc định BỎ QUA.
 * Chạy:  RUN_DB_TESTS=1 npm test   (PowerShell: $env:RUN_DB_TESTS=1; npm test)
 * Tạo user tạm có email "rbactest-*" và dọn lại sau khi chạy.
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_access_secret_test_access_secret_1234";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test_refresh_secret_test_refresh_secret_567";

const test = require("node:test");
const assert = require("node:assert/strict");
const enabled = process.env.RUN_DB_TESTS === "1";

test("RBAC DB: sync idempotent, chống tự đổi vai trò, luôn còn admin, xoay vòng + phát hiện reuse refresh token", { skip: !enabled }, async () => {
  const db = require("../src/models/index");
  const rbac = require("../src/services/rbacService");
  const tokens = require("../src/services/tokenService");
  const { PERMISSIONS, SYSTEM_ROLES } = require("../src/config/permissions");
  const M = db.sequelize.models;
  const created = [];

  try {
    // 1. Đồng bộ lần 1 và lần 2: lần 2 không tạo thêm gì
    await rbac.syncRbac();
    const second = await rbac.syncRbac();
    assert.deepEqual(second, { newPermissions: 0, newRoles: 0, grants: 0 });
    assert.equal(await M.RbacPermission.count(), PERMISSIONS.length);
    assert.ok((await M.RbacRole.count()) >= SYSTEM_ROLES.length);

    // 2. Tạo 2 admin tạm + 1 bệnh nhân tạm
    const mk = async (suffix, roleId) => {
      const u = await db.User.create({ email: `rbactest-${Date.now()}-${suffix}@example.com`, roleId, firstName: "T", lastName: suffix, isActive: true, tokenVersion: 0 });
      created.push(u.id);
      return u;
    };
    const adminA = await mk("a", "R1");
    const patient = await mk("p", "R3");

    // 3. Không tự đổi vai trò của chính mình
    await assert.rejects(rbac.assignRole({ actorId: adminA.id, userId: adminA.id, roleCode: "R3" }), /tự thay đổi/);
    // 4. Đổi vai trò người khác: tokenVersion tăng, refresh token cũ bị thu hồi
    const before = await tokens.issueTokenPair({ id: patient.id, email: patient.email, roleId: "R3", tokenVersion: 0 });
    await rbac.assignRole({ actorId: adminA.id, userId: patient.id, roleCode: "R5" });
    const after = await db.User.findOne({ where: { id: patient.id }, raw: true });
    assert.equal(after.roleId, "R5");
    assert.equal(Number(after.tokenVersion), 1);
    const rotated = await tokens.rotateRefreshToken(before.refreshToken, {});
    assert.equal(rotated.ok, false, "refresh token cũ không dùng được sau khi đổi vai trò");

    // 5. Khoá tài khoản: không tự khoá; token mới (tv đúng) refresh được, sau khoá thì không
    await assert.rejects(rbac.setActive({ actorId: adminA.id, userId: adminA.id, isActive: false }), /tự khoá/);
    rbac.invalidateUser(patient.id);
    const st = await rbac.getUserState(patient.id);
    const pair = await tokens.issueTokenPair(st, {});
    const ok1 = await tokens.rotateRefreshToken(pair.refreshToken, {});
    assert.equal(ok1.ok, true, "xoay vòng thành công");
    // dùng lại token đã xoay => reuse => thu hồi toàn bộ phiên
    const reuse = await tokens.rotateRefreshToken(pair.refreshToken, {});
    assert.equal(reuse.ok, false);
    const afterReuse = await tokens.rotateRefreshToken(ok1.refreshToken, {});
    assert.equal(afterReuse.ok, false, "token mới cũng bị thu hồi sau khi phát hiện reuse");

    // 6. Không thể gỡ quyền bắt buộc của ADMIN
    await assert.rejects(rbac.setRolePermissions("R1", ["booking:read:own"]), /bắt buộc/);

    // 7. Không xoá vai trò hệ thống; vai trò custom tạo/xoá được
    await assert.rejects(rbac.deleteRole("R2"), /hệ thống/);
    await rbac.createRole({ code: "RBACTEST_ROLE", name: "tmp" });
    await rbac.setRolePermissions("RBACTEST_ROLE", ["medicine:read"]);
    assert.deepEqual((await rbac.getRolePermissions("RBACTEST_ROLE")), new Set(["medicine:read"]));
    await rbac.deleteRole("RBACTEST_ROLE");
  } finally {
    await M.RefreshToken.destroy({ where: { userId: created } });
    await M.RbacRole.destroy({ where: { code: "RBACTEST_ROLE" } });
    if (created.length) await db.User.destroy({ where: { id: created }, force: true }); // force: bỏ xoá mềm
    await db.sequelize.close();
  }
});
