/** Test thuần (không cần DB) cho AiClient, ETA có AI và thống kê đối sánh. Dùng máy chủ AI giả ở cổng ngẫu nhiên. */
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

const { AiClient, AiUnavailableError, AiRequestError } = require("../src/services/ai/aiClient");
const { estimateForDoctor } = require("../src/services/queue/queueEta");
const { _internal } = require("../src/services/ai/aiPredictions");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const at = (hhmm) => new Date(`2026-11-12T${hhmm}:00+07:00`);
const MIN = 60 * 1000;

/** Máy chủ AI giả: đếm số request, cho phép chỉnh hành vi từng lúc. */
const fakeAi = async () => {
  const state = { calls: 0, headers: [], bodies: [], mode: "ok", delayMs: 0 };
  const server = http.createServer((req, res) => {
    state.calls += 1;
    state.headers.push(req.headers);
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", async () => {
      if (state.delayMs) await sleep(state.delayMs);
      const body = raw ? JSON.parse(raw) : null;
      state.bodies.push(body);
      const send = (code, obj) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };
      if (state.mode === "500") return send(500, { detail: "boom" });
      if (state.mode === "422") return send(422, { detail: "Phần tử #0: sai" });
      if (req.url === "/health") return send(200, { status: "ok" });
      if (req.url === "/predict-duration") {
        return send(200, { model_version: "v-test", predictions: body.items.map(() => ({ duration_min: 12.5, p10_min: 9, p90_min: 17, used_defaults: [], confidence: "high", model_version: "v-test" })) });
      }
      return send(404, { detail: "no" });
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { state, url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((r) => server.close(r)) };
};

test("AiClient tắt (không có URL): ném AiUnavailableError, không gọi mạng", async () => {
  const c = new AiClient({ baseUrl: "" });
  assert.equal(c.enabled, false);
  await assert.rejects(c.predictDuration([{ department: "Tim mạch" }]), AiUnavailableError);
});

test("AiClient gọi thành công, gửi token, chia lô khi > 200 phần tử", async () => {
  const s = await fakeAi();
  try {
    const c = new AiClient({ baseUrl: s.url, token: "bi-mat", timeoutMs: 1000 });
    const preds = await c.predictDuration(Array.from({ length: 450 }, () => ({ department: "Tim mạch" })));
    assert.equal(preds.length, 450);
    assert.equal(s.state.calls, 3, "450 phần tử => 3 lô (200 + 200 + 50)");
    assert.deepEqual(s.state.bodies.map((b) => b.items.length), [200, 200, 50]);
    assert.equal(s.state.headers[0]["x-ai-token"], "bi-mat");
    // /health không gửi token (để giám sát)
    await c.health();
    assert.equal(s.state.headers.at(-1)["x-ai-token"], undefined);
    assert.equal(c.circuitState, "closed");
  } finally {
    await s.close();
  }
});

test("AiClient: quá thời gian chờ => AiUnavailableError và tính là lỗi hạ tầng", async () => {
  const s = await fakeAi();
  try {
    s.state.delayMs = 300;
    const c = new AiClient({ baseUrl: s.url, timeoutMs: 50, failThreshold: 5 });
    await assert.rejects(c.predictDuration([{}]), (e) => e instanceof AiUnavailableError && /quá 50ms/.test(e.message));
    assert.equal(c.failures, 1);
  } finally {
    await s.close();
  }
});

test("AiClient: ngắt mạch mở sau N lỗi liên tiếp, không gọi mạng khi đang mở, tự thử lại sau khoảng nghỉ rồi đóng lại", async () => {
  const s = await fakeAi();
  try {
    s.state.mode = "500";
    const c = new AiClient({ baseUrl: s.url, timeoutMs: 500, failThreshold: 3, cooldownMs: 120 });
    for (let i = 0; i < 3; i++) await assert.rejects(c.predictDuration([{}]), AiUnavailableError);
    assert.equal(c.circuitState, "open");
    const callsWhenOpen = s.state.calls;
    await assert.rejects(c.predictDuration([{}]), (e) => /ngắt mạch/.test(e.message));
    assert.equal(s.state.calls, callsWhenOpen, "đang mở: KHÔNG gọi tới AI Service");

    await sleep(150);
    assert.equal(c.circuitState, "half-open");
    s.state.mode = "ok";
    const r = await c.predictDuration([{}]);
    assert.equal(r.length, 1);
    assert.equal(c.circuitState, "closed", "thử lại thành công => đóng mạch");
    assert.equal(c.failures, 0);
  } finally {
    await s.close();
  }
});

test("AiClient: lỗi 4xx (dữ liệu sai) là AiRequestError và KHÔNG làm mở ngắt mạch", async () => {
  const s = await fakeAi();
  try {
    s.state.mode = "422";
    const c = new AiClient({ baseUrl: s.url, failThreshold: 1 });
    for (let i = 0; i < 3; i++) await assert.rejects(c.predictDuration([{}]), (e) => e instanceof AiRequestError && e.status === 422 && /sai/.test(e.message));
    assert.equal(c.circuitState, "closed");
  } finally {
    await s.close();
  }
});

test("AiClient: mất kết nối (cổng đóng) => AiUnavailableError", async () => {
  const c = new AiClient({ baseUrl: "http://127.0.0.1:1", timeoutMs: 300, failThreshold: 2 });
  await assert.rejects(c.triage("đau răng"), AiUnavailableError);
  await assert.rejects(c.triage("đau răng"), AiUnavailableError);
  assert.equal(c.circuitState, "open");
  assert.equal(c.status().enabled, true);
});

/* ---------------------------- ETA có thời lượng từ AI ---------------------------- */
test("ETA dùng thời lượng AI khi có đủ cho mọi vé: basis=ml, kèm khoảng p10–p90 và baseline", async () => {
  const now = at("09:00");
  const tickets = [
    { id: 1, status: "IN_PROGRESS", startedAt: new Date(now - 5 * MIN), priority: "NORMAL", sortAt: at("08:30") },
    { id: 2, status: "WAITING", priority: "NORMAL", sortAt: at("08:40") },
    { id: 3, status: "WAITING", priority: "NORMAL", sortAt: at("08:50") },
  ];
  const durations = new Map([
    [1, { minutes: 20, p10: 15, p90: 28, version: "v1" }],
    [2, { minutes: 30, p10: 20, p90: 40, version: "v1" }],
    [3, { minutes: 8, p10: 6, p90: 11, version: "v1" }],
  ]);
  const eta = await estimateForDoctor(tickets, 12, now, { durations });
  assert.equal(eta.get(2).basis, "ml");
  assert.equal(eta.get(2).waitMinutes, 15, "ca đang khám còn 20 − 5 = 15 phút");
  assert.equal(eta.get(3).waitMinutes, 45, "15 + ca vé 2 dự đoán 30 phút");
  assert.equal(eta.get(3).durationMin, 8);
  assert.deepEqual([eta.get(3).p10, eta.get(3).p90, eta.get(3).modelVersion], [6, 11, "v1"]);
  // baseline cùng hàng đợi: (số người đứng trước + ca đang khám) × trung bình 12' / × 15'
  assert.equal(eta.get(3).baselineWaitMin, (1 + 1) * 12);
  assert.equal(eta.get(3).const15WaitMin, (1 + 1) * 15);
});

test("ETA: AI chỉ có cho một phần vé => không coi là ML, các vé thiếu dùng trung bình lịch sử", async () => {
  const now = at("09:00");
  const tickets = [
    { id: 1, status: "WAITING", priority: "NORMAL", sortAt: at("08:40") },
    { id: 2, status: "WAITING", priority: "NORMAL", sortAt: at("08:50") },
  ];
  const eta = await estimateForDoctor(tickets, 10, now, { durations: new Map([[1, { minutes: 25 }]]) });
  assert.equal(eta.get(2).basis, "history");
  assert.equal(eta.get(2).waitMinutes, 25, "vé 1 dùng 25 phút từ AI");
  assert.equal(eta.get(2).durationMin, 10, "vé 2 dùng trung bình");
});

test("ETA: không có AI và không có lịch sử => mặc định 15 phút (hành vi cũ không đổi)", async () => {
  const now = at("09:00");
  const tickets = [{ id: 1, status: "WAITING", priority: "NORMAL", sortAt: at("08:40") }, { id: 2, status: "WAITING", priority: "NORMAL", sortAt: at("08:50") }];
  const eta = await estimateForDoctor(tickets, null, now);
  assert.equal(eta.get(2).waitMinutes, 15);
  assert.equal(eta.get(2).basis, "default");
});

/* ---------------------------- thống kê đối sánh ---------------------------- */
test("statsFor: MAE của AI so với baseline và % cải thiện, độ phủ p10–p90", () => {
  const row = (pred, actual, f, pw, aw) => ({ predictedDurationMin: pred, actualDurationMin: actual, predictedWaitMin: pw, actualWaitMin: aw, f });
  const rows = [
    row(10, 12, { baseline_duration_min: 20, baseline_wait_min: 40, const15_wait_min: 60, p10_min: 8, p90_min: 15 }, 30, 32),
    row(20, 18, { baseline_duration_min: 20, baseline_wait_min: 40, const15_wait_min: 60, p10_min: 14, p90_min: 24 }, 50, 46),
    row(15, 40, { baseline_duration_min: 20, baseline_wait_min: 40, const15_wait_min: 60, p10_min: 12, p90_min: 18 }, 20, 25),
  ];
  const s = _internal.statsFor(rows);
  assert.equal(s.n, 3);
  assert.equal(s.duration.mae, 9.67); // (2 + 2 + 25) / 3
  assert.equal(s.duration.baselineMae, 10); // (8 + 2 + 20) / 3
  assert.equal(s.wait.mae, 3.67); // (2 + 4 + 5) / 3
  assert.equal(s.wait.baselineMae, 9.67); // (8 + 6 + 15) / 3
  assert.equal(s.wait.const15Mae, 25.67); // (28 + 14 + 35) / 3
  assert.equal(s.wait.improvementVsConst15Pct, 85.7);
  assert.equal(s.wait.improvementVsBaselinePct, 62);
  assert.equal(s.intervalCoverage, 0.667, "2/3 ca thực tế nằm trong [p10, p90]");
});

test("statsFor: không đủ dữ liệu thì trả null, không chia cho 0", () => {
  const s = _internal.statsFor([]);
  assert.equal(s.n, 0);
  assert.equal(s.duration.mae, null);
  assert.equal(s.wait.improvementVsConst15Pct, null);
  assert.equal(s.intervalCoverage, null);
});
