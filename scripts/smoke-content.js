/**
 * Smoke test khu vực nội dung (chuyên khoa / phòng khám / cẩm nang) trên DB v2.
 *   node scripts/smoke-content.js
 * - Hàm đọc: kiểm tra shape JSON giống API cũ.
 * - Hàm ghi: chỉ tạo/sửa bản ghi TẠO RA TRONG SCRIPT rồi xoá sạch (không đụng dữ liệu có sẵn).
 *   (AUTO_INCREMENT của 3 bảng sẽ nhích lên - không tránh được.)
 */
require("dotenv").config({ quiet: true });
const assert = require("assert");
const db = require("../src/models");
const S = require("../src/services/specialtyServices");
const C = require("../src/services/clinicService");
const H = require("../src/services/handbookServices");

let n = 0;
const ok = (c, m) => { assert(c, m); n++; };

(async () => {
  // ---- ĐỌC ----
  for (const lang of ["vi", "en"]) {
    const sp = await S.getAllSpecialty(lang);
    ok(sp.errCode === 0 && sp.data.length > 0, "getAllSpecialty " + lang);
    const s = sp.data[0];
    for (const k of ["id", "image", "specialtyData", "specialtyMarkdown", "specialtyId", "name", "lang", "description"]) ok(k in s, "specialty key " + k);
    ok(["contentHTML", "contentMarkdown", "description"].every((k) => k in s.specialtyMarkdown), "specialtyMarkdown shape");

    const d = await S.getDetailSpecialtyById(s.id, "ALL", lang);
    ok(Array.isArray(d.data.specialtyData) && Array.isArray(d.data.doctorSpecialty) && Array.isArray(d.data.specialtyMarkdown), "specialty detail arrays");
    ok(d.data.specialtyData[0].name === s.name, "specialty detail name");

    const cl = await C.getAllClinic(lang);
    ok(cl.errCode === 0 && cl.data.length > 0, "getAllClinic " + lang);
    const c = cl.data[0];
    for (const k of ["id", "image", "clinicData", "clinicMarkdown", "name", "address", "lang"]) ok(k in c, "clinic key " + k);
    const cd = await C.getDetailClinicById(c.id, lang);
    ok(Array.isArray(cd.data.doctorClinic) && cd.data.clinicMarkdown.contentHTML !== undefined && cd.data.name === c.name, "clinic detail");

    const hb = await H.getAllHandBook(lang);
    ok(hb.errCode === 0 && hb.data.length > 0, "getAllHandBook " + lang);
    const h = hb.data[0];
    ok(Array.isArray(h.handbookData) && Array.isArray(h.handbookMarkdown) && "published" in h && "updated" in h, "handbook list shape");
    const rel = await H.getRelatedHandBooks(h.id, 4, lang);
    ok(rel.errCode === 0 && rel.data.every((x) => x.id !== h.id && x.handbookData && "title" in x.handbookData), "related handbooks");
  }
  ok((await S.getDetailSpecialtyById(999999, "ALL", "vi")).data && Object.keys((await S.getDetailSpecialtyById(999999, "ALL", "vi")).data).length === 0, "specialty not found");
  ok((await C.getDetailClinicById(999999, "vi")).errCode === 2, "clinic not found");
  ok((await H.getDetailHandBookById(999999, "vi")).errCode === 2, "handbook not found");
  ok((await S.getDetailSpecialtyById(1, "ALL")).errCode === 1, "missing param");

  // ---- GHI (chỉ trên bản ghi tạo mới) ----
  const created = { specialty: [], clinic: [], handbook: [] };
  try {
    const img = "data:image/png;base64,AAAA";
    let r = await S.createSpecialty({ action: "CREATE", imageBase64: img, contentHTML: "<p>h</p>", contentMarkdown: "m", lang: "vi", name: "ZZ smoke", description: "d" });
    ok(r.errCode === 0, "create specialty");
    const sp = (await db.Specialty_Translation.findAll({ where: { name: "ZZ smoke" } }))[0];
    ok(sp && sp.description === "d" && sp.contentHtml === "<p>h</p>", "specialty stored in translation");
    created.specialty.push(sp.specialtyId);
    r = await S.createSpecialty({ action: "UPDATE", specialtyId: sp.specialtyId, imageBase64: img, contentHTML: "<p>h2</p>", contentMarkdown: "m2", lang: "en", name: "ZZ smoke en" });
    ok(r.errCode === 0, "update specialty adds en translation");
    const det = await S.getDetailSpecialtyById(sp.specialtyId, "ALL", "en");
    ok(det.data.specialtyData[0].name === "ZZ smoke en" && det.data.specialtyMarkdown[0].contentHTML === "<p>h2</p>", "specialty en readback");
    ok((await S.createSpecialty({ action: "UPDATE", specialtyId: 999999, imageBase64: img, contentHTML: "x", contentMarkdown: "x", lang: "vi", name: "x" })).errCode === 2, "update missing specialty");

    r = await C.createClinicServices({ action: "CREATE", imageBase64: img, address: "addr", contentHTML: "<p>c</p>", contentMarkdown: "cm", lang: "vi", name: "ZZ clinic" });
    ok(r.errCode === 0, "create clinic");
    const ct = (await db.Clinic_Translation.findAll({ where: { name: "ZZ clinic" } }))[0];
    created.clinic.push(ct.clinicId);
    r = await C.createClinicServices({ action: "UPDATE", clinicId: ct.clinicId, imageBase64: img, address: "addr2", contentHTML: "<p>c2</p>", contentMarkdown: "cm2", lang: "vi", name: "ZZ clinic" });
    ok(r.errCode === 0, "update clinic");
    const cdet = await C.getDetailClinicById(ct.clinicId, "vi");
    ok(cdet.data.address === "addr2" && cdet.data.clinicMarkdown.contentHTML === "<p>c2</p>" && cdet.data.doctorClinic.length === 0, "clinic readback");

    const hbIn = { action: "CREATE", imageBase64: img, title: "ZZ hb", authors: ["A", "B"], reviewers: ["R"], published: "2026-01-01", updated: "2026-01-02", category: "Cẩm nang", contentHTML: "<p>b</p>", contentMarkdown: "bm", lang: "vi" };
    r = await H.createHandBook(hbIn);
    ok(r.errCode === 0, "create handbook");
    const ht = (await db.HandBook_Translation.findAll({ where: { title: "ZZ hb" } }))[0];
    created.handbook.push(ht.handbookId);
    r = await H.createHandBook({ ...hbIn, action: "UPDATE", handbookId: ht.handbookId, authors: ["Solo"], title: "ZZ hb 2" });
    ok(r.errCode === 0, "update handbook");
    const hdet = await H.getDetailHandBookById(ht.handbookId, "vi");
    ok(hdet.data.authors[0] === "Solo" && hdet.data.reviewers[0] === "R" && hdet.data.handbookData.title === "ZZ hb 2" && hdet.data.published === "2026-01-01" && hdet.data.views === 0, "handbook readback");
    const views = (await db.HandBook.findOne({ where: { id: ht.handbookId } })).views;
    ok(views === 1, "views incremented");
  } finally {
    // dọn sạch đúng các bản ghi vừa tạo (bản dịch xoá cascade; xoá tường minh cho chắc)
    for (const id of created.specialty) { await db.Specialty_Translation.destroy({ where: { specialtyId: id } }); await db.Specialty.destroy({ where: { id } }); }
    for (const id of created.clinic) { await db.Clinic_Translation.destroy({ where: { clinicId: id } }); await db.Clinic.destroy({ where: { id } }); }
    for (const id of created.handbook) { await db.HandBook_Translation.destroy({ where: { handbookId: id } }); await db.HandBook.destroy({ where: { id } }); }
  }
  console.log(`OK: ${n} kiểm tra đạt`);
  process.exit(0);
})().catch((e) => { console.error("FAIL:", e.message); process.exit(1); });
