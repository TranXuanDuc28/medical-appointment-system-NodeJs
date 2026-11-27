/**
 * Kiểm thử đầu-cuối trên server ĐANG CHẠY với DB v2 (cần server đã khởi động).
 *   BASE=http://localhost:6996 node scripts/e2e-smoke.js
 * Tạo dữ liệu tạm (email "e2e-*") và dọn lại cuối cùng. Thoát mã 1 nếu có ca thất bại.
 */
require("dotenv").config({ quiet: true });
const bcrypt = require("bcryptjs");
const db = require("../src/models");
const { dateToMs } = require("../src/utils/dateKey");

const BASE = process.env.BASE || "http://localhost:6996";
let pass = 0;
let fail = 0;
const check = (name, cond, extra) => {
  if (cond) pass++;
  else {
    fail++;
    console.log(`❌ ${name}`, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : "");
  }
};

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
      if (v === "" || /expires=Thu, 01 Jan 1970/i.test(sc)) delete this.cookies[k];
      else this.cookies[k] = v;
    }
    let json = null;
    try { json = await res.json(); } catch (_) {}
    return { status: res.status, body: json };
  }
  get(p) { return this.req("GET", p); }
  post(p, b) { return this.req("POST", p, b || {}); }
  put(p, b) { return this.req("PUT", p, b || {}); }
}

