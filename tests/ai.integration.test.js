/**
 * Tích hợp AI <-> hàng đợi trên MySQL THẬT, với máy chủ AI giả – mặc định BỎ QUA.
 * Chạy:  RUN_DB_TESTS=1 npm test
 * Kiểm tra: ETA dùng thời lượng của AI theo lô, ghi ai_predictions/ml_model_versions/symptom_intakes, đối sánh với thực tế,
 * và quan trọng nhất: AI chết/chậm/sai thì hàng đợi VẪN chạy bình thường (dự phòng).
 * Không gửi email thật: đặt lịch qua bookingService (không qua patientServices).
 */
const test = require("node:test");
const { after } = test;
const assert = require("node:assert/strict");
const http = require("node:http");

const enabled = process.env.RUN_DB_TESTS === "1";
const opt = { skip: !enabled };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

after(async () => {
  if (enabled) await require("../src/models/index").sequelize.close();
});

const waitFor = async (fn, ms = 3000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const v = await fn();
    if (v) return v;
    await sleep(50);
  }
  return null;
};

const fakeAi = async () => {
  const state = { bodies: [], triageTexts: [] };
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const body = raw ? JSON.parse(raw) : null;
      const send = (code, obj) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };
      if (req.url === "/health") return send(200, { status: "ok" });
      if (req.url === "/model-info") {
        return send(200, {
          duration: { algorithm: "FakeXGB", version: "test-v1", trained_at: "2026-11-12T00:00:00+00:00", metrics_test: { mae: 3.1 }, data_source: "synthetic" },
          triage: { algorithm: "FakeLR", version: "test-tri-1" },
        });
      }
      if (req.url === "/predict-duration") {
        state.bodies.push(body);
        return send(200, {
          model_version: "test-v1",
          predictions: body.items.map((it) => {
            const d = it.severity === "SEVERE" ? 30 : 10;
            return { duration_min: d, p10_min: d * 0.8, p90_min: d * 1.3, used_defaults: [], confidence: "high", model_version: "test-v1" };
          }),
        });
      }
      if (req.url === "/triage") {
        state.triageTexts.push(body.text);
        if (/sai/.test(body.text)) return send(422, { detail: "Mô tả không hợp lệ" });
        return send(200, {
          urgency: "URGENT", urgency_reasons: ["Đau ngực"], recommendation: "SAME_DAY", advice: "Nên khám trong ngày",
          predictions: [{ specialty_key: "cardiology", specialty_vi: "Tim mạch", probability: 0.9 }, { specialty_key: "spine", specialty_vi: "Cột sống", probability: 0.07 }],
          uncertain: false, uncertain_hint: null, model_version: "test-tri-1", disclaimer: "d",
        });
      }
      return send(404, { detail: "no" });
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { state, url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((r) => server.close(r)) };
};

const setup = async () => {
  const db = require("../src/models/index");
  const queue = require("../src/services/queue/queueService");
  const bookingService = require("../src/services/bookingService");
  const triageService = require("../src/services/ai/triageService");
  const queueAi = require("../src/services/ai/queueAi");
  const aiPredictions = require("../src/services/ai/aiPredictions");
  const { AiClient, setClient } = require("../src/services/ai/aiClient");
  const { DEFAULT_ROLE_PERMISSIONS } = require("../src/config/permissions");
  const { todayDate, dateToMs } = require("../src/utils/dateKey");

  const profiles = await db.DoctorProfile.findAll({ attributes: ["doctorId", "clinicId", "specialtyId"], raw: true, limit: 2, order: [["doctorId", "ASC"]] });
  assert.ok(profiles.length >= 2);
  const created = { rooms: [], schedules: [], users: [] };
  const doctors = [];
  for (const [i, p] of profiles.entries()) {
    const room = await db.Room.create({ clinicId: p.clinicId, specialtyId: p.specialtyId, code: `AI${i}${Date.now() % 100000}`, name: `Phòng AI ${i}`, isActive: true });
    created.rooms.push(room.id);
    doctors.push({ id: Number(p.doctorId), specialtyId: Number(p.specialtyId), room, actor: { id: Number(p.doctorId), permissions: new Set(DEFAULT_ROLE_PERMISSIONS.R2) } });
  }
  const staffUser = await db.User.create({ email: `aitest-staff-${Date.now()}@example.com`, firstName: "A", lastName: "Staff", roleId: "R5", isActive: true, tokenVersion: 0 });
  created.users.push(staffUser.id);
  const receptionist = { id: Number(staffUser.id), permissions: new Set(DEFAULT_ROLE_PERMISSIONS.R5) };
  const today = todayDate();
  for (const d of doctors) {
    for (const tc of ["T1", "T2", "T3"]) {
      const [row, made] = await db.Schedule.findOrCreate({ where: { doctorId: d.id, workDate: today, timeType: tc }, defaults: { maxNumber: 5, currentNumber: 0, status: "available" }, raw: false });
      if (made) created.schedules.push(row.id);
    }
  }
  return { db, queue, bookingService, triageService, queueAi, aiPredictions, AiClient, setClient, doctors, receptionist, created, today, dateToMs, DEFAULT_ROLE_PERMISSIONS };
};

