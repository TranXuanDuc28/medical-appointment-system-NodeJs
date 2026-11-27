/**
 * Test thống kê & bản đồ nhiệt hàng đợi.
 *  - Phần thuần (ngưỡng màu, khoảng ngày): luôn chạy.
 *  - Phần DB (RUN_DB_TESTS=1): số liệu đúng trên dữ liệu dựng sẵn (ngày 2031-06-10/11), bản đồ nhiệt hôm nay với phòng tạm.
 *    Mọi thay đổi (phòng, vé, lịch) được dọn/khôi phục sau khi chạy.
 */
process.env.HEATMAP_YELLOW_MIN = "5";
process.env.HEATMAP_RED_MIN = "10";

const test = require("node:test");
const { after } = test;
const assert = require("node:assert/strict");

const analytics = require("../src/services/queue/queueAnalytics");

const enabled = process.env.RUN_DB_TESTS === "1";
const dbOpt = { skip: !enabled };

after(async () => {
  if (enabled) await require("../src/models/index").sequelize.close();
});

/* ------------------------------ phần thuần ------------------------------ */

test("levelOf: GREEN < yellow <= YELLOW < red <= RED; không xác định => null", () => {
  const t = { yellow: 15, red: 30 };
  assert.equal(analytics.levelOf(0, t), "GREEN");
  assert.equal(analytics.levelOf(14, t), "GREEN");
  assert.equal(analytics.levelOf(15, t), "YELLOW");
  assert.equal(analytics.levelOf(29, t), "YELLOW");
  assert.equal(analytics.levelOf(30, t), "RED");
  assert.equal(analytics.levelOf(120, t), "RED");
  assert.equal(analytics.levelOf(null, t), null);
  assert.equal(analytics.levelOf(NaN, t), null);
});

test("thresholds: lấy từ env, đỏ luôn lớn hơn vàng; giá trị sai thì dùng mặc định", () => {
  assert.deepEqual(analytics.thresholds(), { yellow: 5, red: 10 });
  const keep = [process.env.HEATMAP_YELLOW_MIN, process.env.HEATMAP_RED_MIN];
  try {
    process.env.HEATMAP_YELLOW_MIN = "abc";
    process.env.HEATMAP_RED_MIN = "-1";
    assert.deepEqual(analytics.thresholds(), { yellow: 15, red: 30 });
    process.env.HEATMAP_YELLOW_MIN = "20";
    process.env.HEATMAP_RED_MIN = "10"; // đỏ <= vàng: không hợp lệ
    assert.deepEqual(analytics.thresholds(), { yellow: 20, red: 40 });
  } finally {
    [process.env.HEATMAP_YELLOW_MIN, process.env.HEATMAP_RED_MIN] = keep;
  }
});

test("parseRange: mặc định hôm nay; nhận YYYY-MM-DD và chuỗi ms; từ chối sai/đảo ngược/quá 92 ngày", () => {
  const { todayDate } = require("../src/utils/dateKey");
  const d = analytics.parseRange();
  assert.equal(d.from, todayDate());
  assert.equal(d.to, todayDate());
  assert.equal(d.days, 1);
  assert.equal(analytics.parseRange("2031-06-10", "2031-06-12").days, 3);
  assert.equal(analytics.parseRange("2031-06-10").to, "2031-06-10");
  const ms = String(new Date("2031-06-10T00:00:00+07:00").getTime());
  assert.equal(analytics.parseRange(ms, ms).from, "2031-06-10");
  const bad = (f, t, re) => assert.throws(() => analytics.parseRange(f, t), (e) => e.code === "BAD_REQUEST" && re.test(e.message));
  bad("không-phải-ngày", undefined, /không hợp lệ/);
  bad("2031-06-12", "2031-06-10", /trước hoặc bằng/);
  bad("2031-01-01", "2031-12-31", /Tối đa/);
  assert.equal(analytics.parseRange("2031-01-01", "2031-04-02").days, analytics.MAX_RANGE_DAYS);
});

test("rate: phần trăm một chữ số thập phân, chia 0 => null", () => {
  assert.equal(analytics.rate(1, 3), 33.3);
  assert.equal(analytics.rate(0, 5), 0);
  assert.equal(analytics.rate(1, 0), null);
});

/* ------------------------------ phần DB ------------------------------ */

