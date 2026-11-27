import db from "../models/index";
require("dotenv").config();
import emailService from "./emailServices";
import bookingService from "./bookingService";
import { dateToMs } from "../utils/dateKey";
import { historyOf } from "../utils/legacyShapes";

let buildUrlEmail = (doctorId, token) => {
  let result = `${process.env.URL_REACT}/verify-booking?token=${token}&doctorId=${doctorId}`;
  return result;
};
/**
 * Đặt lịch: giữ chỗ trong transaction (bookingService) -> commit -> mới gửi email xác nhận.
 * Nếu gửi email lỗi thì huỷ giữ chỗ để không kẹt slot.
 */
let postBookAppointmentServices = async (data) => {
  const result = await bookingService.createBooking(data);
  if (result.errCode !== 0) return result;

  const { booking } = result;
  try {
    await emailService.sendSimpleEmail({
      reciverEmail: data.email,
      patientName: data.fullName,
      time: data.timeString,
      doctorName: data.doctorName,
      language: data.language,
      redirectLink: buildUrlEmail(booking.doctorId, booking.token),
    });
  } catch (emailError) {
    console.error("[Booking] Gửi email xác nhận lỗi, nhả slot:", emailError.message);
    await bookingService.cancelBookingById(booking.id, { force: true });
    return {
      errCode: 8,
      errMessage: "Không gửi được email xác nhận, vui lòng thử lại sau!",
    };
  }

  // KHÔNG trả token (token là bí mật xác thực email)
  return {
    errCode: 0,
    errMessage: "Save infor patient succeed!",
    bookingId: booking.id,
    patientId: booking.patientId,
    doctorId: booking.doctorId,
    slotKey: result.slotKey,
    slotStatus: result.slotStatus,
    holdMinutes: result.holdMinutes,
  };
};

let postVerifyBookAppointment = (data) => bookingService.verifyBooking(data || {});

let cancelAppointment = async (bookingId, actor) => {
  if (!bookingId) return { errCode: 1, errMessage: "Missing parameter: bookingId" };
  return bookingService.cancelBookingById(bookingId, { actor });
};
/**
 * Lịch hẹn của một bệnh nhân. Shape giữ như API cũ:
 * { id, doctorName, specialty, time (chuỗi ms của ngày khám), timeType (nhãn), status (nhãn) }
 */
let getPatientAppointments = async (patientId) => {
  try {
    if (!patientId) {
      return { errCode: 1, errMessage: "Missing required parameter: patientId" };
    }
    const appointments = await db.Booking.findAll({
      where: { patientId },
      include: [
        { model: db.AllCode, as: "timeTypeDataPatient", attributes: ["valueEn", "valueVi"] },
        { model: db.AllCode, as: "statusDataPatient", attributes: ["valueEn", "valueVi"] },
        {
          model: db.User,
          as: "doctorData",
          attributes: ["firstName", "lastName"],
          include: [
            {
              model: db.DoctorProfile,
              as: "doctorProfile",
              attributes: ["specialtyId"],
              include: [
                {
                  model: db.Specialty,
                  as: "doctorSpecialty",
                  attributes: ["id"],
                  include: [{ model: db.Specialty_Translation, as: "specialtyData", attributes: ["name", "lang"] }],
                },
              ],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
      raw: false,
    });

    const label = (c) => (c ? c.valueVi || c.valueEn : "");
    return {
      errCode: 0,
      data: appointments.map((b) => {
        const doctor = b.doctorData;
        const translations = (doctor && doctor.doctorProfile && doctor.doctorProfile.doctorSpecialty
          && doctor.doctorProfile.doctorSpecialty.specialtyData) || [];
        const tr = translations.find((t) => t.lang === "vi") || translations[0];
        return {
          id: b.id,
          code: b.code,
          doctorName: doctor ? `${doctor.firstName} ${doctor.lastName}` : "",
          specialty: tr ? tr.name : "N/A",
          time: dateToMs(b.workDate),
          timeType: label(b.timeTypeDataPatient),
          status: label(b.statusDataPatient),
        };
      }),
    };
  } catch (error) {
    console.error("Error fetching patient appointments:", error);
    return { errCode: -1, errMessage: "Error from the server" };
  }
};

/** Lịch sử khám (hồ sơ bệnh án) của bệnh nhân. Shape cũ: dòng History + `User` = bác sĩ khám. */
let getPatientHistory = async (patientId) => {
  if (!patientId) {
    return { errCode: 1, errMessage: "Missing required parameter: patientId" };
  }
  const records = await db.MedicalRecord.findAll({
    where: { patientId },
    include: [{ model: db.User, as: "doctorData", attributes: ["firstName", "lastName"] }],
    order: [["createdAt", "DESC"]],
    raw: false,
  });
  return {
    errCode: 0,
    data: records.map((r) => {
      const plain = r.get({ plain: true });
      return { ...historyOf(plain), User: plain.doctorData || null };
    }),
  };
};
module.exports = {
  postBookAppointmentServices: postBookAppointmentServices,
  postVerifyBookAppointment: postVerifyBookAppointment,
  cancelAppointment: cancelAppointment,
  getPatientAppointments: getPatientAppointments,
  getPatientHistory: getPatientHistory,
};
