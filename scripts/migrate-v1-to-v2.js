/**
 * Chuyển DỮ LIỆU DANH MỤC từ DB cũ (v1) sang schema chuẩn (v2).
 *
 *   node scripts/migrate-v1-to-v2.js            # chạy thật (chỉ ghi vào DB v2)
 *   node scripts/migrate-v1-to-v2.js --dry-run  # chạy trong transaction rồi ROLLBACK, chỉ in báo cáo
 *
 * - ĐỌC từ V1_DB_NAME (mặc định "webhealthcare"), GHI vào V2_DB_NAME (mặc định "webhealthcare_v2").
 * - DB v2 phải đã chạy migration baseline + seeder reference_codes.
 * - Chỉ chuyển: tài khoản, chuyên khoa, phòng khám, cẩm nang, bác sĩ (hồ sơ + nội dung),
 *   lịch làm việc, thuốc, cơ sở y tế, gói khám, bộ câu hỏi khảo sát.
 * - KHÔNG chuyển (dữ liệu vận hành/thử nghiệm): bookings, histories, cashiers, messages,
 *   health_assessments, các bảng group/role cũ.
 */
require("dotenv").config({ quiet: true });
const crypto = require("crypto");
const mysql = require("mysql2/promise");

const V1 = process.env.V1_DB_NAME || "webhealthcare";
const V2 = process.env.V2_DB_NAME || "webhealthcare_v2";
const DRY = process.argv.includes("--dry-run");
const conf = (database) => ({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database,
  dateStrings: true,
  multipleStatements: false,
});

const warnings = [];
const warn = (m) => warnings.push(m);
const report = {};

const toLocalDate = (ms) =>
  new Date(Number(ms)).toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }); // YYYY-MM-DD
const jsonOrNull = (v, label) => {
  if (v === null || v === undefined || v === "") return null;
  try {
    JSON.parse(v);
    return v;
  } catch (e) {
    warn(`JSON không hợp lệ ở ${label} -> bọc thành chuỗi JSON`);
    return JSON.stringify([String(v)]);
  }
};
const num = (v, d = 0) => (v === null || v === undefined || v === "" || isNaN(Number(v)) ? d : Number(v));
const lang2 = (l) => (String(l || "vi").toLowerCase().startsWith("en") ? "en" : "vi");