const cleanup = async (ctx) => {
  const { db, created } = ctx;
  const users = await db.User.findAll({ where: { email: { [db.Sequelize.Op.like]: "aitest-%" } }, attributes: ["id"], raw: true, paranoid: false });
  const uids = [...new Set([...created.users, ...users.map((u) => u.id)])];
  // Gồm cả vé còn sót từ lần chạy trước bị ngắt giữa chừng (theo phòng của lần này HOẶC theo lịch hẹn của user test)
  const testBookings = uids.length ? await db.Booking.findAll({ where: { patientId: uids }, attributes: ["id"], raw: true }) : [];
  const { Op } = db.Sequelize;
  const tickets = await db.QueueTicket.findAll({
    where: { [Op.or]: [{ roomId: created.rooms }, ...(testBookings.length ? [{ bookingId: testBookings.map((b) => b.id) }] : [])] },
    attributes: ["id"], raw: true,
  });
  if (tickets.length) {
    const ids = tickets.map((t) => t.id);
    await db.QueueEvent.destroy({ where: { ticketId: ids } });
    await db.AiPrediction.destroy({ where: { ticketId: ids } });
    await db.QueueTicket.destroy({ where: { id: ids } });
  }
  if (uids.length) {
    await db.SymptomIntake.destroy({ where: { userId: uids } });
    await db.Booking.destroy({ where: { patientId: uids } });
  }
  if (created.schedules.length) await db.Schedule.destroy({ where: { id: created.schedules } });
  await db.Room.destroy({ where: { id: created.rooms } });
  if (uids.length) {
    await db.PatientProfile.destroy({ where: { ownerUserId: uids }, force: true });
    await db.User.destroy({ where: { id: uids }, force: true });
  }
  await db.MlModelVersion.destroy({ where: { version: ["test-v1", "test-tri-1"] } });
  ctx.queueAi.clearCaches();
  ctx.setClient(null);
};

