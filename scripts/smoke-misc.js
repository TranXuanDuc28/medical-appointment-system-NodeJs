/**
 * Smoke test khu "gói khám / cơ sở / khảo sát / chat" trên DB v2 (DB_DATABASE_NAME trong .env).
 *   node scripts/smoke-misc.js
 * - Hàm đọc: chỉ kiểm tra hình dạng JSON (khớp bản cũ).
 * - Hàm ghi: tạo dữ liệu thử có tiền tố SMOKE_MISC rồi dọn sạch (chỉ xoá dòng do chính script tạo).
 */
require("dotenv").config({ quiet: true });
const path = require("path");
require("@babel/register")({
  cwd: path.join(__dirname, ".."),
  only: [(p) => p.startsWith(path.join(__dirname, "..", "src"))],
  presets: ["@babel/preset-env"],
});
const db = require("../src/models");
const pkgC = require("../src/controllers/packageController");
const facC = require("../src/controllers/facilityController");
const qS = require("../src/services/questionServices");
const chat = require("../src/services/chatServices");

let pass = 0;
const fails = [];
const ok = (cond, name, extra) => {
  if (cond) pass++;
  else {
    fails.push(name);
    console.log("FAIL:", name, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : "");
  }
};
const call = (fn, req) =>
  new Promise((resolve) => {
    const res = {
      _s: 200,
      status(c) {
        this._s = c;
        return this;
      },
      json(b) {
        resolve({ status: this._s, body: JSON.parse(JSON.stringify(b)) });
      },
    };
    Promise.resolve(fn({ query: {}, params: {}, body: {}, ...req }, res)).catch((e) => resolve({ thrown: e.message }));
  });

const TAG = "SMOKE_MISC";
const cleanup = { packages: [], facilities: [], categories: [], questions: [], assessments: [], messages: [], bookings: [], schedules: [] };

async function readChecks() {
  const lang = "vi";
  const all = await call(pkgC.getAllPackages, { query: { lang } });
  ok(all.status === 200 && all.body.errCode === 0 && Array.isArray(all.body.data), "packages/all", all);
  const p0 = all.body.data[0];
  ok(p0 && p0.facilityData && "name" in p0.facilityData, "packages/all facilityData");
  const withSpec = all.body.data.find((p) => p.specialtyData);
  if (withSpec) ok(["id", "image", "name", "descriptionHTML", "descriptionMarkdown"].every((k) => k in withSpec.specialtyData), "packages specialtyData shape", withSpec.specialtyData);
  const feat = await call(pkgC.getFeaturedPackages, {});
  ok(feat.status === 200 && feat.body.data.length <= 8, "packages/featured");
  const one = await call(pkgC.getPackageById, { params: { id: String(p0.id) }, query: { lang } });
  ok(one.status === 200 && one.body.data.id === p0.id && one.body.data.facilityData.address !== undefined, "packages/:id", one);
  const nf = await call(pkgC.getPackageById, { params: { id: "99999" }, query: {} });
  ok(nf.status === 404, "packages/:id 404");
  for (const o of [{}, { keyword: "khám" }, { sortBy: "price", sortOrder: "ASC" }, { minPrice: "1", maxPrice: "99999999" }, { limit: "2", offset: "1" }, { ageRange: "18-40" }, { category: "x" }]) {
    const s = await call(pkgC.searchPackages, { query: o });
    ok(s.status === 200 && Array.isArray(s.body.data.packages) && s.body.data.filters && "total" in s.body.data, "packages/search " + JSON.stringify(o), s);
  }
  const fo = await call(pkgC.getFilterOptions, { query: { lang } });
  ok(fo.status === 200 && fo.body.data.priceRange && Array.isArray(fo.body.data.specialties), "packages/filter-options", fo);

  // slots
  const slots = await call(pkgC.getPackageBookingSlots, { query: { facilityId: "23", date: "1756486800000", lang } });
  ok(slots.status === 200 && slots.body.data.slots.length === 8 && slots.body.data.availableDoctors.length > 0, "booking-slots", slots);

  // facilities
  const fa = await call(facC.getAllFacilities, {});
  ok(fa.status === 200 && fa.body.data.length > 0 && typeof fa.body.data[0].rating === "number", "facilities/all rating là số", fa.body.data[0]);
  const ff = await call(facC.getFeaturedFacilities, {});
  ok(ff.status === 200, "facilities/featured");
  const f1 = await call(facC.getFacilityById, { params: { id: String(fa.body.data[0].id) } });
  ok(f1.status === 200 && Array.isArray(f1.body.data.packages) && typeof f1.body.data.rating === "number", "facilities/:id", f1);
  const fs1 = await call(facC.searchFacilities, { query: { keyword: "viện", limit: "2" } });
  ok(fs1.status === 200 && Array.isArray(fs1.body.data.facilities) && fs1.body.data.filters.types, "facilities/search", fs1);
  const ffo = await call(facC.getFilterOptions, {});
  ok(ffo.status === 200 && typeof ffo.body.data.ratingRange.min === "number", "facilities/filter-options", ffo);

  // questions
  const cats = await qS.getAllCategoryQuestions();
  ok(cats.errCode === 0 && cats.data.length > 0 && cats.data[0].questions[0].options.length > 0, "category-questions");
  const byCat = await qS.getQuestionsByCategory("1");
  ok(byCat.errCode === 0 && byCat.data.length > 0 && byCat.data[0].options[0].option_text !== undefined, "questions by category");
  const ids = byCat.data.map((q) => q.id);
  ok(ids.every((v, i) => i === 0 || ids[i - 1] < v), "questions order tăng theo id");
  const q1 = await qS.getQuestionById(String(ids[0]));
  ok(q1.errCode === 0 && q1.data.id === ids[0], "question by id");
  const allQ = await qS.getAllQuestions();
  ok(allQ.errCode === 0 && allQ.data.length >= byCat.data.length, "get_all_questions");
}

