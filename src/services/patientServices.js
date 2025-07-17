import { where } from "sequelize";
import db from "../models/index";
require("dotenv").config();
import emailService from "./emailServices";
import { v4 as uuidv4 } from "uuid";

let buildUrlEmail = (doctorId, token) => {
  let result = `${process.env.URL_REACT}/verify-booking?token=${token}&doctorId=${doctorId}`;
  return result;
};
let postBookAppointmentServices = async (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (
        !data.email ||
        !data.doctorId ||
        !data.timeType ||
        !data.date ||
        !data.fullName ||
        !data.selectedGender ||
        !data.address
      ) {
        resolve({
          errCode: 1,
          errMessage: "Không có tham số truyền vào!",
        });
      } else {
        let token = uuidv4();
        await emailService.sendSimpleEmail({
          reciverEmail: data.email,
          patientName: data.fullName,
          time: data.timeString,
          doctorName: data.doctorName,
          language: data.language,
          redirectLink: buildUrlEmail(data.doctorId, token),
        });

        let [user, created] = await db.User.findOrCreate({
          where: { email: data.email },
          defaults: {
            email: data.email,
            roleId: "R3",
            firstName: data.fullName,
            phoneNumber: data.phoneNumber,
            address: data.address,
            gender: data.selectedGender,
          },
        });

        if (!created) {
          // Nếu user đã tồn tại, cập nhật lại thông tin
          await db.User.update(
            {
              roleId: "R3",
              firstName: data.fullName,
              address: data.address,
              gender: data.selectedGender,
              phoneNumber: data.phoneNumber,
            },
            {
              where: { email: data.email },
            }
          );
        }

        // Đặt lịch nếu chưa có lịch cùng bác sĩ, cùng ngày và khung giờ
        await db.Booking.findOrCreate({
          where: {
            patientId: user.id,
            doctorId: data.doctorId,
            date: data.date,
            timeType: data.timeType,
          },
          defaults: {
            statusId: "S1",
            doctorId: data.doctorId,
            patientId: user.id,
            date: data.date,
            timeType: data.timeType,
            token: token,
          },
        });

        resolve({
          errCode: 0,
          errMessage: "Save infor patient succeed!",
        });
      }
    } catch (error) {
      reject(error);
    }
  });
};

let postVerifyBookAppointment = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.token || !data.doctorId) {
        resolve({
          errCode: 1,
          errMessage: "Missing parameter",
        });
      } else {
        let appointment = await db.Booking.findOne({
          where: {
            doctorId: data.doctorId,
            token: data.token,
            statusId: "S1",
          },
          raw: false,
        });
        if (appointment) {
          appointment.statusId = "S2";
          await appointment.save();

          resolve({
            errCode: 0,
            errMessage: "Update the appointment succeed",
          });
        } else {
          resolve({
            errCode: 2,
            errMessage: "Appointment has been activated or does not exist",
          });
        }
      }
    } catch (e) {
      reject(e);
    }
  });
};
module.exports = {
  postBookAppointmentServices: postBookAppointmentServices,
  postVerifyBookAppointment: postVerifyBookAppointment,
};
