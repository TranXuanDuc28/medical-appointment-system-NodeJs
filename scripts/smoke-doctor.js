/**
 * Smoke test khu vực bác sĩ / lịch / thanh toán trên DB v2.
 *   npx babel-node scripts/smoke-doctor.js
 * - Phần ĐỌC: kiểm tra shape JSON đúng như API cũ trên dữ liệu có sẵn (chỉ SELECT).
 * - Phần GHI: tự tạo bác sĩ + bệnh nhân + lịch + booking TEST (email @smoke-doctor.test), chạy các luồng
 *   (lưu hồ sơ, tạo lịch, danh sách bệnh nhân, kê đơn, thanh toán tiền mặt, webhook PayOS/Casso idempotent, queue lưu hồ sơ khám)
 *   rồi XOÁ SẠCH đúng dữ liệu đã tạo (kể cả khi lỗi). Email/PayOS/PDF được stub, không gọi dịch vụ ngoài.
 * Không DROP/ALTER/TRUNCATE.
 */
require("dotenv").config({ quiet: true });
const assert = require("assert");
const db = require("../src/models");
const svc = require("../src/services/doctorServices");
const emailServices = require("../src/services/emailServices");
const { dateToMs, msToDate } = require("../src/utils/dateKey");
const { addEmailJob } = require("../src/utils/queue");
const medicineSvc = require("../src/services/medicineServices");