async function writeChecks() {
  const fac = (await db.Facility.findOne({ where: { isActive: true }, attributes: ["id"], order: [["id", "ASC"]] })).id;

  // ---- Facility ----
  const badRating = await call(facC.createFacility, { body: { name: TAG + "_F", rating: 6 } });
  ok(badRating.status === 400, "facility rating>5 -> 400", badRating);
  const fc = await call(facC.createFacility, { body: { name: TAG + "_F", rating: 4.5, workingHours: { mon: "8-17" }, services: ["a", "b"], images: null } });
  ok(fc.status === 201 && fc.body.data.id, "facility create", fc);
  const fid = fc.body.data.id;
  cleanup.facilities.push(fid);
  const fcRow = await db.Facility.findByPk(fid, { raw: true });
  ok(JSON.parse(fcRow.workingHours).mon === "8-17" && fcRow.images === null, "facility JSON columns");
  const fu = await call(facC.updateFacility, { params: { id: String(fid) }, body: { description: "x", services: ["z"], rating: 3 } });
  ok(fu.status === 200, "facility update", fu);
  const fuBad = await call(facC.updateFacility, { params: { id: String(fid) }, body: { rating: 9 } });
  ok(fuBad.status === 400, "facility update rating>5 -> 400");

  // ---- Package ----
  ok((await call(pkgC.createPackage, { body: { name: TAG, price: 100 } })).status === 400, "package thiếu facilityId -> 400");
  ok((await call(pkgC.createPackage, { body: { name: TAG, price: -5, facilityId: fid } })).status === 400, "package price âm -> 400");
  ok((await call(pkgC.createPackage, { body: { name: TAG, price: 5, facilityId: 99999999 } })).status === 400, "package facility không tồn tại -> 400");
  const pc = await call(pkgC.createPackage, { body: { name: TAG + "_P", price: 123000, facilityId: fid, includedServices: ["x"], excludedServices: ["y"] } });
  ok(pc.status === 201 && pc.body.data.id, "package create", pc);
  const pid = pc.body.data.id;
  cleanup.packages.push(pid);
  const pu = await call(pkgC.updatePackage, { params: { id: String(pid) }, body: { price: 150000, includedServices: ["x", "z"] } });
  ok(pu.status === 200, "package update", pu);
  const pRow = await db.Package.findByPk(pid, { raw: true });
  ok(Number(pRow.price) === 150000 && JSON.parse(pRow.includedServices).length === 2, "package updated in DB", pRow);
  // RESTRICT: xoá cứng cơ sở đang có gói -> lỗi được dịch
  try {
    await db.Facility.destroy({ where: { id: fid } });
    ok(false, "RESTRICT facility phải chặn");
  } catch (e) {
    const { friendlyDbError } = require("../src/utils/legacyMisc");
    const fe = friendlyDbError(e);
    ok(fe && fe.status === 409, "RESTRICT -> 409 dễ hiểu", e.message);
  }
  const pd = await call(pkgC.deletePackage, { params: { id: String(pid) } });
  ok(pd.status === 200 && (await db.Package.findByPk(pid, { raw: true })).isActive === 0, "package soft delete");
  const fd = await call(facC.deleteFacility, { params: { id: String(fid) } });
  ok(fd.status === 200, "facility soft delete");

  // ---- Booking slots đếm S1/S2 (cần schedule + booking tạm) ----
  const DATE = "2099-06-01";
  const sch = await db.Schedule.create({ doctorId: 21, workDate: DATE, timeType: "T3", maxNumber: 3, currentNumber: 0, status: "available" });
  cleanup.schedules.push(sch.id);
  const bk = await db.Booking.create({ code: "SMOKEMISC1", doctorId: 21, workDate: DATE, timeType: "T3", patientId: 1, statusId: "S2", source: "ONLINE" });
  cleanup.bookings.push(bk.id);
  const { dateToMs } = require("../src/utils/dateKey");
  const sl = await call(pkgC.getPackageBookingSlots, { query: { facilityId: "23", date: dateToMs(DATE), doctorId: "21", lang: "vi" } });
  const t3 = sl.body.data.slots.find((s) => s.key === "T3");
  ok(t3 && t3.bookedCount === 1 && t3.availableSeats === 2, "booking-slots đếm S2", t3);

  // ---- Questions ----
  const cat = await qS.createNewCategoryQuestion({ title: TAG + "_CAT", description: "d" });
  ok(cat.errCode === 0, "category create", cat);
  const catId = cat.data.id || (await db.Category_Question.findOne({ where: { title: TAG + "_CAT" } })).id;
  cleanup.categories.push(catId);
  const nq = await qS.createNewQuestion({ question_text: TAG + " q1", category_question_id: catId, options: [{ option_text: "A", score: 0 }, { option_text: "B", score: 2 }, { option_text: "C", score: 1 }] });
  ok(nq.errCode === 0 && nq.questionId, "question create", nq);
  cleanup.questions.push(nq.questionId);
  const nq2 = await qS.createNewQuestion({ question_text: TAG + " q2", category_question_id: catId, options: [{ option_text: "X", score: 0 }] });
  cleanup.questions.push(nq2.questionId);
  const got = await qS.getQuestionById(String(nq.questionId));
  ok(got.data.options.map((o) => o.option_text).join("") === "ABC", "options giữ thứ tự nhập", got.data.options);
  const ed = await qS.editQuestion({ id: nq.questionId, question_text: TAG + " q1b", category_question_id: catId, is_active: true, options: [{ option_text: "Z", score: 5 }, { option_text: "Y", score: 1 }] });
  ok(ed.errCode === 0, "question edit", ed);
  const got2 = await qS.getQuestionsByCategory(String(catId));
  ok(got2.data.length === 2 && got2.data[0].id === nq.questionId && got2.data[0].options.map((o) => o.option_text).join("") === "ZY", "questions by category sau edit", got2);
  const nested = await qS.getAllCategoryQuestions();
  ok(nested.data.find((c) => c.id === catId).questions.length === 2, "allCategory có câu mới");

  // submit assessment (AI endpoint không chạy -> lời khuyên dự phòng)
  const answers = [{ question_id: nq.questionId, option_text: "Z" }];
  const guestId = "user_" + Date.now();
  const s1 = await qS.submitAssessment({ userId: guestId, category_question_id: catId, testKey: "BDI_II", answers });
  ok(s1.errCode === 0 && s1.assessmentId, "submit (khách)", s1);
  cleanup.assessments.push(s1.assessmentId);
  const r1 = await db.HealthAssessment.findByPk(s1.assessmentId, { raw: true });
  ok(r1.user_id === null && r1.guest_key === guestId, "khách -> guest_key", r1);
  const s2 = await qS.submitAssessment({ userId: "1", category_question_id: catId, testKey: "BDI_II", answers });
  cleanup.assessments.push(s2.assessmentId);
  const r2 = await db.HealthAssessment.findByPk(s2.assessmentId, { raw: true });
  ok(Number(r2.user_id) === 1 && r2.guest_key === null, "id user tồn tại -> user_id", r2);
  const s3 = await qS.submitAssessment({ userId: "987654321", category_question_id: catId, testKey: "BDI_II", answers });
  cleanup.assessments.push(s3.assessmentId);
  const r3 = await db.HealthAssessment.findByPk(s3.assessmentId, { raw: true });
  ok(r3.user_id === null && r3.guest_key === "987654321", "toàn số nhưng không tồn tại -> guest_key", r3);
  ok(Array.isArray(r1.answers) && r1.answers[0].option_text === "Z", "answers lưu dạng JSON (không mã hoá 2 lần)", r1.answers);
  const hGuest = await qS.getAssessmentHistoryById(guestId, "5");
  ok(hGuest.errCode === 0 && hGuest.data.length === 1 && hGuest.data[0].user_id === guestId && typeof hGuest.data[0].percentage === "number", "history theo guest", hGuest);
  const hUser = await qS.getAssessmentHistoryById("1", "50");
  ok(hUser.data.some((a) => a.id === s2.assessmentId && a.user_id === "1"), "history theo user_id", hUser.data.length);
  const det = await qS.getAssessmentDetailById(String(s1.assessmentId));
  ok(det.errCode === 0 && det.data.user_id === guestId, "assessment detail", det);
  ok((await qS.getAssessmentDetailById("99999999")).errCode === 2, "assessment detail not found");

  const dq = await qS.deleteQuestion(String(nq2.questionId));
  ok(dq.errCode === 0 && !(await db.Question.findByPk(nq2.questionId, { raw: true })), "question delete");

  // ---- Chat ----
  const u1 = await db.User.findOne({ where: { id: 1 }, attributes: ["id", "lastName", "email"], raw: true });
  const u2 = await db.User.findOne({ where: { id: 2 }, attributes: ["id", "lastName", "email"], raw: true });
  const sv = await chat.saveMsg({ msg: TAG + " hello", sender: { id: u1.id, lastName: u1.lastName, email: u1.email }, receiver: { id: u2.id, lastName: u2.lastName, email: u2.email }, file_url: null });
  ok(sv.errCode === 0 && sv.data.id, "saveMsg", sv);
  cleanup.messages.push(sv.data.id);
  const keys = ["id", "msg", "sender", "receiver", "file_url", "file_type", "file_name", "createdAt", "updatedAt"];
  ok(keys.every((k) => k in sv.data) && Object.keys(sv.data).length === keys.length, "saveMsg shape", Object.keys(sv.data));
  ok(sv.data.sender.name === u1.lastName && sv.data.receiver.email === u2.email && "image" in sv.data.sender, "saveMsg sender/receiver", sv.data);
  const sv2 = await chat.saveMsg({ msg: TAG + " reply", sender: { id: u2.id }, receiver: { _id: u1.id }, file_url: "http://x/y.png", file_type: "image/png", file_name: "y.png" });
  cleanup.messages.push(sv2.data.id);
  ok(sv2.data.sender.name === u2.lastName && sv2.data.receiver.id === u1.id && sv2.data.file_name === "y.png", "saveMsg tên lấy từ users", sv2.data);
  const gm = await chat.getMsg(u2.id, u1.id, 0);
  const mine = gm.data.filter((m) => String(m.msg).startsWith(TAG));
  ok(gm.errCode === 0 && mine.length === 2 && mine[0].msg.endsWith("hello") && mine[1].msg.endsWith("reply"), "getMsg thứ tự cũ->mới", mine);
  ok(keys.every((k) => k in gm.data[0]) && Object.keys(gm.data[0]).length === keys.length, "getMsg shape");
  ok((await chat.getMsg(null, 1, 0)).errCode === 1, "getMsg thiếu tham số");
  const dBad = await chat.delMsg({ msgId: sv.data.id, userId: u2.id });
  ok(dBad.errCode === 3, "delMsg người khác -> errCode 3", dBad);
  const dOk = await chat.delMsg({ msgId: sv.data.id, userId: u1.id });
  ok(dOk.errCode === 0, "delMsg chủ tin nhắn", dOk);
  ok((await chat.delMsg({ msgId: sv.data.id, userId: u1.id })).errCode === 2, "delMsg không tồn tại");
}

