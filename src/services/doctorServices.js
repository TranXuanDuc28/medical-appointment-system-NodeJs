import { Op } from "sequelize";
import db from "../models";
require("dotenv").config();
import _ from "lodash";
import emailServices from "./emailServices";
import moment from "moment";
const { getOnlineUsers } = require("../socket/onlineUsers");
const payOS = require("../config/payos");
const { sendPushNotification } = require("../config/firebase");
const { getTokens } = require("./deviceTokenService");
const { msToDate, dateToMs } = require("../utils/dateKey");
const { cashierOf, bookingOf, scheduleOf } = require("../utils/legacyShapes");
const {
  imageToString,
  loadDoctorBundle,
  legacyDoctorInfor,
  legacyMarkdown,
  priceNumber,
} = require("../utils/legacyDoctor");

const path = require("path");
const ejs = require("ejs");
// Sức chứa mỗi khung giờ. Trước đây biến môi trường thiếu => cột NULL (lỗi cấu hình); v2 yêu cầu >= 1 nên mặc định 10.
const getMaxNumberSchedule = () => {
  const n = Number(process.env.MAX_NUMBER_SCHEDULE);
  return Number.isInteger(n) && n >= 1 ? n : 10;
};
import fetch from "node-fetch";
const puppeteer = require("puppeteer");

const LABELS = ["valueEn", "valueVi"];
// Cột mới của users không có trong API cũ (và không nên lộ ra client): bỏ khỏi mọi response
const USER_PRIVATE_FIELDS = ["password", "deletedAt", "tokenVersion", "lastLoginAt", "isActive"];
const VALID_LANGS = ["vi", "en"];

let getPrescriptionPDFBase64 = async (data) => {
  // Tạo HTML template cho đơn thuốc
  let html;
  try {
    html = await ejs.renderFile(
      path.join(__dirname, "../templates/prescription.ejs"),
      data
    );
  } catch (err) {
    process.stdout.write("EJS render error:" + err + "\n");
  }

  // Sử dụng puppeteer để render HTML thành PDF và trả về base64
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
  await browser.close();
  return pdfBuffer.toString("base64");
};

/** Gửi push tới TẤT CẢ thiết bị của user (bảng device_tokens). Lỗi push không làm hỏng nghiệp vụ. */
const pushToUser = async (userId, title, body, data) => {
  try {
    const tokens = await getTokens(userId);
    await Promise.all(tokens.map((t) => Promise.resolve(sendPushNotification(t, title, body, data)).catch(() => {})));
  } catch (e) {
    console.error("pushToUser failed:", e && e.message);
  }
};

/** Thời điểm giao dịch -> Date. Nhận ms/giây (số hoặc chuỗi số), "YYYY-MM-DD HH:mm:ss" (giờ VN, PayOS), ISO. */
const parseTxnTime = (v) => {
  if (v === null || v === undefined || v === "") return new Date();
  if (v instanceof Date) return isNaN(v.getTime()) ? new Date() : v;
  const s = String(v).trim();
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    return new Date(n < 1e11 ? n * 1000 : n);
  }
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) return new Date(s.replace(" ", "T") + "+07:00");
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date() : d;
};

const SENSITIVE_BOOKING_FIELDS = ["confirmTokenHash", "holdExpiresAt"];
/** Booking (plain) -> shape cũ: date ms, bỏ field nhạy cảm/không có ở API cũ. */
const legacyBooking = (plain) => {
  const b = bookingOf(plain);
  SENSITIVE_BOOKING_FIELDS.forEach((k) => delete b[k]);
  delete b.workDate;
  return b;
};

