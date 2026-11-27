/**
 * THỐNG KÊ & BẢN ĐỒ NHIỆT PHÒNG KHÁM cho Admin / Điều phối viên.
 *
 *  - getHeatmap: tình trạng từng phòng HÔM NAY theo thời gian thực (xanh/vàng/đỏ theo thời gian chờ dự kiến của người mới).
 *  - getStats:   thống kê theo khoảng ngày (khối lượng, tỉ lệ vắng mặt, thời gian chờ/khám trung bình, theo ngày và theo bác sĩ).
 *
 * Thời gian chờ thực tế = từ lúc vào hàng (check_in_at) đến lúc bắt đầu khám (started_at).
 * Thời gian khám thực tế = started_at -> finished_at (bỏ ca bấm nhầm < 1 giây), khớp với cách ML đo.
 */
const db = require("../../models/index");
const { todayDate, msToDate } = require("../../utils/dateKey");
const { QueueError, CONFIG } = require("./queueRules");

const MAX_RANGE_DAYS = 92;

/** Ngưỡng màu theo phút chờ dự kiến của người mới (cấu hình bằng env). */
const thresholds = () => {
  const yellow = Number(process.env.HEATMAP_YELLOW_MIN) > 0 ? Number(process.env.HEATMAP_YELLOW_MIN) : 15;
  const red = Number(process.env.HEATMAP_RED_MIN) > yellow ? Number(process.env.HEATMAP_RED_MIN) : Math.max(30, yellow * 2);
  return { yellow, red };
};

/** GREEN < yellow <= YELLOW < red <= RED. waitMin không xác định => null. */
const levelOf = (waitMin, t = thresholds()) => {
  if (!Number.isFinite(waitMin)) return null;
  if (waitMin >= t.red) return "RED";
  if (waitMin >= t.yellow) return "YELLOW";
  return "GREEN";
};

const round1 = (v) => (v === null || v === undefined || Number.isNaN(Number(v)) ? null : Math.round(Number(v) * 10) / 10);
const num = (v) => Number(v) || 0;
const rate = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null); // % một chữ số thập phân

const Q = db.Sequelize.QueryTypes.SELECT;
const query = (sql, replacements) => db.sequelize.query(sql, { replacements, type: Q });

const WAIT_AVG = `AVG(CASE WHEN started_at IS NOT NULL AND check_in_at IS NOT NULL THEN TIMESTAMPDIFF(SECOND, check_in_at, started_at) END) / 60`;
const EXAM_AVG = `AVG(CASE WHEN status = 'DONE' AND started_at IS NOT NULL AND finished_at IS NOT NULL AND TIMESTAMPDIFF(SECOND, started_at, finished_at) >= 1
                       THEN TIMESTAMPDIFF(SECOND, started_at, finished_at) END) / 60`;

/** Chuẩn hoá khoảng ngày; nhận "YYYY-MM-DD" hoặc chuỗi ms kiểu cũ. */
const parseRange = (from, to) => {
  const today = todayDate();
  const f = msToDate(from) || (from ? null : today);
  const t = msToDate(to) || (to ? null : f || today);
  if (!f || !t) throw new QueueError("BAD_REQUEST", "Ngày không hợp lệ (dùng YYYY-MM-DD)", 400);
  if (f > t) throw new QueueError("BAD_REQUEST", "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc", 400);
  const days = Math.round((new Date(`${t}T00:00:00Z`) - new Date(`${f}T00:00:00Z`)) / 86400000) + 1;
  if (days > MAX_RANGE_DAYS) throw new QueueError("BAD_REQUEST", `Tối đa ${MAX_RANGE_DAYS} ngày mỗi lần`, 400);
  return { from: f, to: t, days };
};

/**
 * Bản đồ nhiệt các phòng đang hoạt động trong ngày.
 * Hôm nay: kèm thời gian chờ dự kiến của người mới + màu. Ngày khác: chỉ số liệu đã diễn ra (không có màu).
 * @returns {{date, live, thresholds, summary, rooms[]}}
 */