const setup = async () => {
  const db = require("../src/models/index");
  const queue = require("../src/services/queue/queueService");
  const { DEFAULT_ROLE_PERMISSIONS } = require("../src/config/permissions");
  const { todayDate } = require("../src/utils/dateKey");

  const profile = await db.DoctorProfile.findOne({ attributes: ["doctorId", "clinicId", "specialtyId"], raw: true, order: [["doctorId", "ASC"]] });
  assert.ok(profile, "cần ít nhất 1 bác sĩ trong DB");
  const undo = { rooms: [], schedules: [], createdSchedules: [], users: [], tickets: [] };
  const room = await db.Room.create({ clinicId: profile.clinicId, specialtyId: profile.specialtyId, code: `QA${Date.now() % 100000}`, name: "Phòng thống kê", floor: "9", isActive: true });
  undo.rooms.push(room.id);
  const staff = await db.User.create({ email: `qatest-staff-${Date.now()}@example.com`, firstName: "Q", lastName: "A", roleId: "R5", isActive: true, tokenVersion: 0 });
  undo.users.push(staff.id);
  const actor = { id: Number(staff.id), permissions: new Set(DEFAULT_ROLE_PERMISSIONS.R5) };

  const mkTicket = (seq, o) =>
    db.QueueTicket.create({
      roomId: room.id, doctorId: profile.doctorId, ticketDate: o.date, shift: o.shift || "MORNING", seq, displayNo: `QA-${String(seq).padStart(3, "0")}`,
      source: o.source || "WALK_IN", priority: o.priority || "NORMAL", status: o.status, walkInName: `Bệnh nhân ${seq}`,
      checkInAt: o.checkIn || null, startedAt: o.start || null, finishedAt: o.finish || null, callCount: 0, postponedCount: 0, sortAt: o.checkIn || new Date(),
    });
  const T = (d, hhmm) => new Date(`${d}T${hhmm}:00+07:00`);

  const cleanup = async () => {
    const t = await db.QueueTicket.findAll({ where: { roomId: undo.rooms }, attributes: ["id"], raw: true });
    if (t.length) await db.QueueEvent.destroy({ where: { ticketId: t.map((x) => x.id) } });
    await db.QueueTicket.destroy({ where: { roomId: undo.rooms } });
    if (undo.createdSchedules.length) await db.Schedule.destroy({ where: { id: undo.createdSchedules } });
    for (const s of undo.schedules) await db.Schedule.update({ roomId: s.roomId, status: s.status }, { where: { id: s.id } });
    await db.Room.destroy({ where: { id: undo.rooms } });
    await db.User.destroy({ where: { id: undo.users }, force: true });
  };
  return { db, queue, profile, room, actor, mkTicket, T, undo, today: todayDate(), cleanup };
};

test("getStats: tổng, tỉ lệ vắng, thời gian chờ/khám trung bình, theo ngày và theo bác sĩ", dbOpt, async () => {
  const s = await setup();
  try {
    const d1 = "2031-06-10", d2 = "2031-06-11";
    // Ngày 1: 3 ca DONE (chờ 10/20/30', khám 10/20/30') + 1 vắng + 1 huỷ; 1 hẹn trước, còn lại vãng lai; 1 khẩn cấp, 1 cao tuổi
    await s.mkTicket(1, { date: d1, status: "DONE", source: "BOOKED", checkIn: s.T(d1, "08:00"), start: s.T(d1, "08:10"), finish: s.T(d1, "08:20") });
    await s.mkTicket(2, { date: d1, status: "DONE", priority: "EMERGENCY", checkIn: s.T(d1, "08:00"), start: s.T(d1, "08:20"), finish: s.T(d1, "08:40") });
    await s.mkTicket(3, { date: d1, status: "DONE", priority: "ELDERLY", checkIn: s.T(d1, "08:00"), start: s.T(d1, "08:30"), finish: s.T(d1, "09:00") });
    await s.mkTicket(4, { date: d1, status: "NO_SHOW", checkIn: s.T(d1, "08:00") });
    await s.mkTicket(5, { date: d1, status: "CANCELLED", checkIn: s.T(d1, "08:00") });
    // Ngày 2: 1 ca DONE (chờ 5', khám 15')
    await s.mkTicket(1, { date: d2, status: "DONE", checkIn: s.T(d2, "09:00"), start: s.T(d2, "09:05"), finish: s.T(d2, "09:20") });

    const st = await analytics.getStats({ from: d1, to: d2, clinicId: Number(s.profile.clinicId) });
    assert.equal(st.days, 2);
    assert.equal(st.totals.total, 6);
    assert.equal(st.totals.done, 4);
    assert.equal(st.totals.noShow, 1);
    assert.equal(st.totals.cancelled, 1);
    assert.equal(st.totals.booked, 1);
    assert.equal(st.totals.walkIn, 5);
    assert.equal(st.totals.emergency, 1);
    assert.equal(st.totals.elderly, 1);
    assert.equal(st.totals.noShowRate, 20, "vắng / (khám + vắng) = 1/5");
    assert.equal(st.totals.avgWaitMin, 16.3, "(10+20+30+5)/4 = 16.25");
    assert.equal(st.totals.avgExamMin, 18.8, "(10+20+30+15)/4 = 18.75");

    assert.deepEqual(st.byDay.map((x) => x.date), [d1, d2]);
    assert.equal(st.byDay[0].total, 5);
    assert.equal(st.byDay[0].noShowRate, 25, "1/(3+1)");
    assert.equal(st.byDay[0].avgWaitMin, 20);
    assert.equal(st.byDay[1].avgExamMin, 15);

    assert.equal(st.byDoctor.length, 1);
    assert.equal(st.byDoctor[0].doctorId, Number(s.profile.doctorId));
    assert.equal(st.byDoctor[0].done, 4);

    // Lọc ngày: chỉ ngày 2
    const one = await analytics.getStats({ from: d2, to: d2, clinicId: Number(s.profile.clinicId) });
    assert.equal(one.totals.total, 1);
    assert.equal(one.totals.noShowRate, 0);
    // Khoảng không có dữ liệu: số 0 / null, không lỗi
    const empty = await analytics.getStats({ from: "2031-07-01", to: "2031-07-02", clinicId: Number(s.profile.clinicId) });
    assert.equal(empty.totals.total, 0);
    assert.equal(empty.totals.noShowRate, null);
    assert.equal(empty.totals.avgWaitMin, null);
    assert.deepEqual(empty.byDay, []);
  } finally {
    await s.cleanup();
  }
});