let getTopDoctorHomeServices = async (limitInput, lang) => {
  lang = lang || "vi";
  // Bước 1: chọn id bác sĩ (mới nhất trước) có hồ sơ + bản dịch đúng ngôn ngữ + tên chuyên khoa đúng ngôn ngữ (giống INNER JOIN cũ)
  const idRows = await db.User.findAll({
    where: { roleId: "R2" },
    attributes: ["id"],
    order: [["createdAt", "DESC"], ["id", "DESC"]],
    raw: true,
  });
  const bundle = await loadDoctorBundle(idRows.map((r) => r.id), lang);
  let ids = idRows
    .map((r) => r.id)
    .filter((id) => {
      const e = bundle.get(id);
      return e && e.profile.doctorSpecialty && e.profile.doctorSpecialty.specialtyData && e.profile.doctorSpecialty.specialtyData.length > 0;
    });
  const limit = Number(limitInput);
  if (Number.isFinite(limit) && limit > 0) ids = ids.slice(0, limit);

  let doctors = [];
  if (ids.length) {
    const users = await db.User.findAll({
      where: { id: ids },
      attributes: { exclude: USER_PRIVATE_FIELDS },
      include: [
        { model: db.AllCode, as: "positionData", attributes: LABELS },
        { model: db.AllCode, as: "genderData", attributes: LABELS },
      ],
      raw: false,
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    doctors = ids
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((u) => {
        const plain = u.get({ plain: true });
        plain.image = imageToString(plain.image);
        const entry = bundle.get(plain.id);
        plain.Doctor_Infor = {
          ...legacyDoctorInfor(entry, lang, { noLookups: true }),
          doctorSpecialty: entry.profile.doctorSpecialty,
        };
        return plain;
      });
  }
  return { errCode: 0, data: doctors };
};

let getAllDoctorServices = async () => {
  let doctors = await db.User.findAll({
    where: { roleId: "R2" },
    attributes: { exclude: USER_PRIVATE_FIELDS },
    include: [
      { model: db.AllCode, as: "positionData", attributes: LABELS },
      { model: db.AllCode, as: "genderData", attributes: LABELS },
    ],
    raw: true,
    nest: true,
  });
  doctors.forEach((item) => {
    item.image = imageToString(item.image);
  });
  return { errCode: 0, data: doctors };
};

// Chấp nhận cả tên cũ (selectedPrice...) lẫn tên thuộc tính mới (priceId...)
const normalizeDoctorInput = (d) => ({
  ...d,
  selectedPrice: d.selectedPrice ?? d.priceId,
  selectedPayment: d.selectedPayment ?? d.paymentId,
  selectedProvince: d.selectedProvince ?? d.provinceId,
});

let checkRequiredFields = (inputData) => {
  let arrFields = [
    "doctorId",
    "contentHTML",
    "contentMarkdown",
    "action",
    "selectedPrice",
    "selectedPayment",
    "selectedProvince",
    "nameClinic",
    "addressClinic",
    "note",
  ];
  let isValid = true;
  let element = "";
  for (let i = 0; i < arrFields.length; i++) {
    if (!inputData[arrFields[i]]) {
      isValid = false;
      element = arrFields[i];
      break;
    }
  }
  return { isValid, element };
};

/**
 * Lưu hồ sơ bác sĩ: DoctorProfile (1 dòng/bác sĩ, thuộc tính dùng chung) + DoctorProfileTranslation (1 dòng/ngôn ngữ).
 * Cả CREATE lẫn UPDATE đều là upsert. specialtyId/clinicId là NOT NULL ở DB: khi tạo mới bắt buộc có, khi cập nhật bỏ trống thì giữ giá trị cũ.
 */
let saveDetailInforDoctor = async (rawInput) => {
  const inputData = normalizeDoctorInput(rawInput || {});
  const checkObj = checkRequiredFields(inputData);
  if (checkObj.isValid === false) {
    return { errCode: 1, errMessage: `Missing parameter:${checkObj.element}` };
  }
  const lang = inputData.lang || "vi";
  if (!VALID_LANGS.includes(lang)) return { errCode: 1, errMessage: "Invalid parameter:lang" };
  if (String(inputData.note).length > 500) return { errCode: 1, errMessage: "Invalid parameter:note (max 500 chars)" };
  if (String(inputData.nameClinic).length > 255 || String(inputData.addressClinic).length > 255) {
    return { errCode: 1, errMessage: "Invalid parameter:nameClinic/addressClinic (max 255 chars)" };
  }
  const blank = (v) => v === undefined || v === null || v === "";

  try {
    return await db.sequelize.transaction(async (t) => {
      const doctor = await db.User.findOne({ where: { id: inputData.doctorId }, attributes: ["id"], transaction: t, raw: true });
      if (!doctor) return { errCode: 3, errMessage: "Doctor not found" };

      let profile = await db.DoctorProfile.findOne({
        where: { doctorId: inputData.doctorId },
        transaction: t,
        lock: t.LOCK.UPDATE,
        raw: false,
      });

      const specialtyId = !blank(inputData.specialtyId) ? inputData.specialtyId : profile ? profile.specialtyId : null;
      const clinicId = !blank(inputData.clinicId) ? inputData.clinicId : profile ? profile.clinicId : null;
      if (blank(specialtyId)) return { errCode: 1, errMessage: "Missing parameter:specialtyId" };
      if (blank(clinicId)) return { errCode: 1, errMessage: "Missing parameter:clinicId" };

      const profileValues = {
        specialtyId,
        clinicId,
        priceId: inputData.selectedPrice,
        provinceId: inputData.selectedProvince,
        paymentId: inputData.selectedPayment,
      };
      if (profile) {
        await profile.update(profileValues, { transaction: t });
      } else {
        await db.DoctorProfile.create({ doctorId: inputData.doctorId, ...profileValues }, { transaction: t });
      }

      const trValues = {
        clinicName: inputData.nameClinic,
        clinicAddress: inputData.addressClinic,
        note: inputData.note,
        contentMarkdown: inputData.contentMarkdown,
        contentHtml: inputData.contentHTML,
      };
      if (inputData.description !== undefined) trValues.description = inputData.description;

      const tr = await db.DoctorProfileTranslation.findOne({
        where: { doctorId: inputData.doctorId, lang },
        transaction: t,
        lock: t.LOCK.UPDATE,
        raw: false,
      });
      if (tr) {
        await tr.update(trValues, { transaction: t });
      } else {
        await db.DoctorProfileTranslation.create({ doctorId: inputData.doctorId, lang, ...trValues }, { transaction: t });
      }
      return { errCode: 0, errMessage: "Save infor doctor succeed!" };
    });
  } catch (e) {
    if (e && (e.name === "SequelizeForeignKeyConstraintError" || e.name === "SequelizeUniqueConstraintError")) {
      return { errCode: 1, errMessage: "Invalid reference (specialty/clinic/price/province/payment)" };
    }
    throw e;
  }
};

/** Chi tiết bác sĩ (dùng chung cho detail & profile: hai API cũ trả cùng shape). */
const buildDoctorDetail = async (inputId, lang) => {
  const user = await db.User.findOne({
    where: { id: inputId },
    attributes: { exclude: USER_PRIVATE_FIELDS },
    include: [{ model: db.AllCode, as: "positionData", attributes: LABELS }],
    raw: false,
  });
  if (!user) return {};
  const bundle = await loadDoctorBundle([user.id], lang || undefined);
  const entry = bundle.get(user.id);
  // Code cũ: có lang thì Doctor_Infor là INNER JOIN => không có bản ghi đúng lang thì cả kết quả rỗng
  if (lang && !entry) return {};
  const plain = user.get({ plain: true });
  plain.image = imageToString(plain.image);
  plain.Markdown = entry ? legacyMarkdown(entry.tr) : null;
  plain.Doctor_Infor = entry ? legacyDoctorInfor(entry, lang, { dropIds: true }) : null;
  return plain;
};

let getDetailDoctorByIdServices = async (inputId, lang) => {
  if (!inputId) {
    return { errCode: 1, errMessage: " Khong co tham so truyen vao" };
  }
  return { errCode: 0, data: await buildDoctorDetail(inputId, lang) };
};

let bulkCreateScheduleServices = async (data) => {
  if (!data || !data.arrSchedule || !data.doctorId || !data.formatedDate) {
    return { errCode: 1, errMessage: "Missing required param !" };
  }
  const maxNumber = getMaxNumberSchedule();
  const rows = [];
  const seen = new Set();
  for (const item of data.arrSchedule || []) {
    const workDate = msToDate(item.date ?? data.formatedDate);
    const doctorId = item.doctorId ?? data.doctorId;
    if (!workDate || !item.timeType) {
      return { errCode: 1, errMessage: "Missing required param !" };
    }
    const key = `${doctorId}|${workDate}|${item.timeType}`;
    if (seen.has(key)) continue; // trùng ngay trong yêu cầu
    seen.add(key);
    rows.push({ doctorId, workDate, timeType: item.timeType, maxNumber, currentNumber: 0, status: "available" });
  }

  if (rows.length) {
    const dates = [...new Set(rows.map((r) => r.workDate))];
    const existing = await db.Schedule.findAll({
      where: { doctorId: data.doctorId, workDate: dates },
      attributes: ["doctorId", "workDate", "timeType"],
      raw: true,
    });
    const have = new Set(existing.map((e) => `${e.doctorId}|${e.workDate}|${e.timeType}`));
    const toCreate = rows.filter((r) => !have.has(`${r.doctorId}|${r.workDate}|${r.timeType}`));
    if (toCreate.length) {
      // ignoreDuplicates: nếu có yêu cầu song song vừa tạo cùng slot thì bỏ qua thay vì lỗi UNIQUE
      await db.Schedule.bulkCreate(toCreate, { ignoreDuplicates: true });
    }
  }
  return { errCode: 0, errMessage: "OK" };
};

let getScheduleDoctorByDateServices = async ({ doctorId, date }) => {
  if (!doctorId || !date) {
    return { errCode: 1, errMessage: "Không có tham số truyền vào" };
  }
  const workDate = msToDate(date);
  let list = [];
  if (workDate) {
    const rows = await db.Schedule.findAll({
      where: { doctorId, workDate },
      include: [
        { model: db.AllCode, as: "timeTypeData", attributes: LABELS },
        { model: db.User, as: "doctorData", attributes: ["firstName", "lastName"] },
      ],
      order: [["id", "ASC"]],
      raw: false,
    });
    list = rows.map((r) => {
      const s = scheduleOf(r);
      delete s.workDate;
      delete s.roomId;
      return s;
    });
  }
  return { errCode: 0, data: list };
};

let getExtraDoctorInforByIdServices = async (inputId, lang) => {
  if (!inputId) {
    return { errCode: 1, errMessage: " Khong co tham so truyen vao" };
  }
  lang = lang || "vi";
  const bundle = await loadDoctorBundle([inputId], lang);
  const entry = bundle.get(Number(inputId));
  const spec = entry && entry.profile.doctorSpecialty && entry.profile.doctorSpecialty.specialtyData;
  // Code cũ: INNER JOIN bản dịch chuyên khoa => thiếu thì trả {}
  if (!entry || !spec || !spec.length) return { errCode: 0, data: {} };
  const info = legacyDoctorInfor(entry, lang, { dropIds: true });
  info.specialty = { name: spec[0].name };
  return { errCode: 0, data: info };
};

let getProfileDoctorByIdServices = async (inputId, lang) => {
  if (!inputId) {
    return { errCode: 1, errMessage: " Khong co tham so truyen vao" };
  }
  return { errCode: 0, data: await buildDoctorDetail(inputId, lang) };
};

let getListPatientForDoctor = async (doctorId, roleId, date, lang) => {
  if (!doctorId || !roleId || !date || !lang) {
    return { errCode: 1, errMessage: "Missing required parameters" };
  }
  const isCashier = roleId === "R4";
  const allDates = date === "ALL" || date === "all";
  const workDate = allDates ? null : msToDate(date);

  let where;
  if (isCashier) {
    where = { statusId: { [Op.in]: ["S5", "S6"] } };
    if (!allDates) where.workDate = workDate;
  } else {
    where = { statusId: { [Op.in]: ["S2", "S3"] }, doctorId, workDate };
  }
  // Ngày không hợp lệ => không khớp bản ghi nào (như so sánh chuỗi cũ)
  if (!allDates && !workDate) return { errCode: 0, data: [] };

  const patientAttrs = ["firstName", "lastName", "email", "phoneNumber", "address", "gender"];
  const include = [
    {
      model: db.User,
      as: "patientData",
      attributes: isCashier ? ["id", ...patientAttrs] : patientAttrs,
      include: [{ model: db.AllCode, as: "genderData", attributes: LABELS }],
    },
    { model: db.AllCode, as: "timeTypeDataPatient", attributes: LABELS },
    { model: db.AllCode, as: "statusDataPatient", attributes: LABELS },
  ];
  if (isCashier) include.push({ model: db.Payment, as: "bookingData", required: false });

  const rows = await db.Booking.findAll({
    where,
    include,
    order: [["createdAt", "DESC"], ["id", "DESC"]],
    raw: false,
  });
  const plains = rows.map((r) => r.get({ plain: true }));
  const bundle = await loadDoctorBundle(plains.map((p) => p.doctorId), lang);

  const data = [];
  for (const p of plains) {
    const entry = bundle.get(p.doctorId);
    // Nhánh bác sĩ: Doctor_Infor là INNER JOIN trong code cũ; nhánh thu ngân: required:false
    if (!entry && !isCashier) continue;
    const b = legacyBooking(p);
    if (isCashier) b.bookingData = p.bookingData ? cashierOf(p.bookingData) : null;
    if (entry) {
      const info = legacyDoctorInfor(entry, lang, { noLookups: true });
      info.doctorData = { firstName: entry.profile.doctorData && entry.profile.doctorData.firstName, lastName: entry.profile.doctorData && entry.profile.doctorData.lastName };
      info.priceTypeData = entry.profile.priceTypeData;
      if (isCashier) {
        const st = entry.profile.doctorSpecialty && entry.profile.doctorSpecialty.specialtyData && entry.profile.doctorSpecialty.specialtyData[0];
        info.specialty = st
          ? { id: st.id, specialtyId: st.specialtyId, name: st.name, lang: st.lang, createdAt: st.createdAt, updatedAt: st.updatedAt }
          : null;
      }
      b.doctorInforData = info;
    } else {
      b.doctorInforData = null;
    }
    data.push(b);
  }
  return { errCode: 0, data };
};

const buildTimeBooking = ({ timeLabel, workDate }) => {
  if (!timeLabel && !workDate) return "";
  const ms = dateToMs(workDate);
  const date = moment
    .unix(+ms / 1000)
    .locale("vi")
    .format("dddd - DD//MM/YYYY");
  return ` ${timeLabel} ${date}`;
};

const parseBreakdown = (description) => {
  if (!description) return {};
  try {
    return JSON.parse(description) || {};
  } catch (e) {
    return {};
  }
};

/** Tạo/cập nhật Payment của 1 booking (UNIQUE booking_id). */
const upsertPayment = async (bookingId, values, transaction) => {
  const exist = await db.Payment.findOne({ where: { bookingId }, transaction, lock: transaction ? transaction.LOCK.UPDATE : undefined, raw: false });
  if (exist) {
    await exist.update(values, { transaction });
    return exist;
  }
  return db.Payment.create({ bookingId, ...values }, { transaction });
};

let sendRemedyService = async (data) => {
  if (!data.doctorId || !data.patientId || !data.timeType) {
    return { errCode: 1, errMessage: "Missing required parameters" };
  }
  const where = {
    doctorId: data.doctorId,
    patientId: data.patientId,
    timeType: data.timeType,
    statusId: "S2",
  };
  if (data.date) {
    const wd = msToDate(data.date);
    if (wd) where.workDate = wd;
  }
  const appointment = await db.Booking.findOne({
    where,
    order: [["workDate", "ASC"], ["id", "ASC"]],
    raw: true,
  });
  if (!appointment) {
    return { errCode: 2, errMessage: "Appointment not found or already processed" };
  }

  const [bundle, timeRow] = await Promise.all([
    loadDoctorBundle([appointment.doctorId], "vi"),
    db.AllCode.findOne({ where: { keyMap: appointment.timeType }, raw: true }),
  ]);
  const entry = bundle.get(appointment.doctorId);
  const doctorUser = entry && entry.profile.doctorData;
  const timeString = buildTimeBooking({ timeLabel: timeRow && timeRow.valueVi, workDate: appointment.workDate });
  const doctorName = `${(doctorUser && doctorUser.firstName) || ""} ${(doctorUser && doctorUser.lastName) || ""}`.trim();

  // 1. Tính toán chi phí chính xác
  const defaultPrice = entry ? await priceNumber(entry.profile.priceId) : null;
  const examinationFee = Number(data.examinationPrice || defaultPrice || 300000);
  const medicineFee =
    Number(data.medicinePrice) ||
    (data.prescription || []).reduce(
      (sum, med) => sum + (Number(med.total) || Number(med.quantity || 1) * Number(med.price || 0)),
      0
    );
  const totalFee = Number(data.totalPrice) || examinationFee + medicineFee;
  const breakdownJson = JSON.stringify({
    examinationFee,
    medicineFee,
    totalFee,
    medicinesCount: (data.prescription || []).length,
  });

  // 2. Đổi trạng thái S2 -> S3 và tạo/cập nhật hoá đơn tạm cho quầy Thu ngân (một giao dịch)
  const moved = await db.sequelize.transaction(async (t) => {
    const [affected] = await db.Booking.update(
      { statusId: "S3" },
      { where: { id: appointment.id, statusId: "S2" }, transaction: t }
    );
    if (!affected) return false; // đã có yêu cầu khác xử lý
    const exist = await db.Payment.findOne({ where: { bookingId: appointment.id }, transaction: t, lock: t.LOCK.UPDATE, raw: false });
    if (exist) {
      await exist.update({ amount: totalFee, description: breakdownJson }, { transaction: t });
    } else {
      await db.Payment.create(
        {
          bookingId: appointment.id,
          cashier: "Chờ thanh toán",
          amount: totalFee,
          paymentMethod: "CASH",
          description: breakdownJson,
        },
        { transaction: t }
      );
    }
    return true;
  });
  if (!moved) {
    return { errCode: 2, errMessage: "Appointment not found or already processed" };
  }

  // Prepare job data for worker to process asynchronously
  const jobData = {
    ...data,
    bookingId: appointment.id,
    amount: totalFee, // Số tiền PayOS thu = Tiền khám + Tiền thuốc
    examinationPrice: examinationFee,
    medicinePrice: medicineFee,
    time: timeString,
    doctorName: doctorName,
    pdfData: {
      time: timeString,
      patientName: data.patientInfo.fullName,
      gender: data.patientInfo.gender,
      birthDate: data.patientInfo.birthDate,
      age: data.patientInfo.age,
      phone: data.patientInfo.phone,
      email: data.patientInfo.email,
      address: data.patientInfo.address,
      city: data.patientInfo.city,
      weight: data.patientInfo.weight,
      height: data.patientInfo.height,
      job: data.patientInfo.occupation,
      note: data.patientInfo.note,
      clinicalExam: data.examInfo.clinicalExam,
      detailExam: data.examInfo.detailExam,
      diagnosis: data.examInfo.diagnosis,
      allergies: data.examInfo.allergy,
      advice: data.examInfo.advice,
      treatment: data.examInfo.conclusion,
      medicines: data.prescription || [],
      examinationFee: `${examinationFee.toLocaleString("vi-VN")} VND`,
      medicineFee: `${medicineFee.toLocaleString("vi-VN")} VND`,
      totalPrice: `${totalFee.toLocaleString("vi-VN")} VND`,
      doctorName: doctorName,
    },
  };

  // Queue the task to run in the background
  await emailServices.sendAttachment(jobData);

  return { errCode: 0, errMessage: "Send remedy queued successfully!" };
};

let postMedicalAppointmentStatus = async (data) => {
  if (!data.doctorId || !data.patientId || !data.timeType) {
    return { errCode: 1, errMessage: "Missing required parameters" };
  }
  const where = {
    doctorId: data.doctorId,
    patientId: data.patientId,
    timeType: data.timeType,
    statusId: "S3", // Status Done
  };
  if (data.date) {
    const wd = msToDate(data.date);
    if (wd) where.workDate = wd;
  }
  const appointment = await db.Booking.findOne({ where, order: [["workDate", "ASC"], ["id", "ASC"]], raw: true });
  if (appointment) {
    // S6 = Status UnPaid (chỉ chuyển nếu vẫn đang S3)
    await db.Booking.update({ statusId: "S6" }, { where: { id: appointment.id, statusId: "S3" } });
  }
  return { errCode: 0, errMessage: "Update medical appointments succeed!" };
};

let sendPayment = async (data, io) => {
  if (!data.email || !data.doctorId || !data.patientId || !data.timeType) {
    return { errCode: 1, errMessage: "Missing required parameters" };
  }
  const where = {
    doctorId: data.doctorId,
    patientId: data.patientId,
    timeType: data.timeType,
    statusId: "S6",
  };
  if (data.bookingId && Number.isSafeInteger(Number(data.bookingId))) where.id = Number(data.bookingId);
  else if (data.bookingDate) {
    const wd = msToDate(data.bookingDate);
    if (wd) where.workDate = wd;
  }
  const appointment = await db.Booking.findOne({ where, order: [["workDate", "ASC"], ["id", "ASC"]], raw: true });

  if (appointment) {
    const paid = await db.sequelize.transaction(async (t) => {
      const [affected] = await db.Booking.update(
        { statusId: "S5" },
        { where: { id: appointment.id, statusId: "S6" }, transaction: t }
      );
      if (!affected) return false;

      const existPayment = await db.Payment.findOne({ where: { bookingId: appointment.id }, transaction: t, lock: t.LOCK.UPDATE, raw: true });
      const breakdown = parseBreakdown(existPayment && existPayment.description);
      const examPrice =
        data.examinationPrice !== undefined
          ? Number(data.examinationPrice)
          : breakdown.examinationFee !== undefined
          ? Number(breakdown.examinationFee)
          : Number(data.totalPrice || 0);
      const medPrice =
        data.medicinePrice !== undefined
          ? Number(data.medicinePrice)
          : breakdown.medicineFee !== undefined
          ? Number(breakdown.medicineFee)
          : 0;
      const finalTotal = Number(data.totalPrice || examPrice + medPrice);

      await upsertPayment(
        appointment.id,
        {
          cashier: data.cashier || "Thu ngân",
          paidAt: parseTxnTime(data.date),
          amount: finalTotal,
          paymentMethod: data.paymentMethod || "CASH",
          description: JSON.stringify({
            examinationFee: examPrice,
            medicineFee: medPrice,
            totalFee: finalTotal,
            medicinesCount: breakdown.medicinesCount || 0,
            note: data.description || breakdown.note || "Thanh toán viện phí",
          }),
        },
        t
      );
      return true;
    });

    if (paid) {
      // Emit PAYMENT_CONFIRMED to cashier and patient
      if (io) {
        const onlineUsers = getOnlineUsers();
        const notificationData = {
          bookingId: appointment.id,
          patientName: data.patientName,
          amount: data.totalPrice,
          transactionDateTime: data.date,
          doctorId: data.doctorId,
        };

        const cashiers = onlineUsers.filter((user) => user.roleId === "R4");
        const patient = onlineUsers.find((user) => user.id === data.patientId);

        cashiers.forEach((cashier) => {
          io.to(cashier.socketId).emit("PAYMENT_CONFIRMED", { ...notificationData, role: "cashier" });
        });

        if (patient) {
          io.to(patient.socketId).emit("PAYMENT_CONFIRMED", { ...notificationData, role: "patient" });
        }
      }

      await pushToUser(
        data.patientId,
        "Thanh toán thành công",
        `Lịch hẹn khám của bạn (Mã: BOOKING${appointment.id}) đã được thanh toán thành công số tiền ${data.totalPrice} VNĐ.`,
        { bookingId: String(appointment.id), status: "paid" }
      );
    }
  }

  const dataSend = {
    reciverEmail: data.email,
    patientName: data.patientName,
    amount: data.totalPrice,
    time: data.date,
    language: "vi",
  };
  await emailServices.sendEmailPaymentSuccess(dataSend);
  return { errCode: 0, errMessage: "Send remedy succeed!" };
};

// API key Casso đọc từ biến môi trường CASSO_API_KEY (trước đây hard-code trong mã nguồn -> cần rotate key cũ)
const API_KEY = process.env.CASSO_API_KEY;
const API_GET_PAID = "https://oauth.casso.vn/v2/transactions";

let getListGDPR = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await fetch(API_GET_PAID, {
        headers: {
          Authorization: `apikey ${API_KEY}`,
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      resolve({
        errCode: 0,
        data: data.data.records,
      });
    } catch (error) {
      console.error("Error fetching GDPR data:", error);
      resolve({
        errCode: 1,
        errMessage: "Failed to fetch GDPR data",
      });
    }
  });
};

const PAYABLE_STATUSES = ["S2", "S3", "S6"];

/**
 * Ghi nhận thanh toán online cho booking (PayOS/Casso). IDEMPOTENT:
 *  - cùng gatewayRef (UNIQUE) đã xử lý => 'duplicate', không làm gì thêm;
 *  - booking đã S5 và đã có Payment đã trả => 'duplicate'.
 * Trả { status: 'ok' | 'duplicate' | 'not_found' | 'invalid_state' | 'amount_mismatch' }.
 */
let updateBookingPaymentStatus = async (bookingId, amount, transactionDateTime, io, gatewayRef) => {
  const id = Number(bookingId);
  if (!Number.isSafeInteger(id) || id <= 0) return { status: "not_found" };
  const paidAmount = Number(amount) || 0;
  const ref = gatewayRef ? String(gatewayRef).slice(0, 64) : null;

  let result;
  try {
    result = await db.sequelize.transaction(async (t) => {
      const booking = await db.Booking.findOne({
        where: { id },
        include: [{ model: db.User, as: "patientData", attributes: ["id", "email", "firstName", "lastName"] }],
        transaction: t,
        lock: { level: t.LOCK.UPDATE, of: db.Booking },
        raw: false,
      });
      if (!booking) return { status: "not_found" };

      if (ref) {
        const dup = await db.Payment.findOne({ where: { gatewayRef: ref }, attributes: ["id"], transaction: t, raw: true });
        if (dup) return { status: "duplicate" };
      }

      const exist = await db.Payment.findOne({ where: { bookingId: id }, transaction: t, lock: t.LOCK.UPDATE, raw: true });
      if (booking.statusId === "S5" && exist && exist.paidAt) return { status: "duplicate" };
      if (!PAYABLE_STATUSES.includes(booking.statusId)) return { status: "invalid_state", current: booking.statusId };

      // Số tiền thực nhận phải đủ số tiền hoá đơn đã lập
      if (exist && Number(exist.amount) > 0 && paidAmount < Number(exist.amount)) {
        return { status: "amount_mismatch", expected: Number(exist.amount), got: paidAmount };
      }

      const breakdown = parseBreakdown(exist && exist.description);
      await db.Booking.update({ statusId: "S5" }, { where: { id }, transaction: t });
      await upsertPayment(
        id,
        {
          cashier: "Cổng PayOS / Casso",
          paidAt: parseTxnTime(transactionDateTime),
          amount: paidAmount,
          paymentMethod: "TRANSFER_QR",
          gatewayRef: ref,
          description: JSON.stringify({
            examinationFee: breakdown.examinationFee || paidAmount,
            medicineFee: breakdown.medicineFee || 0,
            totalFee: paidAmount,
            medicinesCount: breakdown.medicinesCount || 0,
            note: `Thanh toán trực tuyến mã BOOKING${id}`,
          }),
        },
        t
      );
      const patient = booking.patientData ? booking.patientData.get({ plain: true }) : null;
      return { status: "ok", doctorId: booking.doctorId, patient };
    });
  } catch (e) {
    // Hai webhook song song cùng gatewayRef: UNIQUE chặn bản thứ hai
    if (e && e.name === "SequelizeUniqueConstraintError") return { status: "duplicate" };
    throw e;
  }
  if (result.status !== "ok") return result;

  const patient = result.patient;
  const patientName = patient ? `${patient.firstName || ""} ${patient.lastName || ""}`.trim() : "";
  // Gửi email xác nhận đã thanh toán
  try {
    await emailServices.sendEmailPaymentSuccess({
      reciverEmail: patient && patient.email,
      patientName,
      amount: amount,
      time: transactionDateTime,
      language: "vi",
    });
  } catch (e) {
    console.error("Gửi email xác nhận thanh toán thất bại:", e);
  }
  // Emit PAYMENT_CONFIRMED to cashier and patient
  try {
    const onlineUsers = getOnlineUsers();
    const notificationData = {
      bookingId: id,
      patientName,
      amount: amount,
      transactionDateTime: transactionDateTime,
      doctorId: result.doctorId,
    };
    const cashiers = onlineUsers.filter((user) => user.roleId === "R4");
    const onlinePatient = onlineUsers.find((user) => user.id === (patient ? patient.id : null));
    if (io) {
      cashiers.forEach((cashier) => {
        io.to(cashier.socketId).emit("PAYMENT_CONFIRMED", { ...notificationData, role: "cashier" });
      });
      if (onlinePatient) {
        io.to(onlinePatient.socketId).emit("PAYMENT_CONFIRMED", { ...notificationData, role: "patient" });
      }
    }
  } catch (e) {
    console.error("Emit PAYMENT_CONFIRMED thất bại:", e);
  }
  if (patient) {
    await pushToUser(
      patient.id,
      "Thanh toán thành công",
      `Lịch hẹn khám của bạn (Mã: BOOKING${id}) đã được thanh toán thành công số tiền ${amount} VNĐ.`,
      { bookingId: String(id), status: "paid" }
    );
  }
  return result;
};

/** Mã giao dịch phía cổng để chống xử lý trùng: PayOS (reference/paymentLinkId/orderCode) hoặc Casso (id/tid). */
const gatewayRefOf = (p) => {
  if (!p) return null;
  const payosRef = p.reference || p.paymentLinkId || (p.orderCode !== undefined && p.orderCode !== null ? p.orderCode : null);
  if (payosRef) return `PAYOS:${payosRef}`;
  const cassoRef = p.tid || p.id;
  if (cassoRef) return `CASSO:${cassoRef}`;
  return null;
};

const REASON_MESSAGES = {
  not_found: (id) => `Booking ${id} not found`,
  invalid_state: (id) => `Booking ${id} is not in a payable state`,
  amount_mismatch: (id) => `Amount for booking ${id} is lower than the invoice`,
};

// Get all payment and update booking status (Hỗ trợ PayOS và Casso Webhook)
let postConfirmPayment = async (inputData, io) => {
  let paymentData = null;

  // 1. Nếu là webhook từ PayOS có kèm signature
  if (inputData && inputData.signature && payOS) {
    try {
      paymentData = await payOS.webhooks.verify(inputData);
      console.log("✅ PayOS webhook verified successfully:", paymentData);
    } catch (verifyError) {
      console.warn("⚠️ PayOS webhook signature verification failed:", verifyError.message);
      paymentData = inputData.data || inputData;
    }
  } else if (inputData && inputData.data) {
    // 2. Format tiêu chuẩn: inputData.data (PayOS hoặc Casso)
    paymentData = inputData.data;
  } else {
    paymentData = inputData;
  }

  // Xử lý khi PayOS kiểm tra kết nối webhook (Test Webhook)
  if (paymentData && (paymentData.description === "test" || paymentData.orderCode === 123 || paymentData.isTest)) {
    return { error: 0, errCode: 0, message: "PayOS test webhook received successfully" };
  }

  if (!paymentData) {
    return { error: 1, errCode: 1, message: "No payment data provided" };
  }

  const description = paymentData.description || "";
  const match = String(description).match(/BOOKING[:\s#\-_]*(\d+)/i);

  if (!match) {
    console.warn("Không tìm thấy bookingId trong description:", description);
    return { error: 0, errCode: 0, message: "Webhook processed (no matching booking pattern)" };
  }

  const bookingId = match[1];
  const amount = paymentData.amount;
  const transactionDateTime = paymentData.transactionDateTime || paymentData.when || new Date().toISOString();

  const res = await updateBookingPaymentStatus(bookingId, amount, transactionDateTime, io, gatewayRefOf(paymentData));

  if (res.status === "ok" || res.status === "duplicate") {
    return {
      error: 0,
      errCode: 0,
      errMessage: res.status === "ok" ? "Payment confirmed and booking updated successfully" : "Transaction already processed",
      message: "Success",
    };
  }
  return { error: 0, errCode: 2, errMessage: REASON_MESSAGES[res.status](bookingId) };
};

// Create PayOS Payment Link
let createPayOSPaymentLink = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!payOS) {
        return resolve({
          errCode: -1,
          errMessage: "PayOS chưa được cấu hình Client ID, API Key hoặc Checksum Key trong file .env",
        });
      }

      if (!data.bookingId || !data.amount) {
        return resolve({
          errCode: 1,
          errMessage: "Missing required parameters: bookingId or amount",
        });
      }

      const { bookingId, amount, description } = data;
      // orderCode phải là số <= 9007199254740991 và duy nhất cho mỗi link.
      // Booking id giờ là số nguyên: orderCode = id * 1e6 + 6 chữ số ngẫu nhiên (suy ra được booking, vẫn không trùng khi tạo lại link).
      const idNum = Number(bookingId);
      const suffix = Math.floor(100000 + Math.random() * 900000);
      const orderCode =
        Number.isSafeInteger(idNum) && idNum > 0 && idNum * 1e6 + suffix <= Number.MAX_SAFE_INTEGER
          ? idNum * 1e6 + suffix
          : Number(String(Date.now()).slice(-6) + Math.floor(1000 + Math.random() * 9000));
      const desc = (description || `BOOKING${bookingId}`).slice(0, 25);

      const returnUrl = data.returnUrl || `${process.env.URL_REACT || "http://localhost:3000"}/payment-success`;
      const cancelUrl = data.cancelUrl || `${process.env.URL_REACT || "http://localhost:3000"}/payment-cancel`;

      const paymentBody = {
        orderCode: orderCode,
        amount: Number(amount) || 10000,
        description: desc,
        cancelUrl: cancelUrl,
        returnUrl: returnUrl,
      };

      const paymentLinkRes = await payOS.paymentRequests.create(paymentBody);

      resolve({
        errCode: 0,
        errMessage: "Create payment link succeed",
        checkoutUrl: paymentLinkRes.checkoutUrl,
        qrCode: paymentLinkRes.qrCode,
        data: paymentLinkRes,
      });
    } catch (e) {
      console.error("Lỗi tạo link thanh toán PayOS:", e);
      resolve({
        errCode: 1,
        errMessage: e.message || "Tạo link thanh toán thất bại",
      });
    }
  });
};

