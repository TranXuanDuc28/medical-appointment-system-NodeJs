/**
 * Test phân quyền RBAC (không cần DB): chạy bằng `npm test`.
 * Dùng Express mini + accessControl/policies thật + bảng accessRules & ma trận quyền mặc định thật.
 * Trạng thái user / quyền vai trò được giả lập qua authContext.setProviders.
 */
process.env.JWT_SECRET = "test_access_secret_test_access_secret_1234";
process.env.JWT_REFRESH_SECRET = "test_refresh_secret_test_refresh_secret_567";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const cookieParser = require("cookie-parser");
const request = require("supertest");
const jwt = require("jsonwebtoken");

const authContext = require("../src/services/authContext");
const { accessControl } = require("../src/middleware/accessControl");
const { selfOrPermission, doctorSelf } = require("../src/middleware/ownership");
const policies = require("../src/middleware/policies");
const { RULES, PUBLIC, AUTH } = require("../src/config/accessRules");
const { P, PERMISSIONS, SYSTEM_ROLES, ADMIN_LOCKED_PERMS, DEFAULT_ROLE_PERMISSIONS } = require("../src/config/permissions");
const { createJWT } = require("../src/middleware/JWTaction");

/* ---------- Giả lập "DB" ---------- */
const ROLES = SYSTEM_ROLES.map((r) => r.code); // R1..R8
const users = new Map(); // id -> {id,email,roleId,isActive,tokenVersion}
const rolePerms = new Map(); // roleCode -> Set
const resetDb = () => {
  users.clear();
  rolePerms.clear();
  SYSTEM_ROLES.forEach((r) => rolePerms.set(r.code, new Set(r.permissions)));
  ROLES.forEach((role, i) =>
    users.set(100 + i, { id: 100 + i, email: `${role}@x.com`, roleId: role, isActive: true, tokenVersion: 0 })
  );
};
authContext.setProviders({
  getUserState: async (id) => users.get(Number(id)) || null,
  getRolePermissions: async (code) => rolePerms.get(code) || new Set(),
});
resetDb();

const idOf = (role) => 100 + ROLES.indexOf(role);
const tokenFor = (role, over = {}) => {
  const u = users.get(idOf(role));
  return createJWT({ id: u.id, email: u.email, roleId: u.roleId, tv: u.tokenVersion, ...over });
};

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(accessControl);
  app.all(/.*/, (req, res) =>
    res.status(200).json({ ok: true, user: req.user ? { id: req.user.id, roleId: req.user.roleId } : null })
  );
  return app;
};
const concretePath = (p) => p.replace(/:[A-Za-z]+/g, "1");
const call = (app, method, p, token) => {
  const r = request(app)[method.toLowerCase()](p);
  return token ? r.set("Authorization", `Bearer ${token}`) : r;
};

/* ---------- Cấu hình ---------- */
test("mọi route /api trong web.js đều có quy tắc trong accessRules và ngược lại", () => {
  const src = fs
    .readFileSync(path.join(__dirname, "../src/route/web.js"), "utf8")
    .replace(/^\s*\/\/.*$/gm, "");
  const re = /router\.(get|post|put|delete)\(\s*"(\/api\/[^"]+)"/g;
  const routes = [];
  let m;
  while ((m = re.exec(src))) routes.push([m[1].toUpperCase(), m[2]]);
  assert.ok(routes.length > 55, "parse được danh sách route");
  const declared = new Set(RULES.map(([method, p]) => `${method} ${p}`));
  const registered = new Set(routes.map(([method, p]) => `${method} ${p}`));
  assert.deepEqual(routes.filter(([a, b]) => !declared.has(`${a} ${b}`)), [], "route thiếu quy tắc");
  assert.deepEqual(RULES.filter(([a, b]) => !registered.has(`${a} ${b}`)), [], "quy tắc thừa");
});

test("mọi permission dùng trong accessRules / ma trận đều được khai báo trong danh mục", () => {
  const known = new Set(PERMISSIONS.map((p) => p.code));
  for (const [method, p, access] of RULES) {
    if (Array.isArray(access)) access.forEach((c) => assert.ok(known.has(c), `${method} ${p}: quyền lạ ${c}`));
  }
  SYSTEM_ROLES.forEach((r) => r.permissions.forEach((c) => assert.ok(known.has(c), `${r.code}: quyền lạ ${c}`)));
  ADMIN_LOCKED_PERMS.forEach((c) => assert.ok(known.has(c)));
  assert.equal(new Set(PERMISSIONS.map((p) => p.code)).size, PERMISSIONS.length, "không trùng mã quyền");
});

