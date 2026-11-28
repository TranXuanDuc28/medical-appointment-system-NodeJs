/**
 * LOAD TEST hàng đợi (D2): N bệnh nhân + R phòng/bác sĩ + R màn hình TV, qua HTTP + Socket.io trên server ĐANG CHẠY.
 *
 *   # 1) chạy server với rate-limit tắt (chỉ để đo tải) và nhắc hẹn/tự vắng mặt tắt cho khỏi nhiễu:
 *   LOAD_TEST_DISABLE_RATE_LIMIT=true REMINDERS_ENABLED=false NOSHOW_AUTO_ENABLED=false PORT=6990 node build/server.js
 *   # 2) chạy kịch bản:
 *   BASE=http://localhost:6990 N=150 ROOMS=5 node scripts/load-queue.js
 *
 * Kịch bản:
 *   0. Chống overbooking: N yêu cầu đặt lịch ĐỒNG THỜI vào slot sức chứa 5 (gọi thẳng bookingService) -> đúng 5 thành công.
 *   1. Dựng dữ liệu tạm (email "load-*", phòng "LT*"), đăng nhập N bệnh nhân, mở N+2R socket.
 *   2. Bão check-in: N bệnh nhân check-in cùng lúc -> đo độ trễ HTTP, kiểm tra số thứ tự không trùng.
 *   3. Phục vụ: mỗi bác sĩ gọi số -> bắt đầu -> hoàn thành lần lượt hết hàng, các phòng chạy song song.
 *      Đo (a) độ trễ HTTP, (b) từ lúc bấm "Gọi số" đến khi TV nhận TICKET_CALLED, (c) đến khi điện thoại bệnh nhân
 *      nhận TICKET_CALLED, (d) đến khi bệnh nhân cuối hàng nhận ETA mới (QUEUE_TICKET_UPDATED) = đẩy tin tới cả hàng.
 *   4. Kiểm tra DB: mọi vé DONE, không trùng số, nhật ký đủ. Dọn sạch dữ liệu.
 *
 * Tiêu chí đạt (đối chiếu DanhGia_NangCap_HeThong.md D2): 0 lỗi HTTP/socket, 0 overbooking, 0 trùng số,
 * p95 "gọi số -> TV/điện thoại" < 1000 ms. Kết quả in ra bảng và ghi JSON nếu có OUT=<đường dẫn>.
 */
require("dotenv").config({ quiet: true });
const fs = require("fs");
const bcrypt = require("bcryptjs");
const { io } = require("socket.io-client");
const db = require("../src/models");
const { todayDate, dateToMs } = require("../src/utils/dateKey");

const BASE = process.env.BASE || "http://localhost:6990";
const N = Math.max(5, Number(process.env.N) || 150);
const ROOMS = Math.max(1, Number(process.env.ROOMS) || 5);
const THRESHOLD_MS = Number(process.env.P95_MS) || 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = () => performance.now();

/* ------------------------------ tiện ích ------------------------------ */
const pct = (arr, p) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return Math.round(s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)] * 10) / 10;
};
const stats = (arr) => ({
  n: arr.length, min: arr.length ? Math.round(Math.min(...arr)) : null, p50: pct(arr, 50), p95: pct(arr, 95), p99: pct(arr, 99),
  max: arr.length ? Math.round(Math.max(...arr)) : null,
  mean: arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null,
});

/** Chạy fn trên danh sách với tối đa `limit` việc cùng lúc. */
const pool = async (items, limit, fn) => {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const k = i++;
      out[k] = await fn(items[k], k);
    }
  }));
  return out;
};

class Client {
  constructor() { this.cookies = {}; this.errors = []; }
  async req(method, path, body, timed) {
    const headers = { "Content-Type": "application/json" };
    const cookie = Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; ");
    if (cookie) headers.Cookie = cookie;
    const t0 = now();
    const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    for (const sc of res.headers.getSetCookie ? res.headers.getSetCookie() : []) {
      const [pair] = sc.split(";");
      const i = pair.indexOf("=");
      const k = pair.slice(0, i), v = pair.slice(i + 1);
      if (v === "") delete this.cookies[k]; else this.cookies[k] = v;
    }
    let json = null;
    try { json = await res.json(); } catch (_) { /* không phải JSON */ }
    const ms = now() - t0;
    if (timed) timed.push(ms);
    return { status: res.status, body: json, ms };
  }
  get(p, timed) { return this.req("GET", p, null, timed); }
  post(p, b, timed) { return this.req("POST", p, b || {}, timed); }
}