// Handle PayOS Webhook
let handlePayOSWebhook = async (webhookBody, io) => {
  console.log("👉 [PayOS Webhook] Nhận dữ liệu webhook:", JSON.stringify(webhookBody, null, 2));

  if (!webhookBody) {
    return { errCode: 1, errMessage: "Missing webhook data" };
  }

  if (!payOS) {
    return { errCode: -1, errMessage: "PayOS is not initialized" };
  }

  // Test webhook của PayOS (kiểm tra kết nối): không có tác dụng phụ nên xử lý trước khi xác thực chữ ký
  const rawData = webhookBody.data || {};
  if (rawData.orderCode === 123 || rawData.description === "test" || webhookBody.description === "test") {
    console.log("ℹ️ [PayOS Webhook] Xử lý test webhook");
    return { error: 0, errCode: 0, message: "PayOS test webhook received successfully" };
  }

  // BẮT BUỘC xác thực chữ ký. Sai chữ ký => từ chối, KHÔNG dùng dữ liệu chưa xác thực
  // (trước đây vẫn chạy tiếp bằng body gốc nên ai cũng có thể giả webhook để đánh dấu "đã thanh toán").
  let verifiedData = null;
  try {
    verifiedData = await payOS.webhooks.verify(webhookBody);
    console.log("✅ [PayOS Webhook] Signature verified thành công");
  } catch (verifyError) {
    console.warn("⛔ [PayOS Webhook] Chữ ký không hợp lệ, từ chối:", verifyError.message);
    return { errCode: 6, errMessage: "Invalid webhook signature" };
  }

  const isSuccess =
    webhookBody.success === true ||
    webhookBody.code === "00" ||
    webhookBody.code === 0 ||
    (verifiedData &&
      (verifiedData.code === "00" ||
        verifiedData.code === 0 ||
        String(verifiedData.desc).toLowerCase() === "success" ||
        String(verifiedData.desc).toLowerCase().includes("thành công")));

  if (!isSuccess) {
    console.warn("⚠️ [PayOS Webhook] Giao dịch không thành công:", verifiedData);
    return { errCode: 4, errMessage: "Transaction was not successful" };
  }

  const rawDescription =
    (verifiedData && verifiedData.description) ||
    webhookBody.description ||
    (webhookBody.data && webhookBody.data.description) ||
    "";

  console.log("👉 [PayOS Webhook] Nội dung giao dịch (description):", rawDescription);

  // Hỗ trợ BOOKING123, BOOKING 123, BOOKING: 123, BOOKING#123, BOOKING-123 (booking id là số nguyên)
  const match = String(rawDescription).match(/BOOKING[:\s#\-_]*(\d+)/i);
  let bookingId = match ? match[1] : null;

  if (!bookingId) {
    console.warn("⚠️ [PayOS Webhook] Không tìm thấy bookingId trong:", rawDescription);
    return { errCode: 2, errMessage: "No bookingId found in description" };
  }

  console.log("👉 [PayOS Webhook] Nhận diện bookingId:", bookingId);

  const amount = verifiedData.amount || webhookBody.amount || (webhookBody.data && webhookBody.data.amount) || 0;
  const transactionDateTime = verifiedData.transactionDateTime || new Date().toISOString();

  const res = await updateBookingPaymentStatus(bookingId, amount, transactionDateTime, io, gatewayRefOf(verifiedData));

  if (res.status === "ok" || res.status === "duplicate") {
    console.log("✅ [PayOS Webhook] Thanh toán TRANSFER_QR cho booking:", bookingId, `(${res.status})`);
    return {
      error: 0,
      errCode: 0,
      errMessage:
        res.status === "ok"
          ? "PayOS payment verified and booking updated successfully"
          : "Transaction already processed",
      message: "Success",
    };
  }
  console.warn("⚠️ [PayOS Webhook] Không xử lý được booking:", bookingId, res.status);
  if (res.status === "not_found") return { errCode: 3, errMessage: "Booking not found" };
  return { errCode: 5, errMessage: REASON_MESSAGES[res.status](bookingId) };
};

module.exports = {
  getTopDoctorHomeServices: getTopDoctorHomeServices,
  getAllDoctorServices: getAllDoctorServices,
  saveDetailInforDoctor: saveDetailInforDoctor,
  getDetailDoctorByIdServices: getDetailDoctorByIdServices,
  bulkCreateScheduleServices: bulkCreateScheduleServices,
  getScheduleDoctorByDateServices: getScheduleDoctorByDateServices,
  getExtraDoctorInforByIdServices: getExtraDoctorInforByIdServices,
  getProfileDoctorByIdServices: getProfileDoctorByIdServices,
  getListPatientForDoctor: getListPatientForDoctor,
  sendRemedyService: sendRemedyService,
  getListGDPR: getListGDPR,
  postConfirmPayment: postConfirmPayment,
  postMedicalAppointmentStatus: postMedicalAppointmentStatus,
  sendPayment: sendPayment,
  createPayOSPaymentLink: createPayOSPaymentLink,
  handlePayOSWebhook: handlePayOSWebhook,
  getPrescriptionPDFBase64: getPrescriptionPDFBase64,
};