test("ADMIN mặc định KHÔNG xem được hồ sơ bệnh án của người khác", () => {
  assert.ok(!DEFAULT_ROLE_PERMISSIONS.R1.includes(P.RECORD_READ_ANY));
  assert.ok(!DEFAULT_ROLE_PERMISSIONS.R1.includes(P.RECORD_READ_TREATED));
});

/* ---------- accessControl ---------- */
test("route không khai báo bị chặn mặc định (403)", async () => {
  const res = await call(buildApp(), "GET", "/api/not-declared", tokenFor("R1"));
  assert.equal(res.status, 403);
});

test("route public truy cập được không cần token", async () => {
  const app = buildApp();
  for (const [method, p] of RULES.filter((r) => r[2] === PUBLIC)) {
    assert.equal((await call(app, method, concretePath(p))).status, 200, `${method} ${p}`);
  }
});

test("route cần đăng nhập: không token -> 401", async () => {
  const app = buildApp();
  for (const [method, p] of RULES.filter((r) => r[2] !== PUBLIC)) {
    assert.equal((await call(app, method, concretePath(p))).status, 401, `${method} ${p}`);
  }
});

test("ma trận route × 8 vai trò khớp đúng quyền mặc định (200 / 403)", async () => {
  const app = buildApp();
  for (const [method, p, access] of RULES.filter((r) => r[2] !== PUBLIC)) {
    for (const role of ROLES) {
      const allowed =
        access === AUTH ? true : access.some((perm) => DEFAULT_ROLE_PERMISSIONS[role].includes(perm));
      const res = await call(app, method, concretePath(p), tokenFor(role));
      assert.equal(res.status, allowed ? 200 : 403, `${method} ${p} với ${role}`);
    }
  }
});

test("hồi quy lỗ hổng cũ: ẩn danh không đọc danh sách bệnh nhân / xoá user / gửi đơn thuốc", async () => {
  const app = buildApp();
  assert.equal((await request(app).get("/api/get-list-patient-for-doctor?roleId=R4&date=ALL&lang=vi")).status, 401);
  assert.equal((await request(app).delete("/api/delete_users").send({ id: 1 })).status, 401);
  assert.equal((await request(app).post("/api/send-remedy").send({})).status, 401);
  assert.equal((await request(app).get("/api/get_all_users?id=ALL")).status, 401);
});

test("vai trò mới: thiết bị TV chỉ có quyền hiển thị, không gọi được API nào khác", async () => {
  const app = buildApp();
  const t = tokenFor("R8");
  for (const [method, p] of [
    ["GET", "/api/get-patient-history"],
    ["POST", "/api/send-remedy"],
    ["GET", "/api/rbac/roles"],
    ["POST", "/api/cancel-appointment"],
    ["GET", "/api/get-list-patient-for-doctor"],
  ]) {
    assert.equal((await call(app, method, p, t)).status, p === "/api/get-patient-history" ? 200 : 403, `${method} ${p}`);
  }
  // (get-patient-history là AUTH + policy ở route; accessControl chỉ yêu cầu đăng nhập)
});

/* ---------- Token / thu hồi ---------- */
test("token sai chữ ký, hết hạn, kiểu cũ (thiếu tv), sai tokenVersion -> 401; cookie jwt được chấp nhận", async () => {
  resetDb();
  const app = buildApp();
  const u = users.get(idOf("R2"));
  const forged = jwt.sign({ id: u.id, roleId: "R1", tv: 0 }, "wrong-secret-wrong-secret-wrong-secret-12");
  const expired = jwt.sign({ id: u.id, roleId: "R2", tv: 0 }, process.env.JWT_SECRET, { expiresIn: -10 });
  const legacy = jwt.sign({ id: u.id, email: u.email, roleId: "R2" }, process.env.JWT_SECRET); // chưa có tv
  const staleVersion = tokenFor("R2", { tv: 5 });
  for (const bad of [forged, expired, legacy, staleVersion, "garbage"]) {
    assert.equal((await call(app, "GET", "/api/get-medicines", bad)).status, 401);
  }
  const viaCookie = await request(app).get("/api/get-medicines").set("Cookie", [`jwt=${tokenFor("R2")}`]);
  assert.equal(viaCookie.status, 200);
  assert.equal(viaCookie.body.user.roleId, "R2");
});

