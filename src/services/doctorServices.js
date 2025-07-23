import { Model, Op, where } from "sequelize";
import db from "../models";
import { raw } from "body-parser";
require("dotenv").config();
import _, { includes, last } from "lodash";
import emailServices from "./emailServices";
import nodeHtmlToImage from "node-html-to-image";
const MAX_NUMBER_SCHEDULE = process.env.MAX_NUMBER_SCHEDULE;
const https = require("https");
const axios = require("axios");
const fetch = require("node-fetch");
const puppeteer = require("puppeteer");
const getPrescriptionPDFBase64 = async ({
  patientName,
  doctorName,
  date,
  medicines,
}) => {
  // Tạo HTML template cho đơn thuốc
  const html = `
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          h1 { color: #2d6a4f; text-align: center; }
          .info { margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #333; padding: 8px; text-align: left; }
          th { background: #e9ecef; }
          .footer { margin-top: 40px; text-align: center; color: #555; }
        </style>
      </head>
      <body>
        <h1>ĐƠN THUỐC</h1>
        <div class="info">
          <div>👤 Bệnh nhân: <b>${patientName || ""}</b></div>
          <div>🩺 Bác sĩ: <b>${doctorName || ""}</b></div>
          <div>📅 Ngày khám: <b>${date || ""}</b></div>
        </div>
        <div>
          <b>📋 Danh sách thuốc:</b>
          <table>
            <tr>
              <th>STT</th>
              <th>Tên thuốc</th>
            </tr>
            ${(medicines || [])
              .map(
                (m, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${m.label}</td>
              </tr>
            `
              )
              .join("")}
          </table>
        </div>
        <div class="footer">Cảm ơn bạn đã sử dụng dịch vụ!</div>
      </body>
    </html>
  `;

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
let getTopDoctorHomeServices = (limitInput) => {
  return new Promise(async (resolve, reject) => {
    try {
      let doctors = await db.User.findAll({
        limit: limitInput,
        where: { roleId: "R2" },
        order: [["createdAt", "DESC"]],
        attributes: {
          exclude: ["password", "image"],
        },
        include: [
          {
            model: db.AllCode,
            as: "positionData",
            attributes: ["valueEn", "valueVi"],
          },
          {
            model: db.AllCode,
            as: "genderData",
            attributes: ["valueEn", "valueVi"],
          },
        ],
        raw: true,
        nest: true,
      });

      resolve({
        errCode: 0,
        data: doctors,
      });
    } catch (error) {
      reject(error);
    }
  });
};
let getAllDoctorServices = () => {
  return new Promise(async (resolve, reject) => {
    try {
      let doctors = await db.User.findAll({
        where: { roleId: "R2" },
        attributes: {
          exclude: ["password","image"],
        },
      });
      // if (doctors && doctors.length > 0) {
      //   doctors.map((item) => {
      //     item.image = new Buffer(item.image, "base64").toString("binary");
      //     return item;
      //   });
      // }
      resolve({
        errCode: 0,
        data: doctors,
      });
    } catch (error) {
      reject(error);
    }
  });
};
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
    // "specialtyId",
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
  return {
    isValid: isValid,
    element: element,
  };
};

let saveDetailInforDoctor = (inputData) => {
  return new Promise(async (resolve, reject) => {
    try {
      let checkObj = checkRequiredFields(inputData);
      if (checkObj.isValid === false) {
        resolve({
          errCode: 1,
          errMessage: `Missing parameter:${checkObj.element}`,
        });
      } else {
        //upsert to markdown
        if (inputData.action === "CREATE") {
          await db.Markdown.create({
            contentHTML: inputData.contentHTML,
            contentMarkdown: inputData.contentMarkdown,
            description: inputData.description,
            doctorId: inputData.doctorId,
          });
        } else if (inputData.action === "UPDATE") {
          let doctorMarkdown = await db.Markdown.findOne({
            where: { doctorId: inputData.doctorId },
            raw: false,
          });
          if (doctorMarkdown) {
            doctorMarkdown.contentHTML = inputData.contentHTML;
            doctorMarkdown.contentMarkdown = inputData.contentMarkdown;
            doctorMarkdown.description = inputData.description;
            doctorMarkdown.updateAt = new Date();

            await doctorMarkdown.save();
          }
        }

        //upsert to doctor _ infor table
        let doctorInfor = await db.Doctor_Infor.findOne({
          where: {
            doctorId: inputData.doctorId,
          },
          raw: false,
        });

        if (doctorInfor) {
          //update
          doctorInfor.doctorId = inputData.doctorId;
          doctorInfor.priceId = inputData.selectedPrice;
          doctorInfor.provinceId = inputData.selectedProvince;
          doctorInfor.paymentId = inputData.selectedPayment;

          doctorInfor.nameClinic = inputData.nameClinic;
          doctorInfor.addressClinic = inputData.addressClinic;
          doctorInfor.note = inputData.note;
          doctorInfor.specialtyId = inputData.specialtyId;
          doctorInfor.clinicId = inputData.clinicId ? inputData.clinicId : null;

          await doctorInfor.save();
        } else {
          //create
          try {
            await db.Doctor_Infor.create({
              doctorId: inputData.doctorId,
              priceId: inputData.selectedPrice,
              provinceId: inputData.selectedProvince,
              paymentId: inputData.selectedPayment,

              nameClinic: inputData.nameClinic,
              addressClinic: inputData.addressClinic,
              note: inputData.note,
              specialtyId: inputData.specialtyId,
              clinicId: inputData.clinicId !== "" ? inputData.clinicId : null,
            });
          } catch (error) {
            console.error("Error creating doctor info:", error);
          }
        }
        resolve({
          errCode: 0,
          errMessage: "Save infor doctor succeed!",
        });
      }
    } catch (e) {
      reject(e);
    }
  });
};
let getDetailDoctorByIdServices = (inputId) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!inputId) {
        resolve({
          errCode: 1,
          errMessage: " Khong co tham so truyen vao",
        });
      } else {
        let doctors = await db.User.findOne({
          where: { id: inputId },
          attributes: {
            exclude: ["password"],
          },
          include: [
            {
              model: db.Markdown,
              attributes: ["description", "contentHTML", "contentMarkdown"],
            },
            {
              model: db.AllCode,
              as: "positionData",
              attributes: ["valueEn", "valueVi"],
            },
            {
              model: db.Doctor_Infor,
              attributes: {
                exclude: ["id", "doctorId"],
              },
              include: [
                {
                  model: db.AllCode,
                  as: "priceTypeData",
                  attributes: ["valueEn", "valueVi"],
                },
                {
                  model: db.AllCode,
                  as: "paymentTypeData",
                  attributes: ["valueEn", "valueVi"],
                },
                {
                  model: db.AllCode,
                  as: "provinceTypeData",
                  attributes: ["valueEn", "valueVi"],
                },
              ],
            },
          ],
          raw: false,
          nest: true,
        });
        if (doctors && doctors.image) {
          doctors.image = new Buffer(doctors.image, "base64").toString(
            "binary"
          );
        }
        if (!doctors) doctors = {};
        resolve({
          errCode: 0,
          data: doctors,
        });
      }
    } catch (error) {
      reject(error);
    }
  });
};
let bulkCreateScheduleServices = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.arrSchedule || !data.doctorId || !data.formatedDate) {
        resolve({
          errCode: 1,
          errMessage: "Missing required param !",
        });
      } else {
        let schedule = data.arrSchedule;

        if (schedule && schedule.length > 0) {
          schedule = schedule.map((item) => {
            item.maxNumber = MAX_NUMBER_SCHEDULE;
            return item;
          });
        }
        // console.log("schedule", schedule)
        let existing = await db.Schedule.findAll({
          where: { doctorId: data.doctorId, date: data.formatedDate },
          attributes: ["doctorId", "maxNumber", "timeType", "date"],
          raw: true,
        });
        // console.log("existing", existing)
        let toCreate = _.differenceWith(schedule, existing, (a, b) => {
          return a.timeType === b.timeType && +a.date === +b.date;
        });
        if (toCreate && toCreate.length > 0) {
          await db.Schedule.bulkCreate(toCreate);
        }

        resolve({
          errCode: 0,
          errMessage: "OK",
        });
      }
    } catch (error) {
      reject(error);
    }
  });
};
let getScheduleDoctorByDateServices = (doctorId, date) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!doctorId || !date) {
        resolve({
          errCode: 1,
          errMessage: "Không có tham số truyền vào",
        });
      } else {
        let dataSchedule = await db.Schedule.findAll({
          where: {
            doctorId: doctorId,
            date: date,
          },
          include: [
            {
              model: db.AllCode,
              as: "timeTypeData",
              attributes: ["valueEn", "valueVi"],
            },
            {
              model: db.User,
              as: "doctorData",
              attributes: ["firstName", "lastName"],
            },
          ],
          raw: false,
        });
        console.log(dataSchedule);
        resolve({
          errCode: 0,
          data: dataSchedule,
        });
      }
    } catch (error) {
      reject(error);
    }
  });
};
let getExtraDoctorInforByIdServices = (inputId) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!inputId) {
        resolve({
          errCode: 1,
          errMessage: " Khong co tham so truyen vao",
        });
      } else {
        let data = await db.Doctor_Infor.findOne({
          where: { doctorId: inputId },
          attributes: {
            exclude: ["id", "doctorId"],
          },
          include: [
            {
              model: db.AllCode,
              as: "priceTypeData",
              attributes: ["valueEn", "valueVi"],
            },
            {
              model: db.AllCode,
              as: "paymentTypeData",
              attributes: ["valueEn", "valueVi"],
            },
            {
              model: db.AllCode,
              as: "provinceTypeData",
              attributes: ["valueEn", "valueVi"],
            },
          ],
          raw: false,
          nest: true,
        });

        if (!data) data = {};
        resolve({
          errCode: 0,
          data: data,
        });
      }
    } catch (error) {
      reject(error);
    }
  });
};
let getProfileDoctorByIdServices = (inputId) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!inputId) {
        resolve({
          errCode: 1,
          errMessage: " Khong co tham so truyen vao",
        });
      } else {
        let doctors = await db.User.findOne({
          where: { id: inputId },
          attributes: {
            exclude: ["password"],
          },
          include: [
            {
              model: db.Markdown,
              attributes: ["description", "contentHTML", "contentMarkdown"],
            },
            {
              model: db.AllCode,
              as: "positionData",
              attributes: ["valueEn", "valueVi"],
            },
            {
              model: db.Doctor_Infor,
              attributes: {
                exclude: ["id", "doctorId"],
              },
              include: [
                {
                  model: db.AllCode,
                  as: "priceTypeData",
                  attributes: ["valueEn", "valueVi"],
                },
                {
                  model: db.AllCode,
                  as: "paymentTypeData",
                  attributes: ["valueEn", "valueVi"],
                },
                {
                  model: db.AllCode,
                  as: "provinceTypeData",
                  attributes: ["valueEn", "valueVi"],
                },
              ],
            },
          ],
          raw: false,
          nest: true,
        });
        if (doctors && doctors.image) {
          doctors.image = new Buffer(doctors.image, "base64").toString(
            "binary"
          );
        }
        if (!doctors) doctors = {};
        resolve({
          errCode: 0,
          data: doctors,
        });
      }
    } catch (error) {
      reject(error);
    }
  });
};
let getListPatientForDoctor = (doctorId, roleId, date) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!doctorId || !roleId || !date) {
        resolve({
          errCode: 1,
          errMessage: "Missing required parameters",
        });
      } else {
        let data = {};
        if (roleId === "R4") {
          data = await db.Booking.findAll({
            where: {
              statusId: {
                [Op.in]: ["S5", "S6"],
              },
            },
            include: [
              {
                model: db.User,
                as: "patientData",
                attributes: ["firstName", "email", "address", "gender"],
                include: [
                  {
                    model: db.AllCode,
                    as: "genderData",
                    attributes: ["valueEn", "valueVi"],
                  },
                ],
              },
              {
                model: db.AllCode,
                as: "timeTypeDataPatient",
                attributes: ["valueEn", "valueVi"],
              },
            ],
            raw: false,
            nest: true,
          });
        } else {
          data = await db.Booking.findAll({
            where: {
              statusId: {
                [Op.in]: ["S2", "S3"],
              },
              doctorId: doctorId,
              date: date,
            },
            include: [
              {
                model: db.User,
                as: "patientData",
                attributes: ["firstName", "email", "address", "gender"],
                include: [
                  {
                    model: db.AllCode,
                    as: "genderData",
                    attributes: ["valueEn", "valueVi"],
                  },
                ],
              },
              {
                model: db.AllCode,
                as: "timeTypeDataPatient",
                attributes: ["valueEn", "valueVi"],
              },
            ],
            raw: false,
            nest: true,
          });
        }

        resolve({
          errCode: 0,
          data: data,
        });
      }
    } catch (error) {
      reject(error);
    }
  });
};

let sendRemedy = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.email || !data.doctorId || !data.patientId || !data.timeType) {
        resolve({
          errCode: 1,
          errMessage: "Missing required parameters",
        });
      } else {
        //update status booking
        let appointment = await db.Booking.findOne({
          where: {
            doctorId: data.doctorId,
            patientId: data.patientId,
            timeType: data.timeType,
            statusId: "S2",
          },
          raw: false,
        });
        if (appointment) {
          appointment.statusId = "S3"; // S3 means sent remedy
          await appointment.save();
        }

        // Tạo file PDF đơn thuốc từ danh sách thuốc đã chọn
        let medicines = data.selectedMedicines || [];
        let pdfBase64 = await getPrescriptionPDFBase64({
          patientName: data.patientName,
          doctorName: data.doctorName,
          date: data.date,
          medicines,
        });
        data.imgBase64 = `data:application/pdf;base64,${pdfBase64}`;
        data.bookingId = appointment.id;
        data.amount = data.totalPrice;
        //send email remedy kèm file PDF đơn thuốc
        await emailServices.sendAttachment(data);
        resolve({
          errCode: 0,
          errMessage: "Send remedy succeed!",
        });
      }
    } catch (error) {
      reject(error);
    }
  });
};
let postMedicalAppointmentStatus = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.doctorId || !data.patientId || !data.timeType) {
        resolve({
          errCode: 1,
          errMessage: "Missing required parameters",
        });
      } else {
        //update status booking
        let appointment = await db.Booking.findOne({
          where: {
            doctorId: data.doctorId,
            patientId: data.patientId,
            timeType: data.timeType,
            statusId: "S3", // Status Done
          },
          raw: false,
        });
        if (appointment) {
          appointment.statusId = "S6"; // Status UnPaid
          await appointment.save();
        }
        resolve({
          errCode: 0,
          errMessage: "Update medical appointments succeed!",
        });
      }
    } catch (error) {
      reject(error);
    }
  });
};
let sendPayment = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.email || !data.doctorId || !data.patientId || !data.timeType) {
        resolve({
          errCode: 1,
          errMessage: "Missing required parameters",
        });
      } else {
        //update status booking
        let appointment = await db.Booking.findOne({
          where: {
            doctorId: data.doctorId,
            patientId: data.patientId,
            timeType: data.timeType,
            statusId: "S6",
          },
          raw: false,
        });
        if (appointment) {
          appointment.statusId = "S5";
          await appointment.save();

          let cashierRecord = await db.Cashier.create({
            cashier: data.cashier,
            date: data.date,
            totalPrice: data.totalPrice,
            description: data.description,
            bookingId: appointment.id,
          });
          console.log("data cashierRecord", cashierRecord);
        }

        const dataSend = {
          reciverEmail: data.email,
          patientName: data.patientName,
          amount: data.totalPrice,
          time: data.date,
          language: "vi",
        };
        await emailServices.sendEmailPaymentSuccess(dataSend);
        resolve({
          errCode: 0,
          errMessage: "Send remedy succeed!",
        });
      }
    } catch (error) {
      reject(error);
    }
  });
};
const API_KEY =
  "AK_CS.847d23a062bd11f0b2ed09df87a53c97.WNGep6eCqDZZ8uteyJpi2cNGZrRNUzS37pnVMek7H8oxhcPOMnPM1w3wSTH5ItDzBusmpL0W";
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
      console.log("DATA:", data);
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
// Get all payment and update booking status
let postConfirmPayment = (inputData) => {
  console.log("inputData", inputData);
  return new Promise(async (resolve, reject) => {
    if (inputData.error === 0) {
      const description = inputData.data.description || "";
      const match = description.match(/BOOKING([a-zA-Z0-9]+)/);
      if (!match) {
        resolve({
          errCode: 1,
          errMessage: "No bookingId found in description",
        });
      }
      const bookingId = match[1];
      // Tìm booking và cập nhật trạng thái
      const booking = await db.Booking.findOne({
        where: { id: bookingId },
        include: [
          {
            model: db.User,
            as: "patientData",
            attributes: ["email", "firstName"],
          },
        ],
        raw: false,
      });
      if (booking) {
        booking.statusId = "S5";
        await booking.save();
        // Gửi email xác nhận đã thanh toán
        try {
          const patient = booking.patientData;
          const dataSend = {
            reciverEmail: patient.email,
            patientName: patient.firstName,
            amount: inputData.data.amount,
            time: inputData.data.transactionDateTime,
            language: "vi",
          };
          await emailServices.sendEmailPaymentSuccess(dataSend);
        } catch (e) {
          // Không làm gián đoạn flow nếu gửi email lỗi
          console.error("Gửi email xác nhận thanh toán thất bại:", e);
        }
        resolve({
          errCode: 0,
          errMessage: "Payment confirmed and booking updated successfully",
        });
      } else {
        resolve({
          errCode: 2,
          errMessage: "Booking not found",
        });
      }
    }
  });
};

//Test casso
// let postConfirmPayment = (inputData) => {
//   console.log("inputData", inputData);
//   return new Promise(async (resolve, reject) => {
//     if (inputData.error === 0) {
//       const description = inputData.data.description || "";
//       resolve({
//         errCode: 0,
//         errMessage: "Oke",
//       });
//     }
//   });
// };

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
  sendRemedy: sendRemedy,
  getListGDPR: getListGDPR,
  postConfirmPayment: postConfirmPayment,
  postMedicalAppointmentStatus: postMedicalAppointmentStatus,
  sendPayment: sendPayment,
};