async function insert(db, table, rows, chunk = 200) {
  if (!rows.length) return 0;
  const cols = Object.keys(rows[0]);
  for (let i = 0; i < rows.length; i += chunk) {
    const part = rows.slice(i, i + chunk);
    const sql = `INSERT INTO \`${table}\` (${cols.map((c) => `\`${c}\``).join(",")}) VALUES ${part
      .map(() => `(${cols.map(() => "?").join(",")})`)
      .join(",")}`;
    await db.query(sql, part.flatMap((r) => cols.map((c) => r[c])));
  }
  report[table] = (report[table] || 0) + rows.length;
  return rows.length;
}

(async () => {
  const old = await mysql.createConnection(conf(V1));
  const neu = await mysql.createConnection(conf(V2));
  const q1 = async (sql) => (await old.query(sql))[0];
  const q2 = async (sql, p) => (await neu.query(sql, p))[0];

  // Danh mục hợp lệ trong v2
  const refCodes = new Set((await q2("SELECT code FROM reference_codes")).map((r) => r.code));
  const roles = new Set((await q2("SELECT code FROM rbac_roles")).map((r) => r.code));
  const refOrNull = (c) => (c && refCodes.has(c) ? c : null);

  await neu.query("SET FOREIGN_KEY_CHECKS = 1");
  await neu.beginTransaction();
  try {
    /* ---------- users + device_tokens ---------- */
    const users = await q1("SELECT * FROM users ORDER BY id");
    const seenEmail = new Map();
    const userRows = [];
    const keptUserIds = new Set();
    for (const u of users) {
      const email = String(u.email || "").trim().toLowerCase();
      if (!email) { warn(`Bỏ user ${u.id}: thiếu email`); continue; }
      if (seenEmail.has(email)) {
        warn(`Bỏ user ${u.id} (${email}): trùng email với user ${seenEmail.get(email)}`);
        continue;
      }
      seenEmail.set(email, u.id);
      keptUserIds.add(u.id);
      let role = u.roleId;
      if (!roles.has(role)) { warn(`User ${u.id}: vai trò "${role}" không hợp lệ -> R3`); role = "R3"; }
      userRows.push({
        id: u.id, email, password: u.password || null,
        first_name: u.firstName || "", last_name: u.lastName || "",
        phone_number: u.phoneNumber || null, address: u.address || null,
        gender_code: refOrNull(u.gender), position_code: refOrNull(u.positionId), role_code: role,
        image: u.image || null, is_active: 1, token_version: 0,
        created_at: u.createdAt, updated_at: u.updatedAt,
      });
    }
    await insert(neu, "users", userRows);
    const tokens = users.filter((u) => keptUserIds.has(u.id) && u.fcmToken).map((u) => ({
      user_id: u.id, token: u.fcmToken,
      token_hash: crypto.createHash("sha256").update(u.fcmToken).digest("hex"), platform: "web",
    }));
    await insert(neu, "device_tokens", tokens);

    /* ---------- specialties ---------- */
    const md = await q1("SELECT * FROM markdowns");
    const mdBy = (key, id, lang) => md.find((m) => m[key] !== null && String(m[key]) === String(id) && lang2(m.lang) === lang && (key !== "specialtyId" && key !== "clinicId" && key !== "handbookId" ? true : !m.doctorId));
    const spec = await q1("SELECT * FROM specialties ORDER BY id");
    await insert(neu, "specialties", spec.map((s) => ({ id: s.id, image: s.image || null, sort_order: 0, is_active: 1, created_at: s.createdAt, updated_at: s.updatedAt })));
    const specT = await q1("SELECT * FROM specialty_translations");
    const specTr = [];
    for (const t of specT) {
      const m = mdBy("specialtyId", t.specialtyId, lang2(t.lang));
      specTr.push({
        specialty_id: t.specialtyId, lang: lang2(t.lang), name: String(t.name || "").trim() || `Chuyên khoa ${t.specialtyId}`,
        description: m ? m.description : null, content_markdown: m ? m.contentMarkdown : null, content_html: m ? m.contentHTML : null,
      });
    }
    for (const s of spec) if (!specTr.some((t) => t.specialty_id === s.id)) warn(`Chuyên khoa ${s.id} không có bản dịch`);
    await insert(neu, "specialty_translations", specTr);

    /* ---------- clinics ---------- */
    const clin = await q1("SELECT * FROM clinics ORDER BY id");
    await insert(neu, "clinics", clin.map((c) => ({ id: c.id, image: c.image || null, is_active: 1, created_at: c.createdAt, updated_at: c.updatedAt })));
    const clinT = await q1("SELECT * FROM clinic_translations");
    await insert(neu, "clinic_translations", clinT.map((t) => {
      const m = mdBy("clinicId", t.clinicId, lang2(t.lang));
      return {
        clinic_id: t.clinicId, lang: lang2(t.lang), name: String(t.name || "").trim() || `Phòng khám ${t.clinicId}`, address: t.address || null,
        description: m ? m.description : null, content_markdown: m ? m.contentMarkdown : null, content_html: m ? m.contentHTML : null,
      };
    }));

    /* ---------- handbooks ---------- */
    const hb = await q1("SELECT * FROM handbooks ORDER BY id");
    await insert(neu, "handbooks", hb.map((h) => ({
      id: h.id, image: h.image || null, category: h.category || null,
      authors: jsonOrNull(h.authors, `handbooks.authors#${h.id}`), reviewers: jsonOrNull(h.reviewers, `handbooks.reviewers#${h.id}`),
      published_on: h.published || null, last_reviewed_on: h.updated || null, views: num(h.views),
      created_at: h.createdAt, updated_at: h.updatedAt,
    })));
    const hbT = await q1("SELECT * FROM handbook_translations");
    await insert(neu, "handbook_translations", hbT.map((t) => {
      const m = mdBy("handbookId", t.handbookId, lang2(t.lang));
      return {
        handbook_id: t.handbookId, lang: lang2(t.lang), title: String(t.title || "").trim() || `Cẩm nang ${t.handbookId}`,
        description: m ? m.description : null, content_markdown: m ? m.contentMarkdown : null, content_html: m ? m.contentHTML : null,
      };
    }));

    /* ---------- doctor_profiles (+ translations, nội dung giới thiệu) ---------- */
    const infos = await q1("SELECT * FROM doctor_infor ORDER BY doctorId, id");
    const specIds = new Set(spec.map((s) => s.id));
    const clinIds = new Set(clin.map((c) => c.id));
    const byDoctor = new Map();
    for (const i of infos) (byDoctor.get(i.doctorId) || byDoctor.set(i.doctorId, []).get(i.doctorId)).push(i);
    const profileRows = [];
    const dptRows = [];
    for (const [doctorId, rows] of byDoctor) {
      const base = rows.find((r) => lang2(r.lang) === "vi") || rows[0];
      if (!keptUserIds.has(doctorId)) { warn(`doctor_infor: bác sĩ ${doctorId} không có tài khoản -> bỏ`); continue; }
      if (!specIds.has(base.specialtyId) || !clinIds.has(base.clinicId) || !refCodes.has(base.priceId)) {
        warn(`doctor_infor: bác sĩ ${doctorId} thiếu chuyên khoa/phòng khám/mức giá hợp lệ -> bỏ`);
        continue;
      }
      profileRows.push({
        doctor_id: doctorId, specialty_id: base.specialtyId, clinic_id: base.clinicId, price_code: base.priceId,
        province_code: refOrNull(base.provinceId), payment_code: refOrNull(base.paymentId),
        booking_count: num(base.count),
      });
      const langs = new Set(rows.map((r) => lang2(r.lang)));
      md.filter((m) => String(m.doctorId) === String(doctorId)).forEach((m) => langs.add(lang2(m.lang)));
      for (const l of langs) {
        const r = rows.find((x) => lang2(x.lang) === l);
        const m = md.find((x) => String(x.doctorId) === String(doctorId) && lang2(x.lang) === l);
        dptRows.push({
          doctor_id: doctorId, lang: l,
          clinic_name: r ? r.nameClinic : null, clinic_address: r ? r.addressClinic : null, note: r ? r.note : null,
          description: m ? m.description : null, content_markdown: m ? m.contentMarkdown : null, content_html: m ? m.contentHTML : null,
        });
      }
    }
    for (const u of users) if (u.roleId === "R2" && keptUserIds.has(u.id) && !byDoctor.has(u.id)) warn(`Bác sĩ ${u.id} (${u.email}) chưa có hồ sơ chuyên môn trong v1`);
    await insert(neu, "doctor_profiles", profileRows);
    await insert(neu, "doctor_profile_translations", dptRows);

    /* ---------- schedules ---------- */
    const sch = await q1("SELECT * FROM schedules ORDER BY id");
    const seenSlot = new Set();
    const schRows = [];
    for (const s of sch) {
      const key = `${s.doctorId}|${toLocalDate(s.date)}|${s.timeType}`;
      if (!keptUserIds.has(s.doctorId) || !refCodes.has(s.timeType) || !/^\d+$/.test(String(s.date))) { warn(`Bỏ lịch ${s.id}: dữ liệu không hợp lệ`); continue; }
      if (seenSlot.has(key)) { warn(`Bỏ lịch ${s.id}: trùng khung giờ ${key}`); continue; }
      seenSlot.add(key);
      schRows.push({
        doctor_id: s.doctorId, work_date: toLocalDate(s.date), time_code: s.timeType,
        max_patients: Math.max(1, num(s.maxNumber, 1)), current_patients: 0, status: "available",
        created_at: s.createdAt, updated_at: s.updatedAt,
      });
    }
    await insert(neu, "schedules", schRows);

    /* ---------- medicines ---------- */
    const med = await q1("SELECT * FROM medicines ORDER BY id");
    const seenMed = new Set();
    await insert(neu, "medicines", med.filter((m) => {
      const k = String(m.name).trim().toLowerCase();
      if (seenMed.has(k)) { warn(`Thuốc trùng tên "${m.name}" -> bỏ bản ${m.id}`); return false; }
      seenMed.add(k); return true;
    }).map((m) => ({ id: m.id, name: String(m.name).trim(), unit: m.unit || null, description: m.description || null, price: num(m.price), created_at: m.createdAt, updated_at: m.updatedAt })));

    /* ---------- facilities + packages ---------- */
    const fac = await q1("SELECT * FROM facilities ORDER BY id");
    await insert(neu, "facilities", fac.map((f) => ({
      id: f.id, name: f.name, description: f.description, logo: f.logo, address: f.address, phone: f.phone, email: f.email, website: f.website,
      type: f.type, level: f.level, is_active: f.isActive ? 1 : 0, is_featured: f.isFeatured ? 1 : 0,
      rating: Math.min(5, Math.max(0, num(f.rating))), total_reviews: num(f.totalReviews),
      working_hours: jsonOrNull(f.workingHours, `facilities.workingHours#${f.id}`), services: jsonOrNull(f.services, `facilities.services#${f.id}`),
      specialties: jsonOrNull(f.specialties, `facilities.specialties#${f.id}`), images: jsonOrNull(f.images, `facilities.images#${f.id}`),
      location: jsonOrNull(f.location, `facilities.location#${f.id}`), created_at: f.createdAt, updated_at: f.updatedAt,
    })));
    const facIds = new Set(fac.map((f) => f.id));
    const pk = await q1("SELECT * FROM packages ORDER BY id");
    await insert(neu, "packages", pk.filter((p) => {
      if (!facIds.has(p.facilityId)) { warn(`Gói khám ${p.id}: cơ sở ${p.facilityId} không tồn tại -> bỏ`); return false; }
      return true;
    }).map((p) => ({
      id: p.id, facility_id: p.facilityId, specialty_id: specIds.has(p.specialtyId) ? p.specialtyId : null,
      name: p.name, description: p.description, price: num(p.price), image: p.image, category: p.category,
      gender: ["male", "female", "both"].includes(p.gender) ? p.gender : "both", age_range: p.ageRange, duration: p.duration === null ? null : num(p.duration),
      is_active: p.isActive ? 1 : 0, is_featured: p.isFeatured ? 1 : 0,
      included_services: jsonOrNull(p.includedServices, `packages.included#${p.id}`), excluded_services: jsonOrNull(p.excludedServices, `packages.excluded#${p.id}`),
      requirements: p.requirements, notes: p.notes, created_at: p.createdAt, updated_at: p.updatedAt,
    })));

    /* ---------- khảo sát sức khoẻ ---------- */
    const cats = await q1("SELECT * FROM category_questions ORDER BY id");
    await insert(neu, "category_questions", cats.map((c) => ({ id: c.id, title: c.title, description: c.description, is_active: c.is_active ? 1 : 0, created_at: c.created_at, updated_at: c.updated_at })));
    const catIds = new Set(cats.map((c) => c.id));
    const qs = (await q1("SELECT * FROM questions ORDER BY id")).filter((x) => catIds.has(x.category_question_id));
    await insert(neu, "questions", qs.map((x, i) => ({ id: x.id, category_question_id: x.category_question_id, question_text: x.question_text, sort_order: i + 1, is_active: x.is_active ? 1 : 0, created_at: x.created_at, updated_at: x.updated_at })));
    const qIds = new Set(qs.map((x) => x.id));
    const opts = (await q1("SELECT * FROM question_options ORDER BY id")).filter((o) => qIds.has(o.question_id));
    await insert(neu, "question_options", opts.map((o, i) => ({ id: o.id, question_id: o.question_id, option_text: o.option_text, score: num(o.score), sort_order: i + 1, created_at: o.created_at, updated_at: o.updated_at })));

    if (DRY) { await neu.rollback(); console.log("↩️  --dry-run: đã ROLLBACK, không ghi gì vào DB v2"); }
    else {
      await neu.commit();
      // DDL gây commit ngầm trong MySQL nên PHẢI đặt AUTO_INCREMENT sau khi commit (và không chạy khi dry-run)
      for (const t of ["users", "specialties", "clinics", "handbooks", "medicines", "facilities", "packages", "category_questions", "questions", "question_options"]) {
        const [[{ n }]] = await neu.query(`SELECT COALESCE(MAX(id),0)+1 AS n FROM \`${t}\``);
        await neu.query(`ALTER TABLE \`${t}\` AUTO_INCREMENT = ${n}`);
      }
      console.log(`✅ Đã ghi vào ${V2}`);
    }
  } catch (e) {
    await neu.rollback();
    console.error("❌ Lỗi, đã ROLLBACK:", e.message);
    process.exitCode = 1;
  }

  console.log("\n=== BÁO CÁO ===");
  console.table(report);
  if (warnings.length) { console.log(`\n⚠️  ${warnings.length} cảnh báo:`); warnings.forEach((w) => console.log(" -", w)); }
  await old.end();
  await neu.end();
})();