test("khoá tài khoản / tăng tokenVersion làm token đang dùng bị từ chối ngay", async () => {
  resetDb();
  const app = buildApp();
  const t = tokenFor("R2");
  assert.equal((await call(app, "GET", "/api/get-medicines", t)).status, 200);
  users.get(idOf("R2")).isActive = false;
  assert.equal((await call(app, "GET", "/api/get-medicines", t)).status, 401);
  users.get(idOf("R2")).isActive = true;
  users.get(idOf("R2")).tokenVersion = 1;
  assert.equal((await call(app, "GET", "/api/get-medicines", t)).status, 401, "token cũ vô hiệu sau khi đổi tokenVersion");
  assert.equal((await call(app, "GET", "/api/get-medicines", tokenFor("R2"))).status, 200, "token mới (tv=1) hoạt động");
});

test("đổi vai trò trong DB có hiệu lực ngay với token cũ (vai trò lấy từ DB, không từ token)", async () => {
  resetDb();
  const app = buildApp();
  const t = tokenFor("R3"); // bệnh nhân
  assert.equal((await call(app, "GET", "/api/get-medicines", t)).status, 403);
  users.get(idOf("R3")).roleId = "R2"; // admin gán vai trò bác sĩ (tokenVersion giữ nguyên chỉ để chứng minh)
  assert.equal((await call(app, "GET", "/api/get-medicines", t)).status, 200);
});

test("admin chỉnh quyền của vai trò (cấp/gỡ permission) có hiệu lực không cần sửa code", async () => {
  resetDb();
  const app = buildApp();
  const t = tokenFor("R3");
  assert.equal((await call(app, "GET", "/api/get-medicines", t)).status, 403);
  rolePerms.get("R3").add(P.MEDICINE_READ);
  assert.equal((await call(app, "GET", "/api/get-medicines", t)).status, 200);
  rolePerms.get("R3").delete(P.MEDICINE_READ);
  assert.equal((await call(app, "GET", "/api/get-medicines", t)).status, 403);
});

test("vai trò tạo thêm (custom) hoạt động như vai trò khác", async () => {
  resetDb();
  users.set(300, { id: 300, email: "c@x.com", roleId: "LAB_TECH", isActive: true, tokenVersion: 0 });
  rolePerms.set("LAB_TECH", new Set([P.MEDICINE_READ]));
  const app = buildApp();
  const t = createJWT({ id: 300, email: "c@x.com", roleId: "LAB_TECH", tv: 0 });
  assert.equal((await call(app, "GET", "/api/get-medicines", t)).status, 200);
  assert.equal((await call(app, "POST", "/api/send-remedy", t)).status, 403);
});

test("lỗi hạ tầng xác thực: route cần đăng nhập -> 503, route public vẫn chạy", async () => {
  const orig = {
    getUserState: async (id) => users.get(Number(id)) || null,
    getRolePermissions: async (code) => rolePerms.get(code) || new Set(),
  };
  authContext.setProviders({ ...orig, getUserState: async () => { throw new Error("db down"); } });
  const app = buildApp();
  assert.equal((await call(app, "GET", "/api/get-medicines", tokenFor("R2"))).status, 503);
  assert.equal((await call(app, "GET", "/api/get_all_doctor", tokenFor("R2"))).status, 200);
  authContext.setProviders(orig);
});

/* ---------- ownership / doctorSelf ---------- */
const miniApp = (permsByHeader = true) => {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.user = {
      id: Number(req.headers["x-uid"]),
      roleId: req.headers["x-role"],
      permissions: new Set((req.headers["x-perms"] || "").split(",").filter(Boolean)),
    };
    next();
  });
  return app;
};
const hdr = (r, uid, perms = "") => r.set("x-uid", String(uid)).set("x-role", "Rx").set("x-perms", perms);

test("selfOrPermission: chính chủ hoặc có permission ngoại lệ mới qua", async () => {
  const app = miniApp();
  app.get("/x", selfOrPermission((req) => req.query.id, P.USER_READ_ANY), (req, res) => res.json({ ok: 1 }));
  const get = (uid, perms, id) => hdr(request(app).get(`/x?id=${id}`), uid, perms);
  assert.equal((await get(5, "", 5)).status, 200);
  assert.equal((await get(5, "", 6)).status, 403);
  assert.equal((await get(5, "", "ALL")).status, 403);
  assert.equal((await get(1, P.USER_READ_ANY, "ALL")).status, 200);
});

