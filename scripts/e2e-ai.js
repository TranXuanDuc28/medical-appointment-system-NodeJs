/**
 * Kiểm tra sống backend <-> AI Service THẬT (không giả lập). Cần: ai-service đang chạy, MySQL v2.
 *   AI_SERVICE_URL=http://127.0.0.1:8001 AI_SERVICE_TOKEN=... node scripts/e2e-ai.js
 * Tạo dữ liệu tạm (email "aitest-*", phòng "AI*") và dọn lại; có thể dùng song song với backend đang chạy.
 */
require("dotenv").config();
const assert = require("node:assert/strict");

(async () => {
  if (!process.env.AI_SERVICE_URL) throw new Error("Đặt AI_SERVICE_URL trước khi chạy");
  const db = require("../src/models/index");
  const queue = require("../src/services/queue/queueService");
  const triageService = require("../src/services/ai/triageService");
  const { getClient } = require("../src/services/ai/aiClient");
  const { DEFAULT_ROLE_PERMISSIONS } = require("../src/config/permissions");
  const client = getClient();
  const created = { rooms: [], users: [] };
  let walkIds = [];
  try {
    const health = await client.health();
    console.log("health:", JSON.stringify(health));

    const t = await triageService.triage("đau ngực lan ra tay trái, khó thở");
    assert.equal(t.available, true);
    console.log("triage:", t.urgency, "|", t.recommendation, "|", (t.predictions || []).slice(0, 2).map((p) => `${p.specialty_vi}(${p.probability})`).join(", "));
    assert.ok(["EMERGENCY", "URGENT"].includes(t.urgency), "ca đau ngực khó thở phải được cảnh báo khẩn");

    const p = await db.DoctorProfile.findOne({ attributes: ["doctorId", "clinicId", "specialtyId"], raw: true, order: [["doctorId", "ASC"]] });
    const room = await db.Room.create({ clinicId: p.clinicId, specialtyId: p.specialtyId, code: `AI${Date.now() % 1000000}`, name: "Phòng AI e2e", isActive: true });
    created.rooms.push(room.id);
    const staff = await db.User.create({ email: `aitest-e2e-${Date.now()}@example.com`, firstName: "E", lastName: "2E", roleId: "R5", isActive: true, tokenVersion: 0 });
    created.users.push(staff.id);
    const { todayDate } = require("../src/utils/dateKey");
    const today = todayDate();
    for (const tc of ["T1"]) await db.Schedule.findOrCreate({ where: { doctorId: p.doctorId, workDate: today, timeType: tc }, defaults: { maxNumber: 5, currentNumber: 0, status: "available" }, raw: false });
    const receptionist = { id: Number(staff.id), permissions: new Set(DEFAULT_ROLE_PERMISSIONS.R5) };
    const doctor = { id: Number(p.doctorId), permissions: new Set(DEFAULT_ROLE_PERMISSIONS.R2) };

    for (const n of ["A", "B", "C"]) walkIds.push((await queue.createWalkIn({ doctorId: Number(p.doctorId), name: `E2E ${n}`, actor: receptionist })).id);
    const board = await queue.getDoctorBoard({ doctorId: Number(p.doctorId), actor: doctor });
    const mine = board.waiting.filter((x) => walkIds.includes(x.id));
    assert.equal(mine.length, 3);
    for (const x of mine) console.log(`vé #${x.id}: etaBasis=${x.etaBasis} thời lượng≈${x.predictedDurationMin}' khoảng=${JSON.stringify(x.predictedDurationRangeMin)} chờ≈${x.estimatedWaitMin}' mô hình=${x.modelVersion}`);
    assert.ok(mine.every((x) => x.etaBasis === "ml" && x.modelVersion), "AI thật phải cho basis=ml");
    console.log("circuit:", client.status().circuit || client.circuitState);
    console.log("OK: backend <-> AI Service thật hoạt động");
  } finally {
    const { Op } = db.Sequelize;
    const tickets = await db.QueueTicket.findAll({ where: { roomId: created.rooms }, attributes: ["id"], raw: true });
    const ids = tickets.map((x) => x.id);
    if (ids.length) {
      await new Promise((r) => setTimeout(r, 500)); // chờ ghi ai_predictions bất đồng bộ
      await db.QueueEvent.destroy({ where: { ticketId: ids } });
      await db.AiPrediction.destroy({ where: { ticketId: ids } });
      await db.QueueTicket.destroy({ where: { id: ids } });
    }
    if (created.rooms.length) await db.Room.destroy({ where: { id: created.rooms } });
    if (created.users.length) await db.User.destroy({ where: { id: created.users }, force: true });
    await db.sequelize.close();
  }
})().catch((e) => { console.error("THẤT BẠI:", e.message); process.exit(1); });
