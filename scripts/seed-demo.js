/**
 * Seed DỮ LIỆU DEMO (idempotent: chạy lại nhiều lần không nhân đôi, và tự làm mới lịch từ hôm nay).
 *   node scripts/seed-demo.js
 * Tạo: 1 phòng khám, 3 chuyên khoa + phòng, 3 bác sĩ, mỗi vai trò 1 tài khoản (admin, lễ tân, điều phối viên,
 * thu ngân, y tá, màn hình TV), 2 bệnh nhân, lịch khám 7 ngày tới (T1–T8) và 2 lịch hẹn đã xác nhận hôm nay
 * (để thử check-in ngay). Mật khẩu chung: DEMO_PASSWORD (mặc định Demo@12345).
 * CHỈ dùng cho demo/dev. Không chạy trên dữ liệu thật.
 */
require("dotenv").config({ quiet: true });
const bcrypt = require("bcryptjs");
const db = require("../src/models");
const { todayDate } = require("../src/utils/dateKey");

const PASSWORD = process.env.DEMO_PASSWORD || "Demo@12345";
const hash = bcrypt.hashSync(PASSWORD, 10);

const ACCOUNTS = [
  { email: "admin@demo.local", role: "R1", first: "Quản trị", last: "Hệ thống" },
  { email: "letan@demo.local", role: "R5", first: "Lễ tân", last: "Demo" },
  { email: "dieuphoi@demo.local", role: "R7", first: "Điều phối", last: "Demo" },
  { email: "thungan@demo.local", role: "R4", first: "Thu ngân", last: "Demo" },
  { email: "yta@demo.local", role: "R6", first: "Y tá", last: "Demo" },
  { email: "tv@demo.local", role: "R8", first: "Màn hình", last: "Sảnh chờ" },
  { email: "benhnhan1@demo.local", role: "R3", first: "Nguyễn Văn", last: "An", gender: "M", dob: "1990-05-12" },
  { email: "benhnhan2@demo.local", role: "R3", first: "Trần Thị", last: "Bình", gender: "F", dob: "1950-03-02" }, // cao tuổi: thử ưu tiên
];
const SPECIALTIES = [
  { vi: "Nội tổng quát", en: "General Medicine", room: "P101", doctor: { email: "bacsi1@demo.local", first: "Lê Minh", last: "Khoa" } },
  { vi: "Tim mạch", en: "Cardiology", room: "P102", doctor: { email: "bacsi2@demo.local", first: "Phạm Thu", last: "Hà" } },
  { vi: "Nhi khoa", en: "Pediatrics", room: "P103", doctor: { email: "bacsi3@demo.local", first: "Võ Quốc", last: "Bảo" } },
];
const SLOTS = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8"];

const upsertUser = async (a) => {
  const [u] = await db.User.findOrCreate({
    where: { email: a.email }, paranoid: false,
    defaults: {
      password: hash, firstName: a.first, lastName: a.last, roleId: a.role, gender: a.gender || null, isActive: true,
      tokenVersion: 0, phoneNumber: "0900000000", address: "Đà Nẵng", positionId: a.role === "R2" ? "P0" : null,
    },
    raw: false,
  });
  await u.update({ password: hash, roleId: a.role, isActive: true, deletedAt: null }); // làm mới mật khẩu/trạng thái mỗi lần chạy
  return Number(u.id);
};

const dayStr = (offset) => new Date(Date.now() + offset * 86400000).toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });

