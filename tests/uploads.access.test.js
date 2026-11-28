/**
 * Test kiểm soát truy cập /uploads.
 *  - Phần không cần DB: middleware thật + thư mục tạm + xác thực/tra cứu tin nhắn giả lập.
 *  - Phần DB (RUN_DB_TESTS=1): tra cứu tin nhắn thật, gồm trường hợp tên file có "_" (ký tự đại diện của LIKE).
 */
const test = require("node:test");
const { after } = test;
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const express = require("express");
const request = require("supertest");

const { makeUploadsHandler, uploaderOf, SAFE_NAME, escapeLike } = require("../src/middleware/uploadAccess");

const enabled = process.env.RUN_DB_TESTS === "1";
const dbOpt = { skip: !enabled };

after(async () => {
  if (enabled) await require("../src/models/index").sequelize.close();
});

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "uploads-test-"));
const outside = path.join(os.tmpdir(), `secret-${Date.now()}.txt`);
fs.writeFileSync(outside, "SECRET");
const put = (name, content = "data") => fs.writeFileSync(path.join(dir, name), content);

after(() => {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.rmSync(outside, { force: true });
});

put("u7-1700000000-123-anh.png", "PNG7"); // do user 7 tải lên
put("1753077575287-941338752-legacy.jpg", "LEGACY"); // file cũ, không có chủ
put("1700000001-1-chat.pdf", "PDF"); // file trong tin nhắn giữa 10 và 20

const messages = [{ file: "1700000001-1-chat.pdf", senderId: 10, receiverId: 20 }];
const isParticipant = async (uid, name) => messages.some((m) => m.file === name && (m.senderId === uid || m.receiverId === uid));

const app = express();
app.use(
  "/uploads",
  makeUploadsHandler({
    dir,
    isParticipant,
    authenticate: async (req) => (req.headers["x-test-user"] ? { id: Number(req.headers["x-test-user"]) } : null),
  })
);
const get = (p, uid) => {
  const r = request(app).get(p);
  return uid ? r.set("x-test-user", String(uid)) : r;
};

test("chưa đăng nhập: 401 cho mọi file (kể cả file không tồn tại)", async () => {
  assert.equal((await get("/uploads/u7-1700000000-123-anh.png")).status, 401);
  assert.equal((await get("/uploads/khong-ton-tai.png")).status, 401);
});

test("người tải lên xem được file của mình, người khác thì 404", async () => {
  const ok = await get("/uploads/u7-1700000000-123-anh.png", 7);
  assert.equal(ok.status, 200);
  assert.equal(ok.body.toString(), "PNG7");
  assert.equal((await get("/uploads/u7-1700000000-123-anh.png", 8)).status, 404);
  assert.equal((await get("/uploads/u7-1700000000-123-anh.png", 77)).status, 404, "u7 không được khớp nhầm với u77");
});

test("file đính kèm tin nhắn: chỉ người gửi và người nhận xem được", async () => {
  assert.equal((await get("/uploads/1700000001-1-chat.pdf", 10)).status, 200);
  assert.equal((await get("/uploads/1700000001-1-chat.pdf", 20)).status, 200);
  assert.equal((await get("/uploads/1700000001-1-chat.pdf", 30)).status, 404);
});

test("file cũ không có chủ và không thuộc tin nhắn nào: không ai xem được", async () => {
  assert.equal((await get("/uploads/1753077575287-941338752-legacy.jpg", 7)).status, 404);
});

test("không thoát được thư mục (path traversal, mã hoá %2e, dấu \\)", async () => {
  const attempts = [
    "/uploads/../" + path.basename(outside),
    "/uploads/%2e%2e/" + path.basename(outside),
    "/uploads/..%2f" + path.basename(outside),
    "/uploads/%2e%2e%5c" + path.basename(outside),
    "/uploads/sub/../u7-1700000000-123-anh.png",
    "/uploads/.env",
    "/uploads/%00u7-1700000000-123-anh.png",
  ];
  for (const a of attempts) {
    const r = await get(a, 7);
    assert.notEqual(r.status, 200, `phải chặn: ${a}`);
    assert.ok(!String(r.text || "").includes("SECRET"), `lộ nội dung: ${a}`);
  }
});

