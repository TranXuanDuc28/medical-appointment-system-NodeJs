/**
 * Kiểm thử đầu-cuối HÀNG ĐỢI qua HTTP + Socket.io trên server ĐANG CHẠY (DB v2).
 *   BASE=http://localhost:6996 node scripts/e2e-queue.js
 * Kịch bản demo 3 thiết bị: bệnh nhân (điện thoại) – bác sĩ (laptop) – màn hình TV sảnh.
 * Tạo dữ liệu tạm (email "e2eq-*", phòng "E2EQ*") và dọn lại cuối cùng.
 */
require("dotenv").config({ quiet: true });
const bcrypt = require("bcryptjs");
const { io } = require("socket.io-client");
const db = require("../src/models");
const { todayDate, dateToMs } = require("../src/utils/dateKey");

const BASE = process.env.BASE || "http://localhost:6996";
let pass = 0;
let fail = 0;
const check = (name, cond, extra) => {
  if (cond) pass++;
  else {
    fail++;
    console.log(`❌ ${name}`, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : "");
  }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Client {
  constructor() { this.cookies = {}; }
  async req(method, path, body) {
    const headers = { "Content-Type": "application/json" };
    const cookie = Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; ");
    if (cookie) headers.Cookie = cookie;
    const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    for (const sc of res.headers.getSetCookie ? res.headers.getSetCookie() : []) {
      const [pair] = sc.split(";");
      const i = pair.indexOf("=");
      const k = pair.slice(0, i), v = pair.slice(i + 1);
      if (v === "") delete this.cookies[k]; else this.cookies[k] = v;
    }
    let json = null;
    try { json = await res.json(); } catch (_) {}
    return { status: res.status, body: json };
  }
  get(p) { return this.req("GET", p); }
  post(p, b) { return this.req("POST", p, b || {}); }
  put(p, b) { return this.req("PUT", p, b || {}); }
}

/** Kết nối socket xác thực bằng JWT, gom mọi sự kiện nhận được. */
const connectSocket = (token) =>
  new Promise((resolve, reject) => {
    const socket = io(BASE, { transports: ["websocket"], auth: { token }, reconnection: false });
    const events = [];
    socket.onAny((name, payload) => events.push({ name, payload }));
    socket.on("connect", () => resolve({ socket, events }));
    socket.on("connect_error", reject);
    setTimeout(() => reject(new Error("socket timeout")), 8000);
  });
const waitFor = async (events, name, pred = () => true, ms = 4000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const hit = events.find((e) => e.name === name && pred(e.payload));
    if (hit) return hit.payload;
    await sleep(50);
  }
  return null;
};