/** Socket có ghi lại thời điểm nhận từng sự kiện (cùng đồng hồ với phía gửi vì cùng tiến trình). */
const connectSocket = (token) =>
  new Promise((resolve, reject) => {
    const t0 = now();
    const socket = io(BASE, { transports: ["websocket"], auth: { token }, reconnection: false });
    const rec = { socket, called: new Map(), lastTicketUpdate: 0, updates: 0, errors: [], connectMs: 0 };
    socket.on("TICKET_CALLED", (p) => { if (!rec.called.has(p.ticketId)) rec.called.set(p.ticketId, now()); });
    socket.on("QUEUE_TICKET_UPDATED", () => { rec.lastTicketUpdate = now(); rec.updates++; });
    socket.on("QUEUE_UPDATED", () => { rec.lastRoomUpdate = now(); });
    socket.on("ERROR", (e) => rec.errors.push(e));
    socket.on("connect", () => { rec.connectMs = now() - t0; resolve(rec); });
    socket.on("connect_error", (e) => reject(e));
    setTimeout(() => reject(new Error("socket timeout")), 15000);
  });

/** Chờ điều kiện (poll 2ms); trả thời điểm thoả hoặc null nếu quá hạn. */
const waitUntil = async (fn, ms = 8000) => {
  const end = now() + ms;
  while (now() < end) {
    const v = fn();
    if (v) return v;
    await sleep(2);
  }
  return null;
};