test("header an toàn cho file riêng tư; chỉ GET/HEAD", async () => {
  const r = await get("/uploads/u7-1700000000-123-anh.png", 7);
  assert.match(r.headers["cache-control"], /private/);
  assert.equal(r.headers["x-content-type-options"], "nosniff");
  assert.equal((await request(app).post("/uploads/u7-1700000000-123-anh.png").set("x-test-user", "7")).status, 405);
});

test("lỗi hạ tầng xác thực: 503, không lộ file", async () => {
  const bad = express();
  bad.use("/uploads", makeUploadsHandler({ dir, authenticate: async () => { throw new Error("DB down"); } }));
  const r = await request(bad).get("/uploads/u7-1700000000-123-anh.png");
  assert.equal(r.status, 503);
});

test("tiện ích: uploaderOf, SAFE_NAME, escapeLike", () => {
  assert.equal(uploaderOf("u123-17-1-a.png"), 123);
  assert.equal(uploaderOf("1700-1-a.png"), null);
  assert.equal(uploaderOf("user-1-a.png"), null);
  assert.ok(SAFE_NAME.test("u1-17-9-Anh-benh_an.png"));
  for (const bad of ["../x", "a/b", "a\\b", ".env", "", "a b.png", "a\u0000.png"]) assert.ok(!SAFE_NAME.test(bad), bad);
  assert.equal(escapeLike("a_b%c\\d"), "a\\_b\\%c\\\\d");
});

test("DB thật: tra cứu tin nhắn đúng người, không bị ký tự '_' của LIKE đánh lừa", dbOpt, async () => {
  const db = require("../src/models/index");
  const { Op } = require("sequelize");
  const { makeUploadsHandler: make } = require("../src/middleware/uploadAccess");
  const mk = async (t) =>
    Number((await db.User.create({ email: `uptest-${t}-${Date.now()}@example.com`, firstName: "U", lastName: t, roleId: "R3", isActive: true, tokenVersion: 0 })).id);
  const a = await mk("a"), b = await mk("b"), c = await mk("c");
  const d2 = fs.mkdtempSync(path.join(os.tmpdir(), "uploads-db-"));
  const real = "1700000009-5-Anh_benh_an.png";
  const lookalike = "1700000009-5-AnhXbenhXan.png"; // khớp nếu "_" bị hiểu là ký tự đại diện
  fs.writeFileSync(path.join(d2, real), "REAL");
  fs.writeFileSync(path.join(d2, lookalike), "FAKE");
  try {
    await db.Message.create({ senderId: a, receiverId: b, body: "", fileUrl: `https://host.example/uploads/${real}`, fileType: "image/png", fileName: "x.png" });
    const app2 = express();
    app2.use("/uploads", make({ dir: d2, authenticate: async (req) => (req.headers["x-test-user"] ? { id: Number(req.headers["x-test-user"]) } : null) }));
    const g = (p, u) => request(app2).get(p).set("x-test-user", String(u));
    assert.equal((await g(`/uploads/${real}`, a)).status, 200);
    assert.equal((await g(`/uploads/${real}`, b)).status, 200);
    assert.equal((await g(`/uploads/${real}`, c)).status, 404, "người ngoài cuộc");
    assert.equal((await g(`/uploads/${lookalike}`, a)).status, 404, "tên giống nhưng khác file, không có tin nhắn");
  } finally {
    await db.Message.destroy({ where: { senderId: { [Op.in]: [a, b, c] } } });
    await db.User.destroy({ where: { id: [a, b, c] }, force: true });
    fs.rmSync(d2, { recursive: true, force: true });
  }
});

test("server.js gắn handler /uploads TRƯỚC viewEngine (viewEngine mở static cho cả src/public, đặt sau sẽ lộ file công khai)", () => {
  const src = fs.readFileSync(path.join(__dirname, "../src/server.js"), "utf8");
  const handler = src.indexOf("makeUploadsHandler({");
  const engine = src.indexOf("viewEngine(app);");
  assert.ok(handler > 0 && engine > 0, "tìm thấy cả hai dòng");
  assert.ok(handler < engine, "handler /uploads phải đứng trước viewEngine(app)");
  assert.ok(!/express\.static\([^)]*uploads/.test(src), "không được có static công khai cho uploads");
});