const getHeatmap = async ({ date, clinicId } = {}) => {
  const day = date ? msToDate(date) : todayDate();
  if (!day) throw new QueueError("BAD_REQUEST", "Ngày không hợp lệ (dùng YYYY-MM-DD)", 400);
  const live = day === todayDate();
  const th = thresholds();

  const rooms = await query(
    `SELECT r.id, r.code, r.name, r.floor, r.clinic_id AS clinicId, r.specialty_id AS specialtyId
       FROM rooms r WHERE r.is_active = 1 ${clinicId ? "AND r.clinic_id = ?" : ""} ORDER BY r.floor, r.code`,
    clinicId ? [clinicId] : []
  );
  if (!rooms.length) return { date: day, live, thresholds: th, summary: { GREEN: 0, YELLOW: 0, RED: 0, IDLE: 0 }, rooms: [] };

  const ids = rooms.map((r) => r.id);
  const agg = await query(
    `SELECT room_id AS roomId,
            COUNT(*) AS total,
            SUM(status = 'WAITING') AS waiting,
            SUM(status IN ('CALLED','IN_PROGRESS')) AS inService,
            SUM(status = 'DONE') AS done,
            SUM(status = 'NO_SHOW') AS noShow,
            SUM(status = 'CANCELLED') AS cancelled,
            SUM(source = 'WALK_IN') AS walkIn,
            SUM(priority = 'EMERGENCY') AS emergency,
            ${WAIT_AVG} AS avgWaitMin,
            ${EXAM_AVG} AS avgExamMin
       FROM queue_tickets WHERE ticket_date = ? AND room_id IN (?) GROUP BY room_id`,
    [day, ids]
  );
  const byRoom = new Map(agg.map((a) => [Number(a.roomId), a]));

  // Bác sĩ đang trực + thời gian chờ dự kiến cho người mới (chỉ hôm nay)
  const onDuty = new Map(); // roomId -> [candidate]
  if (live) {
    const queue = require("./queueService");
    const candidates = await queue.loadWalkInCandidates({ clinicId: clinicId || undefined });
    for (const c of candidates) {
      const k = Number(c.room.id);
      if (!onDuty.has(k)) onDuty.set(k, []);
      onDuty.get(k).push(c);
    }
  }

  const summary = { GREEN: 0, YELLOW: 0, RED: 0, IDLE: 0 };
  const out = rooms.map((r) => {
    const a = byRoom.get(Number(r.id)) || {};
    const waiting = num(a.waiting);
    const inService = num(a.inService);
    const doctors = onDuty.get(Number(r.id)) || [];

    let waitMin = null;
    let basis = null;
    if (live) {
      if (doctors.length) {
        waitMin = Math.min(...doctors.map((d) => d.waitMin)); // người mới sẽ vào bác sĩ chờ ngắn nhất trong phòng
        basis = "eta";
      } else if (waiting + inService > 0) {
        waitMin = waiting * CONFIG.DEFAULT_DURATION_MIN; // còn người chờ nhưng chưa có bác sĩ trực: ước tính thô
        basis = "estimate";
      }
    }
    const level = live ? (waitMin === null ? "IDLE" : levelOf(waitMin, th)) : null;
    if (level) summary[level] += 1;

    return {
      roomId: Number(r.id), code: r.code, name: r.name, floor: r.floor, clinicId: Number(r.clinicId), specialtyId: r.specialtyId ? Number(r.specialtyId) : null,
      level, waitMin, waitBasis: basis,
      doctors: doctors.map((d) => ({ doctorId: d.doctorId, name: d.doctorName, waitMin: d.waitMin, waiting: d.waitingCount })),
      waiting, inService, done: num(a.done), noShow: num(a.noShow), cancelled: num(a.cancelled), total: num(a.total),
      walkIn: num(a.walkIn), emergency: num(a.emergency),
      avgWaitMin: round1(a.avgWaitMin), avgExamMin: round1(a.avgExamMin),
    };
  });
  return { date: day, live, thresholds: th, summary, rooms: out, generatedAt: new Date() };
};

/**
 * Thống kê theo khoảng ngày (tối đa 92 ngày).
 * noShowRate = vắng / (đã khám + vắng): chỉ tính các ca đã có kết cục.
 */
const getStats = async ({ from, to, clinicId } = {}) => {
  const range = parseRange(from, to);
  const joinClinic = clinicId ? "JOIN rooms r ON r.id = t.room_id AND r.clinic_id = ?" : "";
  const params = (extra = []) => [...(clinicId ? [clinicId] : []), range.from, range.to, ...extra];
  const base = `FROM queue_tickets t ${joinClinic} WHERE t.ticket_date BETWEEN ? AND ?`;
  const cols = (p = "t.") => `
      COUNT(*) AS total,
      SUM(${p}status = 'DONE') AS done,
      SUM(${p}status = 'NO_SHOW') AS noShow,
      SUM(${p}status = 'CANCELLED') AS cancelled,
      SUM(${p}source = 'BOOKED') AS booked,
      SUM(${p}source = 'WALK_IN') AS walkIn,
      SUM(${p}priority = 'EMERGENCY') AS emergency,
      SUM(${p}priority = 'ELDERLY') AS elderly,
      ${WAIT_AVG.replace(/\b(started_at|check_in_at)\b/g, p + "$1")} AS avgWaitMin,
      ${EXAM_AVG.replace(/\b(status|started_at|finished_at)\b/g, p + "$1")} AS avgExamMin`;

  const [totals] = await query(`SELECT ${cols()} ${base}`, params());
  const byDay = await query(`SELECT DATE_FORMAT(t.ticket_date, '%Y-%m-%d') AS date, ${cols()} ${base} GROUP BY t.ticket_date ORDER BY t.ticket_date`, params());
  const byDoctor = await query(
    `SELECT t.doctor_id AS doctorId, ${cols()} ${base} GROUP BY t.doctor_id ORDER BY done DESC, total DESC LIMIT 50`,
    params()
  );
  const names = byDoctor.length
    ? await query("SELECT id, first_name AS firstName, last_name AS lastName FROM users WHERE id IN (?)", [byDoctor.map((d) => d.doctorId)])
    : [];
  const nameOf = new Map(names.map((u) => [Number(u.id), `${u.firstName || ""} ${u.lastName || ""}`.trim()]));

  const shape = (r) => ({
    total: num(r.total), done: num(r.done), noShow: num(r.noShow), cancelled: num(r.cancelled),
    booked: num(r.booked), walkIn: num(r.walkIn), emergency: num(r.emergency), elderly: num(r.elderly),
    noShowRate: rate(num(r.noShow), num(r.done) + num(r.noShow)),
    avgWaitMin: round1(r.avgWaitMin), avgExamMin: round1(r.avgExamMin),
  });
  return {
    from: range.from, to: range.to, days: range.days,
    totals: shape(totals || {}),
    byDay: byDay.map((r) => ({ date: r.date, ...shape(r) })),
    byDoctor: byDoctor.map((r) => ({ doctorId: Number(r.doctorId), name: nameOf.get(Number(r.doctorId)) || null, ...shape(r) })),
  };
};

module.exports = { getHeatmap, getStats, levelOf, thresholds, parseRange, rate, MAX_RANGE_DAYS };