test("doctorSelf: bác sĩ chỉ thao tác doctorId của mình; có doctor-data:manage:any thì không giới hạn", async () => {
  const app = miniApp();
  app.post("/x", doctorSelf((req) => req.body.doctorId), (req, res) => res.json({ ok: 1 }));
  const post = (uid, perms, doctorId) => hdr(request(app).post("/x").send({ doctorId }), uid, perms);
  assert.equal((await post(7, "", 7)).status, 200);
  assert.equal((await post(7, "", 8)).status, 403);
  assert.equal((await post(1, P.DOCTOR_DATA_ANY, 8)).status, 200);
});

/* ---------- Policy quan hệ điều trị + audit ---------- */
test("hồ sơ bệnh án: own / treated / any + audit đầy đủ", async () => {
  const auditLog = [];
  const treated = new Set(["2:50"]); // bác sĩ 2 đã khám bệnh nhân 50
  policies.setDependencies({
    relation: async (doctorId, patientId) => treated.has(`${doctorId}:${patientId}`),
    audit: (e) => auditLog.push({ action: e.action, resourceId: String(e.resourceId), result: e.result, reason: e.meta && e.meta.reason }),
  });
  const app = miniApp();
  app.get("/rec", policies.medicalRecordPolicy((req) => req.query.patientId), (req, res) => res.json({ ok: 1 }));
  const get = (uid, perms, pid) => hdr(request(app).get(`/rec?patientId=${pid}`), uid, perms);

  const patientPerms = P.RECORD_READ_OWN;
  const doctorPerms = [P.RECORD_READ_OWN, P.RECORD_READ_TREATED].join(",");
  const adminPerms = P.RECORD_READ_OWN; // admin mặc định không có read:any

  // bệnh nhân xem của chính mình: qua, không ghi audit (không phải truy cập dữ liệu người khác)
  assert.equal((await get(50, patientPerms, 50)).status, 200);
  assert.equal(auditLog.length, 0);
  // bệnh nhân xem của người khác: 403 + audit DENIED
  assert.equal((await get(50, patientPerms, 51)).status, 403);
  // bác sĩ có quan hệ điều trị: qua + audit ALLOWED(treated)
  assert.equal((await get(2, doctorPerms, 50)).status, 200);
  // bác sĩ KHÔNG có quan hệ điều trị: 403 + audit DENIED
  assert.equal((await get(2, doctorPerms, 51)).status, 403);
  // admin mặc định: không xem được hồ sơ người khác
  assert.equal((await get(1, adminPerms, 50)).status, 403);
  // bật patient-record:read:any cho admin => xem được và có audit
  assert.equal((await get(1, [adminPerms, P.RECORD_READ_ANY].join(","), 50)).status, 200);

  assert.deepEqual(
    auditLog.map((a) => [a.action, a.resourceId, a.result, a.reason || null]),
    [
      ["RECORD_READ", "51", "DENIED", null],
      ["RECORD_READ", "50", "ALLOWED", "treated"],
      ["RECORD_READ", "51", "DENIED", null],
      ["RECORD_READ", "50", "DENIED", null],
      ["RECORD_READ", "50", "ALLOWED", "any"],
    ]
  );
});

test("TREATMENT_STATUSES: chỉ booking đã xác nhận trở đi mới là quan hệ điều trị", () => {
  assert.deepEqual(policies.TREATMENT_STATUSES, ["S2", "S3", "S5", "S6"]);
});

/* ---------- Môi trường ---------- */
test("validateEnv: thiếu / trùng JWT secret thì ném lỗi", () => {
  const { validateEnv } = require("../src/config/env");
  const backup = { ...process.env };
  Object.assign(process.env, {
    DB_DATABASE_NAME: "d", DB_USERNAME: "u", DB_HOST: "h", DB_DIALECT: "mysql",
    JWT_SECRET: "a".repeat(40), JWT_REFRESH_SECRET: "b".repeat(40),
  });
  assert.doesNotThrow(validateEnv);
  delete process.env.JWT_SECRET;
  assert.throws(validateEnv, /JWT_SECRET/);
  process.env.JWT_SECRET = "same".repeat(10);
  process.env.JWT_REFRESH_SECRET = "same".repeat(10);
  assert.throws(validateEnv, /khác nhau/);
  Object.assign(process.env, backup);
});