test("getHeatmap (ngày khác hôm nay): có số liệu phòng, không có màu", dbOpt, async () => {
  const s = await setup();
  try {
    const d = "2031-06-10";
    await s.mkTicket(1, { date: d, status: "DONE", checkIn: s.T(d, "08:00"), start: s.T(d, "08:10"), finish: s.T(d, "08:30") });
    await s.mkTicket(2, { date: d, status: "NO_SHOW", checkIn: s.T(d, "08:00") });
    const h = await analytics.getHeatmap({ date: d, clinicId: Number(s.profile.clinicId) });
    assert.equal(h.live, false);
    const room = h.rooms.find((x) => x.roomId === Number(s.room.id));
    assert.ok(room);
    assert.equal(room.level, null);
    assert.equal(room.waitMin, null);
    assert.equal(room.done, 1);
    assert.equal(room.noShow, 1);
    assert.equal(room.avgWaitMin, 10);
    assert.equal(room.avgExamMin, 20);
    assert.equal(h.summary.RED + h.summary.YELLOW + h.summary.GREEN, 0);
    await assert.rejects(analytics.getHeatmap({ date: "không-phải-ngày" }), (e) => e.code === "BAD_REQUEST");
  } finally {
    await s.cleanup();
  }
});

test("getHeatmap (hôm nay): phòng có bác sĩ trực đổi màu theo số người chờ; phòng không ai là IDLE", dbOpt, async () => {
  const s = await setup();
  try {
    const { db, queue, profile, room, actor, undo, today } = s;
    // Cho bác sĩ có lịch hôm nay ở cả hai ca, gán vào phòng tạm (khôi phục sau)
    for (const tc of ["T1", "T2", "T3", "T5", "T6"]) {
      const [row, made] = await db.Schedule.findOrCreate({
        where: { doctorId: profile.doctorId, workDate: today, timeType: tc }, defaults: { maxNumber: 5, currentNumber: 0, status: "available", roomId: room.id }, raw: false,
      });
      if (made) undo.createdSchedules.push(row.id);
      else {
        undo.schedules.push({ id: row.id, roomId: row.roomId, status: row.status });
        await row.update({ roomId: room.id, status: row.status === "closed" ? "available" : row.status });
      }
    }
    const find = (h) => h.rooms.find((x) => x.roomId === Number(room.id));
    const clinicId = Number(profile.clinicId);

    let h = await analytics.getHeatmap({ clinicId });
    assert.equal(h.live, true);
    assert.deepEqual(h.thresholds, { yellow: 5, red: 10 });
    assert.equal(find(h).level, "GREEN", "phòng trống, bác sĩ trực: xanh");
    assert.equal(find(h).waitMin, 0);
    assert.equal(find(h).waitBasis, "eta");
    assert.equal(find(h).doctors.length, 1);

    for (let i = 0; i < 4; i++) await queue.createWalkIn({ doctorId: Number(profile.doctorId), name: `Chờ ${i}`, actor });
    h = await analytics.getHeatmap({ clinicId });
    const r = find(h);
    assert.equal(r.waiting, 4);
    assert.ok(r.waitMin >= 10, `4 người chờ phải >= 10 phút, nhận ${r.waitMin}`);
    assert.equal(r.level, "RED");
    assert.ok(h.summary.RED >= 1);
    assert.equal(r.walkIn, 4);

    // Phòng khác không có bác sĩ trực và không có người: IDLE
    const idle = await db.Room.create({ clinicId: profile.clinicId, specialtyId: profile.specialtyId, code: `QI${Date.now() % 100000}`, name: "Phòng trống", isActive: true });
    undo.rooms.push(idle.id);
    h = await analytics.getHeatmap({ clinicId });
    const idleRow = h.rooms.find((x) => x.roomId === Number(idle.id));
    assert.equal(idleRow.level, "IDLE");
    assert.equal(idleRow.waitMin, null);
    assert.ok(h.summary.IDLE >= 1);
  } finally {
    await s.cleanup();
  }
});
