/**
 * Test API thông báo (controller thật + service thật, danh tính giả lập qua middleware).
 * Cần MySQL thật: chạy khi RUN_DB_TESTS=1. Dữ liệu tạm: email "ntest-*" (xoá hẳn sau khi chạy).
 */
const test = require("node:test");
const { after } = test;
const assert = require("node:assert/strict");
const express = require("express");
const request = require("supertest");

const enabled = process.env.RUN_DB_TESTS === "1";
const opt = { skip: !enabled };

after(async () => {
  if (enabled) await require("../src/models/index").sequelize.close();
});

const setup = async () => {
  const db = require("../src/models/index");
  const svc = require("../src/services/notificationService");
  const ctl = require("../src/controllers/notificationController");
  const mk = async (tag) =>
    Number((await db.User.create({ email: `ntest-${tag}-${Date.now()}@example.com`, firstName: "N", lastName: tag, roleId: "R3", isActive: true, tokenVersion: 0 })).id);
  const a = await mk("a");
  const b = await mk("b");

  const app = express();
  app.use(express.json());
  app.use((req, res, next) => { req.user = { id: Number(req.get("x-test-user")) }; next(); });
  app.get("/api/notifications", ctl.list);
  app.get("/api/notifications/unread-count", ctl.unreadCount);
  app.post("/api/notifications/read-all", ctl.markAllRead);
  app.post("/api/notifications/:id/read", ctl.markRead);
  const as = (uid) => ({
    get: (u) => request(app).get(u).set("x-test-user", uid),
    post: (u) => request(app).post(u).set("x-test-user", uid),
  });
  const cleanup = async () => {
    await db.Notification.destroy({ where: { userId: [a, b] } });
    await db.User.destroy({ where: { id: [a, b] }, force: true });
  };
  return { db, svc, a, b, as, cleanup };
};

test("danh sách: mới nhất trước, phân trang theo con trỏ, không lộ dedupe_key, chỉ của mình", opt, async () => {
  const { svc, a, b, as, cleanup } = await setup();
  try {
    for (let i = 1; i <= 5; i++) await svc.notify({ userId: a, type: "T", title: `Tin ${i}`, body: "x", payload: { n: i }, dedupeKey: `ntest:${a}:${i}:${Date.now()}`, push: false });
    await svc.notify({ userId: b, type: "T", title: "Của B", dedupeKey: `ntest:${b}:1:${Date.now()}`, push: false });

    const p1 = (await as(a).get("/api/notifications?limit=2")).body;
    assert.equal(p1.errCode, 0);
    assert.deepEqual(p1.data.items.map((x) => x.title), ["Tin 5", "Tin 4"]);
    assert.equal(p1.data.unreadCount, 5);
    assert.ok(p1.data.nextBefore);
    assert.deepEqual(p1.data.items[0].payload, { n: 5 });
    assert.equal(p1.data.items[0].isRead, false);
    assert.ok(p1.data.items[0].createdAt);
    assert.equal("dedupeKey" in p1.data.items[0], false);
    assert.equal("userId" in p1.data.items[0], false);

    const p2 = (await as(a).get(`/api/notifications?limit=2&before=${p1.data.nextBefore}`)).body.data;
    assert.deepEqual(p2.items.map((x) => x.title), ["Tin 3", "Tin 2"]);
    const p3 = (await as(a).get(`/api/notifications?limit=2&before=${p2.nextBefore}`)).body.data;
    assert.deepEqual(p3.items.map((x) => x.title), ["Tin 1"]);
    assert.equal(p3.nextBefore, null);

    // B chỉ thấy của B
    const rb = (await as(b).get("/api/notifications")).body.data;
    assert.deepEqual(rb.items.map((x) => x.title), ["Của B"]);
    // limit vô lý bị chặn về khoảng hợp lệ
    assert.equal((await as(a).get("/api/notifications?limit=9999")).body.data.items.length, 5);
    assert.equal((await as(a).get("/api/notifications?limit=abc")).body.data.items.length, 5);
  } finally {
    await cleanup();
  }
});

test("đánh dấu đã đọc: idempotent, đếm chưa đọc, lọc unread, không đọc hộ người khác", opt, async () => {
  const { svc, a, b, as, cleanup, db } = await setup();
  try {
    const ids = [];
    for (let i = 1; i <= 3; i++) ids.push((await svc.notify({ userId: a, type: "T", title: `Tin ${i}`, dedupeKey: `ntest:r:${a}:${i}:${Date.now()}`, push: false })).id);
    assert.equal((await as(a).get("/api/notifications/unread-count")).body.data.unreadCount, 3);

    let r = await as(a).post(`/api/notifications/${ids[0]}/read`);
    assert.equal(r.status, 200);
    assert.equal(r.body.data.unreadCount, 2);
    const first = await db.Notification.findOne({ where: { id: ids[0] }, raw: true });
    r = await as(a).post(`/api/notifications/${ids[0]}/read`); // lần 2: không đổi
    assert.equal(r.body.data.unreadCount, 2);
    const again = await db.Notification.findOne({ where: { id: ids[0] }, raw: true });
    assert.equal(String(first.readAt || first.read_at), String(again.readAt || again.read_at), "không ghi đè thời điểm đọc");

    const unread = (await as(a).get("/api/notifications?unread=1")).body.data;
    assert.deepEqual(unread.items.map((x) => x.id).sort(), [ids[1], ids[2]].sort());
    const all = (await as(a).get("/api/notifications")).body.data.items;
    assert.equal(all.find((x) => x.id === ids[0]).isRead, true);

    // B không đọc được/đánh dấu hộ thông báo của A (và không biết nó có tồn tại)
    r = await as(b).post(`/api/notifications/${ids[1]}/read`);
    assert.equal(r.status, 404);
    assert.equal((await as(a).get("/api/notifications/unread-count")).body.data.unreadCount, 2);
    assert.equal((await as(a).post("/api/notifications/abc/read")).status, 400);
    assert.equal((await as(a).post("/api/notifications/99999999/read")).status, 404);

    // read-all chỉ ảnh hưởng chính mình
    await svc.notify({ userId: b, type: "T", title: "B", dedupeKey: `ntest:r:${b}:${Date.now()}`, push: false });
    r = await as(a).post("/api/notifications/read-all");
    assert.equal(r.body.data.updated, 2);
    assert.equal((await as(a).get("/api/notifications/unread-count")).body.data.unreadCount, 0);
    assert.equal((await as(b).get("/api/notifications/unread-count")).body.data.unreadCount, 1);
  } finally {
    await cleanup();
  }
});

test("notify phát sự kiện realtime (NOTIFICATION_NEW) đúng người nhận, không phát khi trùng", opt, async () => {
  const { svc, a, cleanup } = await setup();
  const { bus, NOTIFIED } = require("../src/utils/queueBus");
  const got = [];
  const h = (p) => got.push(p);
  bus.on(NOTIFIED, h);
  try {
    const key = `ntest:e:${a}:${Date.now()}`;
    await svc.notify({ userId: a, type: "T", title: "Realtime", dedupeKey: key, push: false });
    const dup = await svc.notify({ userId: a, type: "T", title: "Realtime", dedupeKey: key, push: false });
    assert.equal(dup.duplicate, true);
    assert.equal(got.length, 1);
    assert.equal(got[0].userId, a);
    assert.equal(got[0].notification.title, "Realtime");
    assert.equal(got[0].notification.isRead, false);
    assert.equal("dedupeKey" in got[0].notification, false);
  } finally {
    bus.off(NOTIFIED, h);
    await cleanup();
  }
});