(async () => {
  const out = { accounts: [] };
  try {
    // Phòng khám
    const found = await db.Clinic_Translation.findOne({ where: { name: "Bệnh viện Demo", lang: "vi" }, raw: true });
    let clinicId;
    if (found) clinicId = Number(found.clinicId);
    else {
      const c = await db.Clinic.create({ phoneNumber: "0236 000 0000", isActive: true });
      clinicId = Number(c.id);
      await db.Clinic_Translation.create({ clinicId, lang: "vi", name: "Bệnh viện Demo", address: "Đà Nẵng", description: "Dữ liệu demo" });
      await db.Clinic_Translation.create({ clinicId, lang: "en", name: "Demo Hospital", address: "Da Nang", description: "Demo data" });
    }

    const today = todayDate();
    for (const sp of SPECIALTIES) {
      const t = await db.Specialty_Translation.findOne({ where: { name: sp.vi, lang: "vi" }, raw: true });
      let specialtyId;
      if (t) specialtyId = Number(t.specialtyId);
      else {
        const s = await db.Specialty.create({ sortOrder: 0, isActive: true });
        specialtyId = Number(s.id);
        await db.Specialty_Translation.create({ specialtyId, lang: "vi", name: sp.vi, description: sp.vi });
        await db.Specialty_Translation.create({ specialtyId, lang: "en", name: sp.en, description: sp.en });
      }
      let room = await db.Room.findOne({ where: { clinicId, code: sp.room }, raw: false });
      if (!room) room = await db.Room.create({ clinicId, specialtyId, code: sp.room, name: `Phòng khám ${sp.vi}`, floor: "1", isActive: true });

      const doctorId = await upsertUser({ ...sp.doctor, role: "R2" });
      const prof = await db.DoctorProfile.findOne({ where: { doctorId }, raw: true });
      if (!prof) await db.DoctorProfile.create({ doctorId, specialtyId, clinicId, priceId: "PRI1", yearsOfExperience: 10, bookingCount: 0 });
      else await db.DoctorProfile.update({ specialtyId, clinicId }, { where: { doctorId } });
      sp.doctorId = doctorId;
      out.accounts.push({ email: sp.doctor.email, role: "R2 (bác sĩ)", extra: sp.vi });

      for (let d = 0; d < 7; d++) {
        for (const tc of SLOTS) {
          const where = { doctorId, workDate: dayStr(d), timeType: tc };
          const [s, made] = await db.Schedule.findOrCreate({ where, defaults: { maxNumber: 10, currentNumber: 0, status: "available", roomId: room.id }, raw: false });
          if (!made && !s.roomId) await s.update({ roomId: room.id });
        }
      }
    }

    // Tài khoản các vai trò + bệnh nhân (kèm hồ sơ SELF)
    const ids = {};
    for (const a of ACCOUNTS) {
      const id = await upsertUser(a);
      ids[a.email] = id;
      out.accounts.push({ email: a.email, role: a.role });
      if (a.role === "R3") {
        const has = await db.PatientProfile.findOne({ where: { ownerUserId: id, relationship: "SELF" }, raw: true });
        if (!has) {
          await db.PatientProfile.create({
            ownerUserId: id, relationship: "SELF", fullName: `${a.first} ${a.last}`, dateOfBirth: a.dob, gender: a.gender, phoneNumber: "0900000000", address: "Đà Nẵng",
          });
        }
      }
    }

    // Lịch hẹn đã xác nhận hôm nay (để thử check-in): bệnh nhân 1 -> BS nội, bệnh nhân 2 -> BS tim mạch
    const mkBooking = async (email, doc, timeType) => {
      const patientId = ids[email];
      const exists = await db.Booking.findOne({ where: { patientId, workDate: today, timeType }, raw: true });
      if (exists) return;
      const profile = await db.PatientProfile.findOne({ where: { ownerUserId: patientId, relationship: "SELF" }, raw: true });
      await db.Booking.create({
        code: `DEMO${String(patientId).padStart(4, "0")}${timeType}`.slice(0, 16), doctorId: doc.doctorId, workDate: today, timeType,
        patientId, patientProfileId: profile ? profile.id : null, statusId: "S2", source: "ONLINE", symptoms: "Demo",
      });
      await db.Schedule.increment({ currentNumber: 1 }, { where: { doctorId: doc.doctorId, workDate: today, timeType } });
    };
    await mkBooking("benhnhan1@demo.local", SPECIALTIES[0], "T2");
    await mkBooking("benhnhan2@demo.local", SPECIALTIES[1], "T2");

    console.log(`✅ Seed demo xong (mật khẩu chung: ${PASSWORD})`);
    for (const a of out.accounts) console.log(`   ${a.email.padEnd(24)} ${a.role}${a.extra ? "  " + a.extra : ""}`);
  } catch (e) {
    console.error("❌ Seed demo lỗi:", e.message);
    process.exitCode = 1;
  } finally {
    await db.sequelize.close();
  }
})();