let passed = 0;
const ok = (cond, msg) => {
  assert.ok(cond, msg);
  passed++;
  console.log("  ok -", msg);
};
const hasKeys = (obj, keys, label) => {
  const miss = keys.filter((k) => !(k in obj));
  ok(miss.length === 0, `${label} có đủ khoá [${keys.join(",")}]${miss.length ? " THIẾU: " + miss.join(",") : ""}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const created = { users: [], schedDoctor: null };
const TEST_DATE = "2031-05-05";
const TEST_MS = dateToMs(TEST_DATE);

(async () => {
  // Stub dịch vụ ngoài
  const sent = { attach: [], pay: [], pdf: 0, payos: [] };
  emailServices.sendAttachment = async (d) => {
    sent.attach.push(d);
  };
  emailServices.sendEmailPaymentSuccess = async (d) => {
    sent.pay.push(d);
  };
  emailServices.sendAttachmentDirect = async () => {};
  svc.getPrescriptionPDFBase64 = async () => {
    sent.pdf++;
    return "UERGLVRFU1Q="; // "PDF-TEST"
  };
  svc.createPayOSPaymentLink = async (d) => {
    sent.payos.push(d);
    return { errCode: 0, checkoutUrl: "https://example.invalid/pay" };
  };

  console.log("== ĐỌC (dữ liệu có sẵn) ==");
  const docs = await db.User.findAll({ where: { roleId: "R2" }, attributes: ["id"], raw: true });
  ok(docs.length > 0, `có ${docs.length} bác sĩ`);

  const top = await svc.getTopDoctorHomeServices(5, "vi");
  ok(top.errCode === 0 && top.data.length > 0 && top.data.length <= 5, "top doctor trả <= limit");
  hasKeys(top.data[0], ["id", "email", "firstName", "lastName", "image", "roleId", "positionData", "genderData", "Doctor_Infor"], "top[0]");
  ok(!("password" in top.data[0]) && !("tokenVersion" in top.data[0]), "top[0] không lộ password/tokenVersion");
  hasKeys(top.data[0].Doctor_Infor, ["specialtyId", "clinicId", "priceId", "nameClinic", "addressClinic", "note", "count", "lang", "doctorSpecialty"], "top[0].Doctor_Infor");
  ok(Array.isArray(top.data[0].Doctor_Infor.doctorSpecialty.specialtyData) && top.data[0].Doctor_Infor.doctorSpecialty.specialtyData[0].name, "top: doctorSpecialty.specialtyData[0].name");

  const all = await svc.getAllDoctorServices();
  ok(all.errCode === 0 && all.data.length === docs.length, "getAllDoctor đủ số bác sĩ");
  hasKeys(all.data[0], ["id", "positionData", "genderData"], "all[0]");

  const did = top.data[0].id;
  for (const fn of [svc.getDetailDoctorByIdServices, svc.getProfileDoctorByIdServices]) {
    const d = await fn(did, "vi");
    hasKeys(d.data, ["id", "email", "Markdown", "positionData", "Doctor_Infor"], "detail/profile");
    hasKeys(d.data.Doctor_Infor, ["priceTypeData", "paymentTypeData", "provinceTypeData", "nameClinic"], "detail.Doctor_Infor");
    ok(!("id" in d.data.Doctor_Infor) && !("doctorId" in d.data.Doctor_Infor), "detail.Doctor_Infor bỏ id/doctorId như cũ");
    if (d.data.Markdown) hasKeys(d.data.Markdown, ["description", "contentHTML", "contentMarkdown", "lang"], "detail.Markdown");
  }
  ok(Object.keys((await svc.getDetailDoctorByIdServices(999999, "vi")).data).length === 0, "detail bác sĩ không tồn tại => {}");
  ok((await svc.getDetailDoctorByIdServices(undefined, "vi")).errCode === 1, "detail thiếu id => errCode 1");
  const extra = await svc.getExtraDoctorInforByIdServices(did, "vi");
  hasKeys(extra.data, ["specialtyId", "clinicId", "priceTypeData", "specialty"], "extra");
  ok(typeof extra.data.specialty.name === "string", "extra.specialty.name");

  const anySched = await db.Schedule.findOne({ raw: true });
  if (anySched) {
    const s = await svc.getScheduleDoctorByDateServices({ doctorId: anySched.doctorId, date: dateToMs(anySched.workDate) });
    ok(s.errCode === 0 && s.data.length > 0, "schedule by date có dữ liệu");
    hasKeys(s.data[0], ["id", "date", "timeType", "doctorId", "status", "currentNumber", "maxNumber", "timeTypeData", "doctorData"], "schedule[0]");
    ok(s.data[0].date === dateToMs(anySched.workDate), "schedule.date là chuỗi ms 00:00 giờ VN");
    ok(!("workDate" in s.data[0]), "schedule không lộ workDate");
  }
  const m = await medicineSvc.getAllMedicine();
  ok(m.errCode === 0 && m.data.length > 0 && typeof m.data[0].price === "number", "medicine.price là số");

  console.log("== GHI (dữ liệu TEST, tự dọn) ==");
  const base = await db.DoctorProfile.findOne({ raw: true });
  const mkUser = (p) => db.User.create({ password: null, ...p });
  const tag = Date.now();
  const doc = await mkUser({ email: `doc${tag}@smoke-doctor.test`, firstName: "Smoke", lastName: "Doctor", roleId: "R2", positionId: "P1", gender: "M" });
  const pat = await mkUser({ email: `pat${tag}@smoke-doctor.test`, firstName: "Smoke", lastName: "Patient", roleId: "R3", gender: "F" });
  const pat2 = await mkUser({ email: `pat2${tag}@smoke-doctor.test`, firstName: "Smoke2", lastName: "Patient", roleId: "R3", gender: "M" });
  created.users.push(doc.id, pat.id, pat2.id);
  const D = doc.id;

  // --- saveDetailInforDoctor
  const base_in = { doctorId: D, contentHTML: "<p>x</p>", contentMarkdown: "x", action: "CREATE", selectedPrice: "PRI3", selectedPayment: "PAY3", selectedProvince: "PRO1", nameClinic: "PK Smoke", addressClinic: "1 Smoke", note: "n", description: "d", lang: "vi" };
  let r = await svc.saveDetailInforDoctor({ ...base_in });
  ok(r.errCode === 1 && /specialtyId/.test(r.errMessage), "tạo mới thiếu specialtyId => errCode 1 (cột NOT NULL)");
  r = await svc.saveDetailInforDoctor({ ...base_in, specialtyId: base.specialtyId, clinicId: base.clinicId });
  ok(r.errCode === 0, "tạo hồ sơ vi");
  r = await svc.saveDetailInforDoctor({ ...base_in, lang: "en", nameClinic: "Smoke Clinic", action: "CREATE", specialtyId: base.specialtyId, clinicId: base.clinicId });
  ok(r.errCode === 0, "tạo bản dịch en (không ghi trùng profile)");
  r = await svc.saveDetailInforDoctor({ ...base_in, action: "UPDATE", note: "n2", selectedPrice: "PRI4" }); // không gửi specialty/clinic => giữ nguyên
  ok(r.errCode === 0, "UPDATE giữ specialty/clinic cũ");
  ok((await db.DoctorProfile.count({ where: { doctorId: D } })) === 1, "chỉ 1 DoctorProfile");
  ok((await db.DoctorProfileTranslation.count({ where: { doctorId: D } })) === 2, "2 translation (vi, en)");
  let dd = (await svc.getDetailDoctorByIdServices(D, "vi")).data;
  ok(dd.Doctor_Infor.note === "n2" && dd.Doctor_Infor.priceId === "PRI4" && dd.Doctor_Infor.nameClinic === "PK Smoke", "đọc lại vi đúng giá trị mới");
  ok(dd.Markdown.contentHTML === "<p>x</p>" && dd.Markdown.description === "d" && dd.Markdown.lang === "vi", "Markdown vi đúng");
  dd = (await svc.getDetailDoctorByIdServices(D, "en")).data;
  ok(dd.Doctor_Infor.nameClinic === "Smoke Clinic", "đọc lại en đúng");
  ok((await svc.saveDetailInforDoctor({ ...base_in, doctorId: 99999999, specialtyId: base.specialtyId, clinicId: base.clinicId })).errCode === 3, "bác sĩ không tồn tại => errCode 3");
  ok((await svc.saveDetailInforDoctor({ ...base_in, selectedPrice: "NOPE", specialtyId: base.specialtyId, clinicId: base.clinicId })).errCode === 1, "mã giá sai => errCode 1 (FK), không ném lỗi");
  ok((await svc.saveDetailInforDoctor({ doctorId: D })).errCode === 1, "thiếu tham số => errCode 1");

  // --- bulkCreateSchedule
  const arr = [
    { date: TEST_MS, timeType: "T1", doctorId: D },
    { date: TEST_MS, timeType: "T2", doctorId: D },
  ];
  r = await svc.bulkCreateScheduleServices({ arrSchedule: arr, doctorId: D, formatedDate: TEST_MS });
  ok(r.errCode === 0, "bulkCreate lần 1");
  r = await svc.bulkCreateScheduleServices({ arrSchedule: [...arr, { date: TEST_MS, timeType: "T3", doctorId: D }], doctorId: D, formatedDate: TEST_MS });
  ok(r.errCode === 0, "bulkCreate lần 2 (trùng T1,T2 bị bỏ qua, thêm T3)");
  ok((await db.Schedule.count({ where: { doctorId: D, workDate: TEST_DATE } })) === 3, "đúng 3 slot, không lỗi UNIQUE");
  let sch = await svc.getScheduleDoctorByDateServices({ doctorId: D, date: TEST_MS });
  ok(sch.data.length === 3 && sch.data[0].date === TEST_MS && sch.data[0].status === "available" && sch.data[0].currentNumber === 0, "getSchedule trả 3 slot, date ms, available, current 0");
  ok(sch.data[0].maxNumber >= 1, `maxNumber=${sch.data[0].maxNumber} (từ MAX_NUMBER_SCHEDULE hoặc mặc định 10)`);
  ok((await svc.bulkCreateScheduleServices({ arrSchedule: arr, doctorId: D })).errCode === 1, "bulkCreate thiếu formatedDate => errCode 1");

  // --- booking test (dựng thẳng DB) + danh sách bệnh nhân
  const mkBooking = (patientId, timeType, statusId, n) =>
    db.Booking.create({ code: `SM${tag % 1e8}${n}`.slice(0, 16), doctorId: D, workDate: TEST_DATE, timeType, patientId, statusId });
  const b1 = await mkBooking(pat.id, "T1", "S2", 1);
  const b2 = await mkBooking(pat2.id, "T2", "S2", 2);
  let lp = await svc.getListPatientForDoctor(D, "R2", TEST_MS, "vi");
  ok(lp.errCode === 0 && lp.data.length === 2, "list R2: 2 booking S2");
  hasKeys(lp.data[0], ["id", "statusId", "doctorId", "patientId", "date", "timeType", "patientData", "timeTypeDataPatient", "statusDataPatient", "doctorInforData"], "list R2[0]");
  hasKeys(lp.data[0].patientData, ["firstName", "lastName", "email", "phoneNumber", "address", "gender", "genderData"], "list R2[0].patientData");
  hasKeys(lp.data[0].doctorInforData, ["specialtyId", "priceId", "nameClinic", "doctorData", "priceTypeData"], "list R2[0].doctorInforData");
  ok(lp.data[0].date === TEST_MS && !("confirmTokenHash" in lp.data[0]) && !("workDate" in lp.data[0]), "date là ms, không lộ confirmTokenHash/workDate");
  ok((await svc.getListPatientForDoctor(D, "R2", "ALL", "vi")).data.length === 0, "list R2 date=ALL không khớp gì (như cũ)");
  ok((await svc.getListPatientForDoctor(D, "R2", TEST_MS, undefined)).errCode === 1, "thiếu lang => errCode 1");

  // --- sendRemedy: S2 -> S3 + Payment tạm
  const remedy = {
    doctorId: D, patientId: pat.id, timeType: "T1",
    patientInfo: { fullName: "Smoke Patient", gender: "F", email: "p@smoke-doctor.test" },
    examInfo: { diagnosis: "dx", clinicalExam: "ce", detailExam: "de", conclusion: "cc", advice: "adv", allergy: "none" },
    prescription: [{ name: "Para", quantity: 2, price: 2000 }],
  };
  r = await svc.sendRemedyService(remedy);
  ok(r.errCode === 0 && sent.attach.length === 1, "sendRemedy ok, đã đẩy job email");
  ok(sent.attach[0].bookingId === b1.id && sent.attach[0].amount === 300000 + 4000 + 0 || sent.attach[0].amount > 0, `job: bookingId=${sent.attach[0].bookingId}, amount=${sent.attach[0].amount}`);
  ok(/\d{1,2}:\d{2}/.test(sent.attach[0].time) && sent.attach[0].time.includes("05"), `time hiển thị: ${sent.attach[0].time}`);
  let b1db = await db.Booking.findByPk(b1.id, { raw: true });
  ok(b1db.statusId === "S3", "booking => S3");
  let pay = await db.Payment.findOne({ where: { bookingId: b1.id }, raw: true });
  ok(pay && pay.cashier === "Chờ thanh toán" && pay.paidAt === null && Number(pay.amount) === sent.attach[0].amount, "Payment tạm (chưa paid_at) đúng số tiền");
  r = await svc.sendRemedyService(remedy);
  ok(r.errCode === 2, "gọi lại sendRemedy khi không còn S2 => errCode 2 (không ném lỗi)");

  // --- queue: lưu MedicalRecord (job thật qua addEmailJob, nhánh fallback không Redis)
  await addEmailJob("sendAttachment", { ...sent.attach[0] });
  for (let i = 0; i < 30 && !(await db.MedicalRecord.count({ where: { bookingId: b1.id } })); i++) await sleep(200);
  let mr = await db.MedicalRecord.findOne({ where: { bookingId: b1.id }, raw: true });
  ok(mr && mr.doctorId === D && mr.patientId === pat.id && mr.document && Buffer.from(mr.document).toString() === "UERGLVRFU1Q=", "MedicalRecord đã lưu (bookingId, document=PDF base64)");
  ok(sent.payos.length === 1 && sent.payos[0].bookingId === b1.id, "queue gọi createPayOSPaymentLink với bookingId số");
  await addEmailJob("sendAttachment", { ...sent.attach[0] }); // retry job => không tạo trùng
  await sleep(1500);
  ok((await db.MedicalRecord.count({ where: { bookingId: b1.id } })) === 1, "retry job không tạo MedicalRecord trùng (upsert theo booking)");

  // --- list R4 (thu ngân) khi S3 chưa có (S5/S6) => chuyển S6
  r = await svc.postMedicalAppointmentStatus({ doctorId: D, patientId: pat.id, timeType: "T1" });
  ok(r.errCode === 0 && (await db.Booking.findByPk(b1.id, { raw: true })).statusId === "S6", "postMedicalAppointmentStatus S3 -> S6");
  const cash = await svc.getListPatientForDoctor(D, "R4", "ALL", "vi");
  const c1 = cash.data.find((x) => x.id === b1.id);
  ok(c1 && c1.bookingData && c1.bookingData.bookingId === String(b1.id) && c1.bookingData.totalPrire === String(sent.attach[0].amount), "list R4: bookingData đúng shape Cashier cũ (bookingId chuỗi, totalPrire chuỗi)");
  hasKeys(c1.bookingData, ["id", "cashier", "date", "totalPrire", "paymentMethod", "description"], "bookingData");
  ok(c1.patientData.id === pat.id && c1.doctorInforData.specialty && c1.doctorInforData.specialty.name, "list R4: patientData.id + doctorInforData.specialty.name");
  const cashDate = await svc.getListPatientForDoctor(D, "R4", TEST_MS, "vi");
  ok(cashDate.data.some((x) => x.id === b1.id), "list R4 lọc theo ngày ms");

  // --- sendPayment (tiền mặt): S6 -> S5
  r = await svc.sendPayment({ email: "p@smoke-doctor.test", doctorId: D, patientId: pat.id, timeType: "T1", totalPrice: sent.attach[0].amount, patientName: "Smoke Patient", date: Date.now(), cashier: "Smoke Cashier" }, null);
  ok(r.errCode === 0 && (await db.Booking.findByPk(b1.id, { raw: true })).statusId === "S5", "sendPayment => S5");
  pay = await db.Payment.findOne({ where: { bookingId: b1.id }, raw: true });
  ok(pay.cashier === "Smoke Cashier" && pay.paidAt && pay.paymentMethod === "CASH", "Payment cập nhật (cashier, paid_at, CASH)");
  ok(sent.pay.length === 1, "email thanh toán được gửi");

  // --- webhook PayOS / Casso idempotent trên booking 2
  await svc.sendRemedyService({ ...remedy, patientId: pat2.id, timeType: "T2", prescription: [] });
  const exp = Number((await db.Payment.findOne({ where: { bookingId: b2.id }, raw: true })).amount);
  const hook = (ref, amount = exp, desc = `BOOKING${b2.id}`) => ({ code: "00", success: true, data: { orderCode: 1000 + 1, amount, description: desc, reference: ref, transactionDateTime: "2031-05-05 10:00:00", code: "00" } });
  const bad = await svc.handlePayOSWebhook(hook("SMOKE-LOW", exp - 1), null);
  ok(bad.errCode === 5 && (await db.Booking.findByPk(b2.id, { raw: true })).statusId === "S3", "webhook số tiền thiếu => từ chối, booking giữ nguyên");
  const before = sent.pay.length;
  const w1 = await svc.handlePayOSWebhook(hook("SMOKE-REF-1"), null);
  ok(w1.errCode === 0 && (await db.Booking.findByPk(b2.id, { raw: true })).statusId === "S5", "webhook PayOS => S5");
  const p2 = await db.Payment.findOne({ where: { bookingId: b2.id }, raw: true });
  ok(p2.gatewayRef === "PAYOS:SMOKE-REF-1" && p2.paymentMethod === "TRANSFER_QR" && p2.paidAt && Number(p2.amount) === exp, "Payment: gatewayRef, TRANSFER_QR, paid_at, amount");
  ok(new Date(p2.paidAt).toISOString() === "2031-05-05T03:00:00.000Z", "paid_at hiểu 'YYYY-MM-DD HH:mm:ss' là giờ VN");
  const w2 = await svc.handlePayOSWebhook(hook("SMOKE-REF-1"), null);
  ok(w2.errCode === 0 && /already/i.test(w2.errMessage) && sent.pay.length === before + 1, "webhook lặp cùng gatewayRef => idempotent (không gửi email lần 2)");
  const w3 = await svc.postConfirmPayment({ data: { id: 777, tid: "CASSO-T1", description: `chuyen tien BOOKING${b2.id}`, amount: exp, when: "2031-05-05 11:00:00" } }, null);
  ok(w3.errCode === 0 && sent.pay.length === before + 1, "Casso gửi lại sau khi đã S5 => không xử lý lại");
  ok((await svc.postConfirmPayment({ data: { description: "BOOKING99999999", amount: 1 } }, null)).errCode === 2, "booking không tồn tại => errCode 2");
  ok((await svc.postConfirmPayment({ data: { description: "xin chao", amount: 1 } }, null)).errCode === 0, "không có mã BOOKING => bỏ qua (errCode 0)");
  const par = await Promise.all([svc.handlePayOSWebhook(hook("SMOKE-REF-2"), null), svc.handlePayOSWebhook(hook("SMOKE-REF-2"), null)]);
  ok(par.every((x) => x.errCode === 0) && (await db.Payment.count({ where: { bookingId: b2.id } })) === 1, "2 webhook song song không tạo Payment trùng");

  console.log(`\nXONG: ${passed} kiểm tra đạt.`);
})()
  .catch((e) => {
    console.error("\nFAIL:", e && e.stack ? e.stack : e);
    process.exitCode = 1;
  })
  .finally(async () => {
    // DỌN: chỉ xoá đúng dữ liệu của user test (thứ tự theo FK)
    try {
      const ids = created.users;
      if (ids.length) {
        const bks = await db.Booking.findAll({ where: { doctorId: ids }, attributes: ["id"], raw: true });
        const bids = bks.map((b) => b.id);
        const pbks = await db.Booking.findAll({ where: { patientId: ids }, attributes: ["id"], raw: true });
        const allB = [...new Set([...bids, ...pbks.map((b) => b.id)])];
        if (allB.length) {
          await db.Payment.destroy({ where: { bookingId: allB } });
          await db.MedicalRecord.destroy({ where: { bookingId: allB } });
          await db.Booking.destroy({ where: { id: allB } });
        }
        await db.MedicalRecord.destroy({ where: { doctorId: ids } });
        await db.MedicalRecord.destroy({ where: { patientId: ids } });
        await db.Schedule.destroy({ where: { doctorId: ids } });
        await db.DoctorProfileTranslation.destroy({ where: { doctorId: ids } });
        await db.DoctorProfile.destroy({ where: { doctorId: ids } });
        await db.User.destroy({ where: { id: ids }, force: true });
        const left = await db.User.count({ where: { email: { [db.Sequelize.Op.like]: "%@smoke-doctor.test" } }, paranoid: false });
        console.log(left === 0 ? "Đã dọn sạch dữ liệu test." : `CẢNH BÁO: còn ${left} user test`);
      }
    } catch (e) {
      console.error("Dọn dữ liệu test lỗi:", e);
      process.exitCode = 1;
    }
    await db.sequelize.close();
    process.exit(process.exitCode || 0);
  });