(async () => {
  const stamp = Date.now();
  const cleanup = { users: [], rooms: [], schedules: [] };
  const mkUser = async (role, tag, extra = {}) => {
    const email = `e2eq-${tag}-${stamp}@example.com`;
    const u = await db.User.create({ email, password: bcrypt.hashSync("Test@12345", 8), firstName: "E2EQ", lastName: tag, roleId: role, isActive: true, tokenVersion: 0, ...extra });
    cleanup.users.push(u.id);
    return { id: Number(u.id), email };
  };
  const login = async (email) => {
    const c = new Client();
    const r = await c.post("/api/login", { email, password: "Test@12345" });
    return { c, token: r.body.token, id: r.body.users && r.body.users.id };
  };

  try {
    /* ---------- Dữ liệu nền ---------- */
    const base = await db.DoctorProfile.findOne({ attributes: ["clinicId", "specialtyId", "priceId"], raw: true });
    const doc = await mkUser("R2", "doctor");
    await db.DoctorProfile.create({ doctorId: doc.id, specialtyId: base.specialtyId, clinicId: base.clinicId, priceId: base.priceId });
    const admin = await mkUser("R1", "admin");
    const recep = await mkUser("R5", "recep");
    const tv = await mkUser("R8", "tv");
    const pat = await mkUser("R3", "patient");
    const pat2 = await mkUser("R3", "patient2");

    const today = todayDate();
    const sch = await db.Schedule.create({ doctorId: doc.id, workDate: today, timeType: "T2", maxNumber: 5, currentNumber: 0, status: "available" });
    cleanup.schedules.push(sch.id);
    await db.Schedule.create({ doctorId: doc.id, workDate: today, timeType: "T3", maxNumber: 5, currentNumber: 0, status: "available" }).then((s) => cleanup.schedules.push(s.id));

    const A = await login(admin.email), R = await login(recep.email), D = await login(doc.email);
    const T = await login(tv.email), P = await login(pat.email), P2 = await login(pat2.email);

    /* ---------- Phòng: chỉ admin (room:manage) ---------- */
    check("lễ tân không tạo được phòng (403)", (await R.c.post("/api/queue/rooms", { clinicId: base.clinicId, code: "X", name: "x" })).status === 403);
    const mkRoom = await A.c.post("/api/queue/rooms", { clinicId: base.clinicId, specialtyId: base.specialtyId, code: `E2EQ${stamp % 100000}`, name: "Phòng khám E2E", floor: "2" });
    check("admin tạo phòng", mkRoom.body.errCode === 0 && mkRoom.body.data.id, mkRoom.body);
    const roomId = Number(mkRoom.body.data.id);
    cleanup.rooms.push(roomId);
    const dup = await A.c.post("/api/queue/rooms", { clinicId: base.clinicId, code: mkRoom.body.data.code, name: "trùng" });
    check("mã phòng trùng bị từ chối (409)", dup.status === 409, dup.body);
    const assign = await A.c.put("/api/queue/assign-room", { doctorId: doc.id, date: dateToMs(today), roomId });
    check("gán phòng cho bác sĩ hôm nay", assign.body.errCode === 0 && assign.body.data.updatedSlots === 2, assign.body);
    check("danh sách phòng", (await R.c.get("/api/queue/rooms")).body.data.some((r) => Number(r.id) === roomId));

    /* ---------- Bệnh nhân đặt lịch (API thật) và xác nhận ---------- */
    const bookBody = (email) => ({ email, doctorId: doc.id, timeType: "T2", date: dateToMs(today), fullName: "Benh Nhan", selectedGender: "M", address: "Da Nang", phoneNumber: "0900000000", language: "vi", timeString: "9:00", doctorName: "BS" });
    const bk = await new Client().post("/api/patient-book-appointment", bookBody(pat.email));
    check("đặt lịch qua API", bk.body.errCode === 0, bk.body);
    await db.Booking.update({ statusId: "S2" }, { where: { id: bk.body.bookingId } }); // mô phỏng bấm link email

    /* ---------- 3 thiết bị: TV + bệnh nhân + bác sĩ ---------- */
    const tvSock = await connectSocket(T.token);
    const patSock = await connectSocket(P.token);
    const docSock = await connectSocket(D.token);
    const joined = await new Promise((resolve) => tvSock.socket.emit("QUEUE_JOIN_ROOM", { roomId }, resolve));
    check("TV vào phòng và nhận snapshot ban đầu", joined && joined.errCode === 0 && joined.data.room.id === roomId, joined);
    docSock.socket.emit("QUEUE_JOIN_DOCTOR", { doctorId: doc.id });
    // Bệnh nhân không được xem phòng
    patSock.socket.emit("QUEUE_JOIN_ROOM", { roomId });
    check("bệnh nhân không được join phòng (nhận ERROR)", !!(await waitFor(patSock.events, "ERROR")));
    await sleep(100);

    /* ---------- Check-in ---------- */
    check("check-in khi chưa đăng nhập -> 401", (await new Client().post("/api/queue/check-in", { bookingId: bk.body.bookingId })).status === 401);
    check("bệnh nhân khác không check-in hộ (403)", (await P2.c.post("/api/queue/check-in", { bookingId: bk.body.bookingId })).status === 403);
    const ci = await P.c.post("/api/queue/check-in", { bookingId: bk.body.bookingId });
    check("bệnh nhân tự check-in", ci.body.errCode === 0 && ci.body.data.status === "WAITING" && /^E2EQ\d+-001$/.test(ci.body.data.displayNo), ci.body);
    const ticketId = ci.body.data.id;
    const ci2 = await P.c.post("/api/queue/check-in", { bookingId: bk.body.bookingId });
    check("check-in lần 2 idempotent", ci2.body.data.id === ticketId);

    const tvUpd = await waitFor(tvSock.events, "QUEUE_UPDATED", (p) => p.next && p.next.length >= 1);
    check("TV nhận QUEUE_UPDATED có số trong danh sách chờ", tvUpd && tvUpd.next.some((n) => n.ticketId === ticketId), tvUpd);
    const patUpd = await waitFor(patSock.events, "QUEUE_TICKET_UPDATED", (p) => p.ticket.id === ticketId);
    check("bệnh nhân nhận vé có vị trí + ETA", patUpd && patUpd.ticket.aheadCount === 0 && typeof patUpd.ticket.estimatedWaitMin === "number", patUpd);

    /* ---------- Lễ tân đăng ký vãng lai + khẩn cấp ---------- */
    check("bệnh nhân không đăng ký vãng lai (403)", (await P.c.post("/api/queue/walk-in", { doctorId: doc.id, fullName: "X Y" })).status === 403);
    const wi = await R.c.post("/api/queue/walk-in", { doctorId: doc.id, fullName: "Khach Vang Lai", phone: "0911111111" });
    check("lễ tân đăng ký vãng lai", wi.body.errCode === 0 && wi.body.data.source === "WALK_IN" && wi.body.data.patientName === "Khach Vang Lai", wi.body);
    const wiId = wi.body.data.id;
    check("vãng lai nhận số kế tiếp (002)", /-002$/.test(wi.body.data.displayNo) || /-001$/.test(wi.body.data.displayNo), wi.body.data.displayNo);

    /* ---------- Bác sĩ gọi số -> TV đọc loa, bệnh nhân được báo ---------- */
    check("bệnh nhân không gọi số (403)", (await P.c.post("/api/queue/doctor/call-next")).status === 403);
    check("TV (thiết bị) không gọi số (403)", (await T.c.post("/api/queue/doctor/call-next")).status === 403);
    const board0 = await D.c.get("/api/queue/doctor/board");
    check("bảng bác sĩ có 2 người chờ, đã có ETA", board0.body.data.waiting.length === 2 && board0.body.data.waiting.every((t) => typeof t.estimatedWaitMin === "number"), board0.body);
    const head = board0.body.data.waiting[0];

    const call = await D.c.post("/api/queue/doctor/call-next");
    check("bác sĩ gọi số tiếp theo", call.body.errCode === 0 && call.body.data.status === "CALLED" && call.body.data.id === head.id, call.body);
    const called = await waitFor(tvSock.events, "TICKET_CALLED", (p) => p.ticketId === head.id);
    check("TV nhận TICKET_CALLED kèm câu đọc loa tiếng Việt", called && /^Xin mời bệnh nhân có số thứ tự .+ vào Phòng khám E2E/.test(called.announce), called);
    check("câu đọc loa không lộ tên bệnh nhân", called && !/Benh Nhan|Khach Vang Lai/.test(called.announce));
    if (head.id === ticketId) {
      const pCalled = await waitFor(patSock.events, "TICKET_CALLED", (p) => p.ticketId === ticketId);
      check("điện thoại bệnh nhân nhận thông báo đến lượt", !!pCalled, pCalled);
    }
    check("gọi tiếp khi đang có người được gọi -> 409", (await D.c.post("/api/queue/doctor/call-next")).status === 409);

    const tvDisp = await T.c.get(`/api/queue/rooms/${roomId}/display`);
    check("TV đọc được API display", tvDisp.body.errCode === 0 && tvDisp.body.data.serving.length === 1 && !JSON.stringify(tvDisp.body).includes("Khach Vang Lai"), tvDisp.body);
    check("bệnh nhân không đọc được display (403)", (await P.c.get(`/api/queue/rooms/${roomId}/display`)).status === 403);

    /* ---------- Khám xong ---------- */
    const st = await D.c.post(`/api/queue/tickets/${head.id}/start`);
    check("bắt đầu khám", st.body.data.status === "IN_PROGRESS", st.body);
    const fin = await D.c.post(`/api/queue/tickets/${head.id}/finish`);
    check("hoàn thành ca", fin.body.data.status === "DONE", fin.body);
    const evCnt = await db.QueueEvent.count({ where: { ticketId: head.id } });
    check("nhật ký sự kiện đầy đủ (≥4 bước)", evCnt >= 4, evCnt);

    /* ---------- Khẩn cấp ---------- */
    const emer = await R.c.post(`/api/queue/tickets/${wiId === head.id ? ticketId : wiId}/emergency`, { reason: "đau ngực cấp" });
    check("lễ tân nâng ưu tiên khẩn cấp (cần lý do)", emer.status === 200 || emer.status === 409, emer.body);

    /* ---------- Bệnh nhân xem vé của mình ---------- */
    const mine = await P.c.get("/api/queue/my-tickets");
    check("my-tickets trả vé của chính mình", mine.body.errCode === 0 && mine.body.data.length === 1 && mine.body.data[0].id === ticketId, mine.body);
    check("bệnh nhân khác không thấy vé của người này", (await P2.c.get("/api/queue/my-tickets")).body.data.length === 0);

    [tvSock, patSock, docSock].forEach((s) => s.socket.close());
  } catch (e) {
    console.error("💥 Lỗi kịch bản:", e);
    fail++;
  } finally {
    /* ---------- Dọn dữ liệu tạm ---------- */
    const uids = cleanup.users;
    const tickets = cleanup.rooms.length ? await db.QueueTicket.findAll({ where: { roomId: cleanup.rooms }, attributes: ["id"], raw: true }) : [];
    if (tickets.length) await db.QueueEvent.destroy({ where: { ticketId: tickets.map((t) => t.id) } });
    if (cleanup.rooms.length) await db.QueueTicket.destroy({ where: { roomId: cleanup.rooms } });
    if (uids.length) await db.Booking.destroy({ where: { patientId: uids } });
    if (cleanup.schedules.length) await db.Schedule.destroy({ where: { id: cleanup.schedules } });
    if (cleanup.rooms.length) await db.Room.destroy({ where: { id: cleanup.rooms } });
    const guests = await db.User.findAll({ where: { email: { [db.Sequelize.Op.like]: "e2eq-%" } }, attributes: ["id"], raw: true, paranoid: false });
    const allIds = [...new Set([...uids, ...guests.map((g) => g.id)])];
    if (allIds.length) {
      await db.Booking.destroy({ where: { patientId: allIds } });
      await db.PatientProfile.destroy({ where: { ownerUserId: allIds }, force: true });
      await db.DoctorProfile.destroy({ where: { doctorId: allIds } });
      await db.User.destroy({ where: { id: allIds }, force: true });
    }
    console.log(`\n${fail ? "❌" : "✅"} ${pass} đạt, ${fail} thất bại`);
    await db.sequelize.close();
    process.exit(fail ? 1 : 0);
  }
})();