const confirmedBooking = async (ctx, doctor, timeType, tag) => {
  const email = `aitest-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  const r = await ctx.bookingService.createBooking({
    email, doctorId: doctor.id, date: ctx.dateToMs(ctx.today), timeType, fullName: `Test ${tag}`, selectedGender: "M", address: "x", phoneNumber: "0900000000",
  });
  assert.equal(r.errCode, 0, r.errMessage);
  ctx.created.users.push(r.booking.patientId);
  assert.equal((await ctx.bookingService.verifyBooking({ token: r.booking.token, doctorId: doctor.id })).errCode, 0);
  return { bookingId: r.booking.id, userId: Number(r.booking.patientId), patient: { id: Number(r.booking.patientId), permissions: new Set(ctx.DEFAULT_ROLE_PERMISSIONS.R3) } };
};

test("AI hoạt động: ETA dùng AI theo lô, ghi triệu chứng/dự đoán/phiên bản mô hình, đối sánh với thực tế", opt, async () => {
  const ctx = await setup();
  const ai = await fakeAi();
  const { db, queue, doctors, receptionist } = ctx;
  const [d1] = doctors;
  try {
    ctx.setClient(new ctx.AiClient({ baseUrl: ai.url, token: "tok", timeoutMs: 1500 }));
    ctx.queueAi.clearCaches();

    // 1. Bệnh nhân khai triệu chứng + mức nặng khi đặt lịch -> symptom_intakes (có gợi ý AI + khoa đã ánh xạ về id thật)
    const b = await confirmedBooking(ctx, d1, "T1", "severe");
    const intake = await ctx.triageService.recordIntake({ bookingId: b.bookingId, userId: b.userId, text: "đau ngực khi đi nhanh", severity: "nặng" });
    const row = await db.SymptomIntake.findOne({ where: { id: intake.id }, raw: true });
    assert.equal(row.severity, "SEVERE");
    assert.equal(row.urgency, "URGENT");
    assert.equal(Number(row.confidence), 0.9);
    const cardio = await db.Specialty_Translation.findOne({ where: { lang: "vi", name: "Tim mạch" }, attributes: ["specialtyId"], raw: true });
    assert.equal(Number(row.suggestedSpecialtyId), Number(cardio.specialtyId));
    assert.ok(row.modelVersionId, "đã đăng ký phiên bản mô hình triage");
    assert.equal((await db.MlModelVersion.findOne({ where: { kind: "TRIAGE", version: "test-tri-1" }, raw: true })).algorithm, "FakeLR");

    // 2. Vào hàng: một vé nặng (khai triệu chứng) + một vé vãng lai
    const severeTicket = await queue.checkIn({ bookingId: b.bookingId, actor: b.patient });
    const walk = await queue.createWalkIn({ doctorId: d1.id, name: "Khach Vang Lai", actor: receptionist });
    const board = await queue.getDoctorBoard({ doctorId: d1.id, actor: d1.actor });
    assert.equal(board.waiting.length, 2);
    for (const t of board.waiting) {
      assert.equal(t.etaBasis, "ml");
      assert.equal(t.modelVersion, "test-v1");
      assert.ok(t.predictedDurationRangeMin[0] < t.predictedDurationMin && t.predictedDurationMin < t.predictedDurationRangeMin[1]);
    }
    assert.equal(board.waiting.find((t) => t.id === severeTicket.id).predictedDurationMin, 30, "vé nặng được dự đoán lâu hơn");
    assert.equal(board.waiting.find((t) => t.id === walk.id).predictedDurationMin, 10);

    // 3. Đặc trưng gửi sang AI đúng: khoa là TÊN tiếng Việt trong DB, severity lấy từ symptom_intakes, nguồn vé...
    const items = ai.state.bodies.flatMap((x) => x.items);
    const severeItem = items.find((it) => it.severity === "SEVERE");
    assert.ok(severeItem, "đặc trưng severity được gửi sang AI");
    assert.equal(severeItem.source, "BOOKED");
    assert.ok(typeof severeItem.department === "string" && severeItem.department.length > 2);
    assert.ok(items.some((it) => it.source === "WALK_IN" && !("severity" in it)), "vãng lai chưa khai mức nặng thì không gửi (AI tự dùng mặc định)");
    assert.ok(items.every((it) => it.hour_of_day >= 5 && it.hour_of_day <= 22 && Number.isInteger(it.queue_length)));
    // AI Service nhận được nhiều vé trong CÙNG MỘT lần gọi (theo lô), không gọi riêng từng vé
    assert.ok(ai.state.bodies.some((x) => x.items.length >= 2));

    // 4. ai_predictions được ghi lúc vào hàng (bất đồng bộ) và gắn đúng phiên bản mô hình
    const preds = await waitFor(async () => {
      const r = await db.AiPrediction.findAll({ where: { ticketId: [severeTicket.id, walk.id] }, raw: true });
      return r.length === 2 ? r : null;
    });
    assert.ok(preds, "đã ghi 2 dự đoán");
    for (const p of preds) {
      assert.ok(p.modelVersionId);
      const f = typeof p.features === "string" ? JSON.parse(p.features) : p.features;
      assert.equal(f.basis, "ml");
      assert.equal(f.model_version, "test-v1");
      assert.ok(f.baseline_wait_min !== undefined && f.const15_wait_min !== undefined && f.baseline_duration_min > 0);
    }
    const mv = await db.MlModelVersion.findOne({ where: { kind: "DURATION", version: "test-v1" }, raw: true });
    assert.equal(mv.algorithm, "FakeXGB", "siêu dữ liệu mô hình lấy từ /model-info");
    // chỉ ghi 1 lần cho mỗi vé (check-in lặp lại không tạo thêm)
    await queue.checkIn({ bookingId: b.bookingId, actor: b.patient });
    await sleep(200);
    assert.equal(await db.AiPrediction.count({ where: { ticketId: severeTicket.id } }), 1);

    // 5. Khám xong -> điền kết quả THỰC TẾ -> có số liệu đối sánh
    await queue.callTicket({ ticketId: severeTicket.id, actor: d1.actor });
    await queue.startTicket({ ticketId: severeTicket.id, actor: d1.actor });
    await sleep(1200);
    await queue.finishTicket({ ticketId: severeTicket.id, actor: d1.actor });
    const filled = await waitFor(async () => {
      const r = await db.AiPrediction.findOne({ where: { ticketId: severeTicket.id }, raw: true });
      return r && r.actualDurationMin !== null ? r : null;
    });
    assert.ok(filled, "đã điền thời lượng thực tế");
    assert.ok(Number(filled.actualDurationMin) >= 0.01 && Number(filled.actualWaitMin) >= 0);
    const metrics = await ctx.aiPredictions.getMetrics({ days: 1 });
    const group = metrics.byModel.find((g) => g.model === "ml:test-v1");
    assert.ok(group && group.n >= 1 && typeof group.duration.mae === "number");
    assert.ok(metrics.total.n >= 1);
  } finally {
    await cleanup(ctx);
    await ai.close();
  }
});

test("AI chết / sai: hàng đợi vẫn chạy bình thường, ETA dùng dự phòng, dự đoán vẫn được ghi (không gắn mô hình)", opt, async () => {
  const ctx = await setup();
  const { db, queue, doctors, receptionist } = ctx;
  const [d1] = doctors;
  try {
    const dead = new ctx.AiClient({ baseUrl: "http://127.0.0.1:1", timeoutMs: 200, failThreshold: 2, cooldownMs: 60000 });
    ctx.setClient(dead);
    ctx.queueAi.clearCaches();

    const w1 = await queue.createWalkIn({ doctorId: d1.id, name: "Khach 1", actor: receptionist });
    const w2 = await queue.createWalkIn({ doctorId: d1.id, name: "Khach 2", actor: receptionist });
    const board = await queue.getDoctorBoard({ doctorId: d1.id, actor: d1.actor });
    assert.equal(board.waiting.length, 2, "check-in/walk-in/board không bị ảnh hưởng khi AI chết");
    for (const t of board.waiting) {
      assert.notEqual(t.etaBasis, "ml");
      assert.ok(["default", "history"].includes(t.etaBasis));
      assert.equal(typeof t.estimatedWaitMin, "number");
      assert.equal(t.modelVersion, undefined);
    }
    assert.equal(dead.circuitState, "open", "ngắt mạch mở sau lỗi liên tiếp => không bị chậm vì gọi lại AI chết");

    const preds = await waitFor(async () => {
      const r = await db.AiPrediction.findAll({ where: { ticketId: [w1.id, w2.id] }, raw: true });
      return r.length === 2 ? r : null;
    });
    assert.ok(preds);
    for (const p of preds) {
      assert.equal(p.modelVersionId, null, "dự phòng: không gắn phiên bản mô hình");
      const f = typeof p.features === "string" ? JSON.parse(p.features) : p.features;
      assert.ok(["default", "history"].includes(f.basis));
      assert.ok(Number(p.predictedDurationMin) > 0);
    }
    // Toàn bộ vòng đời vẫn khám được
    const c = await queue.callNext({ actor: d1.actor });
    await queue.startTicket({ ticketId: c.id, actor: d1.actor });
    assert.equal((await queue.finishTicket({ ticketId: c.id, actor: d1.actor })).status, "DONE");
  } finally {
    await cleanup(ctx);
  }
});

test("Triage: có AI -> gợi ý + ánh xạ chuyên khoa; AI sai dữ liệu -> AiRequestError; AI chết/tắt -> available=false (không chặn đặt lịch)", opt, async () => {
  const ctx = await setup();
  const ai = await fakeAi();
  const { AiClient, AiRequestError } = require("../src/services/ai/aiClient");
  try {
    const up = new AiClient({ baseUrl: ai.url, timeoutMs: 1000 });
    const r = await ctx.triageService.triage("đau ngực khi đi nhanh", up);
    assert.equal(r.available, true);
    assert.equal(r.predictions[0].specialty_key, "cardiology");
    const cardio = await ctx.db.Specialty_Translation.findOne({ where: { lang: "vi", name: "Tim mạch" }, attributes: ["specialtyId"], raw: true });
    assert.equal(r.predictions[0].specialtyId, Number(cardio.specialtyId), "khoá của AI được ánh xạ về id chuyên khoa thật trong DB");
    assert.equal(r.urgency, "URGENT");

    await assert.rejects(ctx.triageService.triage("mô tả sai", up), AiRequestError);

    const dead = new AiClient({ baseUrl: "http://127.0.0.1:1", timeoutMs: 200 });
    const down = await ctx.triageService.triage("đau răng", dead);
    assert.equal(down.available, false);
    assert.match(down.reason, /chọn chuyên khoa thủ công/);
    assert.equal((await ctx.triageService.triage("đau răng", new AiClient({ baseUrl: "" }))).available, false);

    // Khai mức nặng bằng tiếng Việt/Anh, giá trị lạ bị bỏ qua
    const { normalizeSeverity } = ctx.triageService;
    assert.deepEqual(["nhẹ", "Vừa", "NẶNG", "severe", "???", null].map(normalizeSeverity), ["MILD", "MODERATE", "SEVERE", "SEVERE", null, null]);
  } finally {
    await cleanup(ctx);
    await ai.close();
  }
});