async function doCleanup() {
  const w = (e) => console.log("cleanup warn:", e.message);
  await db.HealthAssessment.destroy({ where: { id: cleanup.assessments } }).catch(w);
  await db.Message.destroy({ where: { id: cleanup.messages } }).catch(w);
  await db.Booking.destroy({ where: { id: cleanup.bookings } }).catch(w);
  await db.Schedule.destroy({ where: { id: cleanup.schedules } }).catch(w);
  await db.QuestionOption.destroy({ where: { question_id: cleanup.questions } }).catch(w);
  await db.Question.destroy({ where: { id: cleanup.questions } }).catch(w);
  await db.Category_Question.destroy({ where: { id: cleanup.categories } }).catch(w);
  await db.Package.destroy({ where: { id: cleanup.packages } }).catch(w);
  await db.Facility.destroy({ where: { id: cleanup.facilities } }).catch(w);
  // dọn sót theo tiền tố (nếu lần chạy trước bị ngắt)
  await db.Package.destroy({ where: { name: { [db.Sequelize.Op.like]: TAG + "%" } } }).catch(w);
  await db.Facility.destroy({ where: { name: { [db.Sequelize.Op.like]: TAG + "%" } } }).catch(w);
}

(async () => {
  console.log("DB:", process.env.DB_DATABASE_NAME);
  try {
    await readChecks();
    await writeChecks();
  } catch (e) {
    console.log("EXCEPTION:", e);
    fails.push("exception");
  } finally {
    await doCleanup();
  }
  console.log(`\n${pass} passed, ${fails.length} failed`);
  process.exit(fails.length ? 1 : 0);
})();