/* ------------------------------ chạy ------------------------------ */
(async () => {
  const stamp = Date.now();
  const cleanup = { users: [], rooms: [], schedules: [], overbookDoctor: null, overbookDate: null };
  const R = { params: { N, ROOMS, BASE, threshold_ms: THRESHOLD_MS }, startedAt: new Date().toISOString(), node: process.version };
  const problems = [];
  const sockets = [];

  try {
    const probe = await fetch(BASE + "/api/queue/rooms").catch(() => null);
    if (!probe) throw new Error(`Không kết nối được server ${BASE}. Hãy chạy server trước (xem hướng dẫn đầu file).`);
    if (probe.status === 429) throw new Error("Server đang bật rate-limit. Chạy server với LOAD_TEST_DISABLE_RATE_LIMIT=true.");

    /* ---------- 0. Chống overbooking ---------- */
    {
      const booking = require("../src/services/bookingService");
      const doctor = await db.User.findOne({ where: { roleId: "R2" }, attributes: ["id"], raw: true });
      const d = new Date(Date.now() + 700 * 24 * 3600 * 1000).toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
      const CAP = 5;
      await db.Schedule.create({ doctorId: doctor.id, workDate: d, timeType: "T1", maxNumber: CAP, currentNumber: 0, status: "available" });
      cleanup.overbookDoctor = doctor.id; cleanup.overbookDate = d;
      const mk = (i) => ({
        email: `load-ob-${stamp}-${i}@example.com`, doctorId: doctor.id, date: dateToMs(d), timeType: "T1",
        fullName: `Load OB ${i}`, selectedGender: "M", address: "x", phoneNumber: "0900000000",
      });
      const t0 = now();
      const res = await Promise.all(Array.from({ length: N }, (_, i) => booking.createBooking(mk(i)).catch((e) => ({ errCode: -99, errMessage: e.message }))));
      const ok = res.filter((r) => r.errCode === 0).length;
      const full = res.filter((r) => r.errCode === 4).length;
      const other = res.length - ok - full;
      const slot = await db.Schedule.findOne({ where: { doctorId: doctor.id, workDate: d, timeType: "T1" }, raw: true });
      const held = await db.Booking.count({ where: { doctorId: doctor.id, workDate: d } });
      R.overbooking = { requests: N, capacity: CAP, succeeded: ok, rejectedFull: full, otherErrors: other, bookingsInDb: held, currentNumber: Number(slot.currentNumber), totalMs: Math.round(now() - t0) };
      if (ok !== CAP || held !== CAP || Number(slot.currentNumber) > CAP) problems.push(`OVERBOOKING: ${ok} thành công / ${held} trong DB / currentNumber ${slot.currentNumber}, sức chứa ${CAP}`);
      if (other) problems.push(`Đặt lịch đồng thời: ${other} yêu cầu lỗi lạ (ví dụ: ${JSON.stringify(res.find((r) => ![0, 4].includes(r.errCode)))})`);
    }

    /* ---------- 1. Dựng dữ liệu ---------- */
    const base = await db.DoctorProfile.findOne({ attributes: ["clinicId", "specialtyId", "priceId"], raw: true });
    const today = todayDate();
    const pwd = bcrypt.hashSync("Test@12345", 8);
    const mkUser = async (role, tag) => {
      const email = `load-${tag}-${stamp}@example.com`;
      const u = await db.User.create({ email, password: pwd, firstName: "LOAD", lastName: tag, roleId: role, isActive: true, tokenVersion: 0 });
      cleanup.users.push(u.id);
      return { id: Number(u.id), email };
    };
    const doctors = [];
    for (let r = 0; r < ROOMS; r++) {
      const doc = await mkUser("R2", `doc${r}`);
      await db.DoctorProfile.create({ doctorId: doc.id, specialtyId: base.specialtyId, clinicId: base.clinicId, priceId: base.priceId });
      const room = await db.Room.create({ clinicId: base.clinicId, specialtyId: base.specialtyId, code: `LT${r}${stamp % 100000}`, name: `Phòng tải ${r}`, floor: "1", isActive: true });
      cleanup.rooms.push(room.id);
      for (const tc of ["T2", "T3", "T5", "T6"]) {
        const s = await db.Schedule.create({ doctorId: doc.id, workDate: today, timeType: tc, maxNumber: 999, currentNumber: 0, status: "available", roomId: room.id });
        cleanup.schedules.push(s.id);
      }
      const tv = await mkUser("R8", `tv${r}`);
      doctors.push({ ...doc, roomId: Number(room.id), tv, tickets: [] });
    }
    const patients = [];
    for (let i = 0; i < N; i++) {
      const p = await mkUser("R3", `p${i}`);
      const doc = doctors[i % ROOMS];
      const b = await db.Booking.create({ code: `LT${stamp % 1e7}${i}`.slice(0, 16), doctorId: doc.id, workDate: today, timeType: "T2", patientId: p.id, statusId: "S2", source: "ONLINE" });
      patients.push({ ...p, doc, bookingId: Number(b.id) });
    }

    // Đăng nhập (giới hạn 25 cùng lúc để đo hệ thống hàng đợi, không đo bcrypt)
    const loginMs = [];
    const login = async (u) => {
      const c = new Client();
      const r = await c.post("/api/login", { email: u.email, password: "Test@12345" }, loginMs);
      if (r.status !== 200 || !r.body || !r.body.token) throw new Error(`đăng nhập ${u.email} lỗi ${r.status}: ${JSON.stringify(r.body).slice(0, 120)}`);
      return { c, token: r.body.token };
    };
    await pool(patients, 25, async (p) => { Object.assign(p, await login(p)); });
    for (const d of doctors) { Object.assign(d, await login(d)); Object.assign(d.tv, await login(d.tv)); }
    R.login = stats(loginMs);

    // Socket: N bệnh nhân + R bác sĩ + R TV
    const t0conn = now();
    const connErr = [];
    const mkSock = async (o) => {
      try { o.sock = await connectSocket(o.token); sockets.push(o.sock.socket); } catch (e) { connErr.push(e.message); }
    };
    await pool([...patients, ...doctors, ...doctors.map((d) => d.tv)], 60, mkSock);
    const connectMs = [...patients, ...doctors, ...doctors.map((d) => d.tv)].filter((o) => o.sock).map((o) => o.sock.connectMs);
    R.sockets = { target: N + 2 * ROOMS, connected: connectMs.length, failed: connErr.length, connectMs: stats(connectMs), allConnectedInMs: Math.round(now() - t0conn) };
    if (connErr.length) problems.push(`${connErr.length} socket không kết nối được: ${connErr[0]}`);
    for (const d of doctors) {
      d.sock && d.sock.socket.emit("QUEUE_JOIN_DOCTOR", { doctorId: d.id });
      d.tv.sock && (await new Promise((res) => d.tv.sock.socket.emit("QUEUE_JOIN_ROOM", { roomId: d.roomId }, res)));
    }
    await sleep(300);

    /* ---------- 2. Bão check-in ---------- */
    const ciMs = [];
    const ciErr = [];
    const t0ci = now();
    await Promise.all(patients.map(async (p) => {
      const r = await p.c.post("/api/queue/check-in", { bookingId: p.bookingId }, ciMs);
      if (r.status === 200 && r.body && r.body.errCode === 0) { p.ticketId = Number(r.body.data.id); p.doc.tickets.push(p); }
      else ciErr.push({ status: r.status, body: JSON.stringify(r.body).slice(0, 150) });
    }));
    const ciTotal = now() - t0ci;
    const tickets = await db.QueueTicket.findAll({ where: { roomId: cleanup.rooms }, attributes: ["id", "roomId", "seq", "shift", "status"], raw: true });
    const seqKeys = tickets.map((t) => `${t.roomId}:${t.shift}:${t.seq}`);
    const dupSeq = seqKeys.length - new Set(seqKeys).size;
    R.checkIn = { requests: N, ok: N - ciErr.length, errors: ciErr.length, totalMs: Math.round(ciTotal), throughputPerSec: Math.round((N / ciTotal) * 1000 * 10) / 10, latencyMs: stats(ciMs), ticketsInDb: tickets.length, duplicateSeq: dupSeq, perRoom: doctors.map((d) => d.tickets.length) };
    if (ciErr.length) problems.push(`${ciErr.length} check-in lỗi: ${JSON.stringify(ciErr[0])}`);
    if (dupSeq) problems.push(`${dupSeq} số thứ tự bị trùng`);
    if (tickets.length !== N - ciErr.length) problems.push(`Số vé trong DB (${tickets.length}) khác số check-in thành công (${N - ciErr.length})`);
    await sleep(800); // để các đợt đẩy ETA sau check-in lắng xuống, không lẫn vào đo gọi số

    /* ---------- 3. Phục vụ: gọi -> khám -> xong ---------- */
    const callHttp = [], startHttp = [], finishHttp = [], tvLat = [], patLat = [], fanLat = [];
    const svcErr = [];
    const t0svc = now();
    await Promise.all(doctors.map(async (d) => {
      let served = 0;
      while (served < d.tickets.length) {
        const waiting = d.tickets.filter((p) => !p.done);
        const last = waiting[waiting.length - 1];
        const tStart = now();
        const lastBefore = last && last.sock ? last.sock.lastTicketUpdate : 0;
        const call = await d.c.post("/api/queue/doctor/call-next", {}, callHttp);
        if (call.status !== 200 || call.body.errCode !== 0) { svcErr.push({ step: "call", status: call.status, body: JSON.stringify(call.body).slice(0, 150) }); break; }
        const tid = Number(call.body.data.id);
        const pat = d.tickets.find((p) => p.ticketId === tid);
        const tvAt = await waitUntil(() => d.tv.sock && d.tv.sock.called.get(tid));
        const patAt = pat && pat.sock ? await waitUntil(() => pat.sock.called.get(tid)) : null;
        if (tvAt) tvLat.push(tvAt - tStart); else problems.push(`TV phòng ${d.roomId} không nhận TICKET_CALLED vé ${tid}`);
        if (patAt) patLat.push(patAt - tStart); else problems.push(`Bệnh nhân vé ${tid} không nhận TICKET_CALLED`);
        // cả hàng nhận ETA mới: bệnh nhân cuối hàng (nếu không phải chính người vừa được gọi)
        if (last && last !== pat && last.sock) {
          const at = await waitUntil(() => last.sock.lastTicketUpdate > lastBefore && last.sock.lastTicketUpdate > tStart && last.sock.lastTicketUpdate);
          if (at) fanLat.push(at - tStart);
        }
        const st = await d.c.post(`/api/queue/tickets/${tid}/start`, {}, startHttp);
        const fin = st.status === 200 ? await d.c.post(`/api/queue/tickets/${tid}/finish`, {}, finishHttp) : st;
        if (st.status !== 200 || fin.status !== 200) { svcErr.push({ step: "start/finish", status: fin.status, body: JSON.stringify(fin.body).slice(0, 150) }); break; }
        if (pat) pat.done = true;
        served++;
      }
    }));
    const svcTotal = now() - t0svc;
    R.service = {
      tickets: N, totalMs: Math.round(svcTotal), errors: svcErr.length,
      callHttpMs: stats(callHttp), startHttpMs: stats(startHttp), finishHttpMs: stats(finishHttp),
      callToTvMs: stats(tvLat), callToPatientMs: stats(patLat), callToQueueFanoutMs: stats(fanLat),
      eventsReceivedByPatients: patients.reduce((a, p) => a + (p.sock ? p.sock.updates : 0), 0),
    };
    if (svcErr.length) problems.push(`${svcErr.length} lỗi khi phục vụ: ${JSON.stringify(svcErr[0])}`);

    /* ---------- 4. Kiểm tra DB ---------- */
    const final = await db.QueueTicket.findAll({ where: { roomId: cleanup.rooms }, attributes: ["id", "status"], raw: true });
    const notDone = final.filter((t) => t.status !== "DONE").length;
    const evCount = await db.QueueEvent.count({ where: { ticketId: final.map((t) => t.id) } });
    R.db = { tickets: final.length, notDone, events: evCount, expectedMinEvents: final.length * 4 };
    if (notDone) problems.push(`${notDone} vé chưa DONE`);
    if (evCount < final.length * 4) problems.push(`Nhật ký thiếu: ${evCount} < ${final.length * 4}`);
    const sockErr = [...patients, ...doctors, ...doctors.map((d) => d.tv)].reduce((a, o) => a + (o.sock ? o.sock.errors.length : 0), 0);
    if (sockErr) problems.push(`${sockErr} sự kiện ERROR trên socket`);

    // Tiêu chí p95
    const p95 = (s) => (s && s.p95 !== null ? s.p95 : Infinity);
    for (const [name, s] of [["Gọi số -> TV", R.service.callToTvMs], ["Gọi số -> điện thoại bệnh nhân", R.service.callToPatientMs], ["Gọi số -> ETA tới cuối hàng", R.service.callToQueueFanoutMs]]) {
      if (p95(s) >= THRESHOLD_MS) problems.push(`p95 ${name} = ${s.p95} ms >= ${THRESHOLD_MS} ms`);
    }
  } catch (e) {
    problems.push(`Lỗi kịch bản: ${e.stack || e.message}`);
  } finally {
    sockets.forEach((s) => { try { s.close(); } catch (_) { /* đã đóng */ } });
    /* ---------- Dọn dữ liệu tạm ---------- */
    try {
      const tk = cleanup.rooms.length ? await db.QueueTicket.findAll({ where: { roomId: cleanup.rooms }, attributes: ["id"], raw: true }) : [];
      if (tk.length) await db.QueueEvent.destroy({ where: { ticketId: tk.map((t) => t.id) } });
      if (tk.length) {
        const ids = tk.map((t) => t.id);
        for (const m of ["AiPrediction"]) if (db[m]) await db[m].destroy({ where: { ticketId: ids } }).catch(() => {});
      }
      if (cleanup.rooms.length) await db.QueueTicket.destroy({ where: { roomId: cleanup.rooms } });
      const guests = await db.User.findAll({ where: { email: { [db.Sequelize.Op.like]: "load-%" } }, attributes: ["id"], raw: true, paranoid: false });
      const uids = [...new Set([...cleanup.users, ...guests.map((g) => g.id)])];
      if (uids.length) {
        const bk = await db.Booking.findAll({ where: { patientId: uids }, attributes: ["id"], raw: true });
        if (bk.length) await db.Notification.destroy({ where: { userId: uids } }).catch(() => {});
        await db.Booking.destroy({ where: { patientId: uids } });
      }
      if (cleanup.schedules.length) await db.Schedule.destroy({ where: { id: cleanup.schedules } });
      if (cleanup.overbookDoctor) await db.Schedule.destroy({ where: { doctorId: cleanup.overbookDoctor, workDate: cleanup.overbookDate, timeType: "T1" } });
      if (cleanup.rooms.length) await db.Room.destroy({ where: { id: cleanup.rooms } });
      if (uids.length) {
        await db.PatientProfile.destroy({ where: { ownerUserId: uids }, force: true });
        await db.DoctorProfile.destroy({ where: { doctorId: uids } });
        await db.User.destroy({ where: { id: uids }, force: true });
      }
    } catch (e) {
      problems.push(`Dọn dữ liệu lỗi: ${e.message} (kiểm tra email "load-*", phòng "LT*")`);
    }
    R.problems = problems;
    R.passed = problems.length === 0;
    R.finishedAt = new Date().toISOString();

    const row = (name, s) => s ? `${name.padEnd(38)} n=${String(s.n).padEnd(4)} p50=${String(s.p50).padEnd(7)} p95=${String(s.p95).padEnd(7)} p99=${String(s.p99).padEnd(7)} max=${s.max}` : "";
    console.log(`\n===== LOAD TEST: ${N} bệnh nhân, ${ROOMS} phòng =====`);
    if (R.overbooking) console.log(`Overbooking : ${R.overbooking.requests} yêu cầu đồng thời / sức chứa ${R.overbooking.capacity} -> thành công ${R.overbooking.succeeded}, hết chỗ ${R.overbooking.rejectedFull}, lỗi khác ${R.overbooking.otherErrors}, trong DB ${R.overbooking.bookingsInDb}`);
    if (R.sockets) console.log(`Socket      : ${R.sockets.connected}/${R.sockets.target} kết nối, ${R.sockets.allConnectedInMs} ms tổng; ${row("kết nối", R.sockets.connectMs)}`);
    if (R.checkIn) console.log(`Check-in    : ${R.checkIn.ok}/${R.checkIn.requests} OK, ${R.checkIn.totalMs} ms (${R.checkIn.throughputPerSec}/s), trùng số ${R.checkIn.duplicateSeq}\n  ${row("HTTP check-in (ms)", R.checkIn.latencyMs)}`);
    if (R.service) {
      console.log(`Phục vụ     : ${R.service.tickets} vé trong ${R.service.totalMs} ms, lỗi ${R.service.errors}`);
      for (const [n, s] of [["HTTP gọi số", R.service.callHttpMs], ["HTTP bắt đầu khám", R.service.startHttpMs], ["HTTP hoàn thành", R.service.finishHttpMs], ["Gọi số -> TV nhận sự kiện", R.service.callToTvMs], ["Gọi số -> điện thoại bệnh nhân", R.service.callToPatientMs], ["Gọi số -> ETA tới cuối hàng", R.service.callToQueueFanoutMs]]) console.log("  " + row(n + " (ms)", s));
    }
    if (R.db) console.log(`DB          : ${R.db.tickets} vé, chưa DONE ${R.db.notDone}, nhật ký ${R.db.events} (>= ${R.db.expectedMinEvents})`);
    console.log(R.passed ? `\n✅ ĐẠT (p95 < ${THRESHOLD_MS} ms, 0 lỗi)` : `\n❌ KHÔNG ĐẠT:\n - ${problems.join("\n - ")}`);
    if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(R, null, 2));
    await db.sequelize.close();
    process.exit(R.passed ? 0 : 1);
  }
})();