(async () => {
  const stamp = Date.now();
  const created = { users: [], scheduleKeys: [] };
  const anon = new Client();

  /* 1. API công khai (đọc dữ liệu danh mục từ schema mới) */
  for (const [p, label] of [
    ["/api/allcode?type=TIME", "allcode TIME"],
    ["/api/allcode?type=ROLE", "allcode ROLE"],
    ["/api/get-specialty", "specialty"],
    ["/api/get-clinic", "clinic"],
    ["/api/get_all_doctor", "all doctor"],
    ["/api/top-doctor-home?limit=5&lang=vi", "top doctor"],
    ["/api/get-handbook?lang=vi", "handbook"],
    ["/api/packages/all", "packages"],
    ["/api/facilities/all", "facilities"],
    ["/api/get-medicines", "medicines (cần đăng nhập)"],
  ]) {
    const r = await anon.get(p);
    if (label.includes("cần đăng nhập")) check(`${label} ẩn danh -> 401`, r.status === 401, r.status);
    else check(`GET ${label} -> 200 errCode 0`, r.status === 200 && (r.body.errCode === 0 || r.body.errCode === undefined), r);
  }
  const time = await anon.get("/api/allcode?type=TIME");
  check("allcode TIME trả 8 khung giờ có valueVi/keyMap", time.body.data.length === 8 && time.body.data[0].keyMap === "T1" && time.body.data[0].valueVi, time.body.data && time.body.data[0]);

  const doctor = await db.User.findOne({ where: { roleId: "R2" }, attributes: ["id"], raw: true });
  const detail = await anon.get(`/api/get_detail_doctor_by_id?id=${doctor.id}&lang=vi`);
  check("chi tiết bác sĩ có Doctor_Infor + Markdown kiểu cũ", detail.body.errCode === 0 && detail.body.data && detail.body.data.Doctor_Infor && "contentHTML" in (detail.body.data.Markdown || {}), Object.keys(detail.body.data || {}));

  /* 2. Đăng ký / đăng nhập / phân quyền */
  const email = `e2e-patient-${stamp}@example.com`;
  const reg = await anon.post("/api/register", { email, password: "Pass@12345", firstName: "E2E", lastName: "Patient", phoneNumber: "0900000001" });
  check("đăng ký thành công", reg.body.errCode === 0, reg.body);
  const dup = await anon.post("/api/register", { email, password: "x", firstName: "a", lastName: "b", phoneNumber: "1" });
  check("đăng ký trùng email bị từ chối", dup.body.errCode === 1, dup.body);

  const patient = new Client();
  const bad = await patient.post("/api/login", { email, password: "sai" });
  check("sai mật khẩu -> errCode 3", bad.body.errCode === 3, bad.body);
  const login = await patient.post("/api/login", { email, password: "Pass@12345" });
  check("đăng nhập OK, có cookie jwt + refreshToken", login.body.errCode === 0 && patient.cookies.jwt && patient.cookies.refreshToken, login.body.errCode);
  check("response đăng nhập KHÔNG lộ password/tokenVersion", login.body.users && !("password" in login.body.users) && !("tokenVersion" in login.body.users), Object.keys(login.body.users || {}));
  const patientId = login.body.users.id;
  created.users.push(patientId);

  const me = await patient.get("/api/rbac/me");
  check("rbac/me của bệnh nhân có quyền booking:cancel:own", me.body.permissions && me.body.permissions.includes("booking:cancel:own") && !me.body.permissions.includes("user:delete"), me.body);
  check("bệnh nhân không gọi được API admin/bác sĩ", (await patient.get("/api/rbac/roles")).status === 403 && (await patient.get("/api/get_all_users?id=ALL")).status === 403 && (await patient.post("/api/send-remedy")).status === 403);

  /* 3. Lịch làm việc + đặt lịch + chống overbook + huỷ */
  const d = new Date(Date.now() + 700 * 24 * 3600 * 1000);
  const workDate = d.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
  await db.Schedule.create({ doctorId: doctor.id, workDate, timeType: "T2", maxNumber: 1, currentNumber: 0, status: "available" });
  created.scheduleKeys.push({ doctorId: doctor.id, workDate });
  const ms = dateToMs(workDate);

  const sch = await anon.get(`/api/get_schedule_doctor_by_date?doctorId=${doctor.id}&date=${ms}`);
  const slot = (sch.body.data || []).find((s) => s.timeType === "T2");
  check("lịch theo ngày trả đúng shape cũ (date ms, status, timeTypeData)", slot && slot.date === ms && slot.status === "available" && slot.timeTypeData && slot.timeTypeData.valueVi, slot);

  const bookingBody = { email, doctorId: doctor.id, timeType: "T2", date: ms, fullName: "E2E Patient", selectedGender: "M", address: "Da Nang", phoneNumber: "0900000001", language: "vi", timeString: "9:00 - 10:00", doctorName: "BS Test" };
  const b1 = await anon.post("/api/patient-book-appointment", bookingBody);
  check("đặt lịch thành công", b1.body.errCode === 0, b1.body);
  check("response đặt lịch KHÔNG lộ token xác nhận", b1.body && !("token" in b1.body), Object.keys(b1.body || {}));
  const b2 = await anon.post("/api/patient-book-appointment", bookingBody);
  check("cùng bệnh nhân đặt lại -> trùng lịch (5) hoặc hết chỗ (4)", [4, 5].includes(b2.body.errCode), b2.body);
  const b3 = await anon.post("/api/patient-book-appointment", { ...bookingBody, email: `e2e-other-${stamp}@example.com` });
  check("người khác đặt slot đã đầy -> hết chỗ (4)", b3.body.errCode === 4, b3.body);

  const sch2 = await anon.get(`/api/get_schedule_doctor_by_date?doctorId=${doctor.id}&date=${ms}`);
  check("slot chuyển sang booked sau khi đặt", (sch2.body.data || []).find((s) => s.timeType === "T2").status === "booked", sch2.body.data);

  const mine = await patient.get(`/api/get-patient-appointments?patientId=${patientId}`);
  check("bệnh nhân thấy lịch của mình (shape cũ: doctorName, specialty, time ms, status)", mine.body.errCode === 0 && mine.body.data.length === 1 && mine.body.data[0].time === ms && mine.body.data[0].doctorName && mine.body.data[0].status, mine.body);
  const other = await patient.get(`/api/get-patient-appointments?patientId=${patientId + 99999}`);
  check("không xem được lịch của người khác (403)", other.status === 403, other.status);
  const hist = await patient.get(`/api/get-patient-history?patientId=${patientId}`);
  check("xem hồ sơ khám của chính mình OK", hist.status === 200 && hist.body.errCode === 0, hist.body);
  check("không xem được hồ sơ khám của người khác (403)", (await patient.get(`/api/get-patient-history?patientId=${patientId + 99999}`)).status === 403);

  const bookingId = mine.body.data[0].id;
  const cancel = await patient.post("/api/cancel-appointment", { bookingId });
  check("huỷ lịch của chính mình OK", cancel.body.errCode === 0, cancel.body);
  const sch3 = await anon.get(`/api/get_schedule_doctor_by_date?doctorId=${doctor.id}&date=${ms}`);
  check("slot được nhả sau khi huỷ", (sch3.body.data || []).find((s) => s.timeType === "T2").status === "available", sch3.body.data);

  /* 4. Refresh token xoay vòng + phát hiện dùng lại */
  const oldRefresh = patient.cookies.refreshToken;
  const rf = await patient.post("/api/refresh-token");
  check("refresh thành công và cấp refresh token mới", rf.body.errCode === 0 && patient.cookies.refreshToken && patient.cookies.refreshToken !== oldRefresh, rf.body);
  const replay = new Client();
  replay.cookies.refreshToken = oldRefresh;
  const rp = await replay.post("/api/refresh-token");
  check("dùng lại refresh token cũ bị từ chối (401)", rp.status === 401, rp);
  const rf2 = await patient.post("/api/refresh-token");
  check("sau khi phát hiện reuse, mọi phiên của user bị thu hồi", rf2.status === 401, rf2);

  /* 5. Admin: RBAC, audit, chống tự khoá */
  const adminEmail = `e2e-admin-${stamp}@example.com`;
  const admin = await db.User.create({ email: adminEmail, password: bcrypt.hashSync("Admin@12345", 8), firstName: "E2E", lastName: "Admin", roleId: "R1", isActive: true, tokenVersion: 0 });
  created.users.push(admin.id);
  const adm = new Client();
  const al = await adm.post("/api/login", { email: adminEmail, password: "Admin@12345" });
  check("admin đăng nhập OK", al.body.errCode === 0, al.body);
  const roles = await adm.get("/api/rbac/roles");
  check("admin xem được 8 vai trò mặc định", roles.body.roles && roles.body.roles.length >= 8, roles.body);
  const lock = await adm.put("/api/rbac/roles/R1/permissions", { permissions: ["booking:read:own"] });
  check("không gỡ được quyền bắt buộc của ADMIN (400)", lock.status === 400, lock.body);
  const selfRole = await adm.put(`/api/rbac/users/${admin.id}/role`, { roleId: "R3" });
  check("admin không tự đổi vai trò (400)", selfRole.status === 400, selfRole.body);
  const all = await adm.get("/api/get_all_users?id=ALL");
  check("get_all_users không lộ password", all.body.errCode === 0 && all.body.users.length > 0 && all.body.users.every((u) => !("password" in u)), all.body.users && Object.keys(all.body.users[0]));
  const audit = await adm.get("/api/rbac/audit-logs?limit=5");
  check("audit log ghi nhận (LOGIN / RECORD_READ...)", audit.body.items && audit.body.items.length > 0, audit.body);
  const list = await adm.get(`/api/get-list-patient-for-doctor?doctorId=${doctor.id}&date=ALL&lang=vi&roleId=R2`);
  check("admin xem danh sách bệnh nhân theo bác sĩ (200)", list.status === 200 && list.body.errCode === 0, list.body && list.body.errMessage);
  // Khoá tài khoản => token đang dùng bị vô hiệu ngay
  const victim = await db.User.create({ email: `e2e-victim-${stamp}@example.com`, password: bcrypt.hashSync("V@12345678", 8), firstName: "V", lastName: "V", roleId: "R3", isActive: true, tokenVersion: 0 });
  created.users.push(victim.id);
  const vc = new Client();
  await vc.post("/api/login", { email: victim.email, password: "V@12345678" });
  check("nạn nhân đang đăng nhập hợp lệ", (await vc.get("/api/rbac/me")).status === 200);
  const deact = await adm.put(`/api/rbac/users/${victim.id}/active`, { isActive: false });
  check("admin khoá tài khoản", deact.body.errCode === 0, deact.body);
  check("token của tài khoản bị khoá bị từ chối ngay (401)", (await vc.get("/api/rbac/me")).status === 401);
  const relogin = await new Client().post("/api/login", { email: victim.email, password: "V@12345678" });
  check("tài khoản bị khoá không đăng nhập lại được", relogin.body.errCode === 5, relogin.body);

  /* 6. Nội dung do admin quản trị (ghi vào bảng bản dịch) */
  const hbTitle = `E2E handbook ${stamp}`;
  const createHb = await adm.post("/api/create-new-handbook", { title: hbTitle, lang: "vi", action: "CREATE", published: "2026-11-12", updated: "2026-11-12", category: "Cẩm nang", contentHTML: "<p>x</p>", contentMarkdown: "x", description: "d", authors: ["E2E"], reviewers: ["R"], image: "data:image/png;base64,AAAA", imageBase64: "data:image/png;base64,AAAA" });
  check("admin tạo cẩm nang", createHb.status === 200 && createHb.body.errCode === 0, createHb.body);
  check("bệnh nhân (token đã bị thu hồi) không tạo được cẩm nang", [401, 403].includes((await patient.post("/api/create-new-handbook", {})).status));

  /* 7. Webhook */
  const hook = await anon.post("/api/payos/webhook", { code: "00", success: true, data: { orderCode: 99999, description: "BOOKING1", amount: 1 }, signature: "fake" });
  check("webhook PayOS chữ ký giả bị từ chối (401)", hook.status === 401, hook);
  const casso = await anon.post("/api/casso/webhook", { data: [] });
  check("webhook Casso thiếu token bị từ chối (401)", casso.status === 401, casso.status);

  /* Dọn dữ liệu tạm */
  const uids = created.users;
  await db.Booking.destroy({ where: { patientId: uids } });
  const others = await db.User.findAll({ where: { email: { [db.Sequelize.Op.like]: "e2e-%" } }, attributes: ["id"], raw: true, paranoid: false });
  const allIds = [...new Set([...uids, ...others.map((u) => u.id)])];
  await db.Booking.destroy({ where: { patientId: allIds } });
  await db.PatientProfile.destroy({ where: { ownerUserId: allIds }, force: true });
  for (const k of created.scheduleKeys) await db.Schedule.destroy({ where: k });
  const hb = await db.HandBook_Translation.findAll({ where: { title: hbTitle }, attributes: ["handbookId"], raw: true });
  for (const h of hb) {
    await db.HandBook_Translation.destroy({ where: { handbookId: h.handbookId } });
    await db.HandBook.destroy({ where: { id: h.handbookId } });
  }
  await db.User.destroy({ where: { id: allIds }, force: true });

  console.log(`\n${fail ? "❌" : "✅"} ${pass} đạt, ${fail} thất bại`);
  await db.sequelize.close();
  process.exit(fail ? 1 : 0);
})().catch(async (e) => {
  console.error("💥 Lỗi kịch bản:", e);
  process.exit(2);
});
