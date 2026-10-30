import { Model, Op, where } from "sequelize";
import db from "../models";
import { raw } from "body-parser";
require("dotenv").config();
import _, { includes, last } from "lodash";
import emailServices from "./emailServices";
import nodeHtmlToImage from "node-html-to-image";
import moment, { lang } from "moment";
import { console } from "inspector";
const { getOnlineUsers } = require("../socket/onlineUsers");
const payOS = require("../config/payos");
const { sendPushNotification } = require("../config/firebase");

const path = require("path");
const ejs = require("ejs");
const MAX_NUMBER_SCHEDULE = process.env.MAX_NUMBER_SCHEDULE;
const https = require("https");
const axios = require("axios");
import fetch from "node-fetch";
const puppeteer = require("puppeteer");
let getPrescriptionPDFBase64 = async (data) => {
  // Tạo HTML template cho đơn thuốc
  // process.stdout.write(JSON.stringify(data, null, 2) + "\n");
  // process.stdout.write("Oke");
  const filePath = path.join(__dirname, "../templates/prescription.ejs");
  // process.stdout.write("File path: " + filePath + "\n");
  let html;
  try {
    html = await ejs.renderFile(
      path.join(__dirname, "../templates/prescription.ejs"),
      data
    );
    // process.stdout.write("HTML length: " + (html ? html.length : 0) + "\n");
    // process.stdout.write(
    //   "HTML preview: " + (html ? html.slice(0, 500) : "") + "\n"
    // );
  } catch (err) {
    process.stdout.write("EJS render error:", err);
  }

  // process.stdout.write("html" + html + "\n");

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
let getTopDoctorHomeServices = (limitInput, lang) => {
  // console.log("data", limitInput, lang);
  return new Promise(async (resolve, reject) => {
    try {
      let doctors = await db.User.findAll({
        limit: limitInput,
        where: { roleId: "R2" },
        order: [["createdAt", "DESC"]],
        attributes: {
          exclude: ["password"],
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
          {
            model: db.Doctor_Infor,
            where: { lang: lang },
            include: [
              {
                model: db.Specialty,
                as: "doctorSpecialty",
                include: [
                  {
                    model: db.Specialty_Translation,
                    where: { lang: lang },
                    as: "specialtyData",
                  },
                ],
              },
            ],
          },
        ],
        raw: false,
      });
      if (doctors && doctors.length > 0) {
        doctors.map((item) => {
          item.image = Buffer.from(item.image, "base64").toString("binary");
          return item;
        });
      }

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
          exclude: ["password"],
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
      if (doctors && doctors.length > 0) {
        doctors.map((item) => {
          item.image = Buffer.from(item.image, "base64").toString("binary");
          return item;
        });
      }
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
            lang: inputData.lang,
            contentHTML: inputData.contentHTML,
            contentMarkdown: inputData.contentMarkdown,
            description: inputData.description,
            doctorId: inputData.doctorId,
          });
        } else if (inputData.action === "UPDATE") {
          // Update the specific language entry; if not found, create it
          let doctorMarkdown = await db.Markdown.findOne({
            where: { doctorId: inputData.doctorId, lang: inputData.lang },
            raw: false,
          });
          if (doctorMarkdown) {
            doctorMarkdown.contentHTML = inputData.contentHTML;
            doctorMarkdown.contentMarkdown = inputData.contentMarkdown;
            doctorMarkdown.description = inputData.description;
            doctorMarkdown.updateAt = new Date();
            await doctorMarkdown.save();
          } else {
            await db.Markdown.create({
              lang: inputData.lang,
              contentHTML: inputData.contentHTML,
              contentMarkdown: inputData.contentMarkdown,
              description: inputData.description,
              doctorId: inputData.doctorId,
            });
          }
        }

        //upsert to doctor _ infor table
        let doctorInfor = await db.Doctor_Infor.findOne({
          where: {
            doctorId: inputData.doctorId,
            lang: inputData.lang,
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
          doctorInfor.lang = inputData.lang;

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
              lang: inputData.lang,
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
let getDetailDoctorByIdServices = (inputId, lang) => {
  // process.stdout.write("InputId: " + inputId + ", lang: " + lang + "\n");
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
              attributes: [
                "description",
                "contentHTML",
                "contentMarkdown",
                "lang",
              ],
              where: lang ? { lang } : undefined,
              required: false,
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
              where: lang ? { lang } : undefined,
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
        // process.stdout.write("Doctor data: " + JSON.stringify(doctors) + "\n");

        if (doctors && doctors.image) {
          doctors.image = Buffer.from(doctors.image, "base64").toString(
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
        let existing = await db.Schedule.findAll({
          where: { doctorId: data.doctorId, date: data.formatedDate },
          attributes: ["doctorId", "maxNumber", "timeType", "date"],
          raw: true,
        });
        let toCreate = _.differenceWith(schedule, existing, (a, b) => {
          return a.timeType === b.timeType && +a.date === +b.date;
        });
        if (toCreate && toCreate.length > 0) {
          toCreate = toCreate.map((item) => ({
            ...item,
            status: "available", //gán cho từng schedule
          }));
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
let getScheduleDoctorByDateServices = ({ doctorId, date }) => {
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
        // console.log("dataSchedule", dataSchedule);
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
let getExtraDoctorInforByIdServices = (inputId, lang) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!inputId) {
        resolve({
          errCode: 1,
          errMessage: " Khong co tham so truyen vao",
        });
      } else {
        let data = await db.Doctor_Infor.findOne({
          where: { doctorId: inputId, lang: lang },
          attributes: {
            exclude: ["id", "doctorId"],
          },
          include: [
            {
              model: db.Specialty_Translation,
              where: { lang: lang },
              as: "specialty",
              attributes: ["name"],
            },
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
        // console.log("data", data);

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
let getProfileDoctorByIdServices = (inputId, lang) => {
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
              where: lang ? { lang } : undefined,
              attributes: [
                "description",
                "contentHTML",
                "contentMarkdown",
                "lang",
              ],

              required: false,
            },
            {
              model: db.AllCode,
              as: "positionData",
              attributes: ["valueEn", "valueVi"],
            },
            {
              model: db.Doctor_Infor,
              where: lang ? { lang } : undefined,
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
          doctors.image = Buffer.from(doctors.image, "base64").toString(
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
let getListPatientForDoctor = (doctorId, roleId, date, lang) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!doctorId || !roleId || !date || !lang) {
        resolve({
          errCode: 1,
          errMessage: "Missing required parameters",
        });
      } else {
        let data = {};
        if (roleId === "R4") {
          let whereClause = {
            statusId: {
              [Op.in]: ["S5", "S6"],
            },
          };
          if (date && date !== "ALL" && date !== "all") {
            whereClause.date = date;
          }

          data = await db.Booking.findAll({
            where: whereClause,
            include: [
              {
                model: db.User,
                as: "patientData",
                attributes: [
                  "id",
                  "firstName",
                  "lastName",
                  "email",
                  "phoneNumber",
                  "address",
                  "gender",
                ],
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
              {
                model: db.AllCode,
                as: "statusDataPatient",
                attributes: ["valueEn", "valueVi"],
              },
              {
                model: db.Cashier,
                as: "bookingData",
                required: false,
              },
              {
                model: db.Doctor_Infor,
                as: "doctorInforData",
                required: false,
                where: { lang: lang || "vi" },
                include: [
                  {
                    model: db.User,
                    as: "doctorData",
                    attributes: ["firstName", "lastName"],
                  },
                  {
                    model: db.AllCode,
                    as: "priceTypeData",
                    attributes: ["valueEn", "valueVi"],
                  },
                  {
                    model: db.Specialty_Translation,
                    as: "specialty",
                    required: false,
                    where: { lang: lang || "vi" },
                  },
                ],
              },
            ],
            order: [["createdAt", "DESC"]],
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
                attributes: [
                  "firstName",
                  "lastName",
                  "email",
                  "phoneNumber",
                  "address",
                  "gender",
                ],
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
              {
                model: db.AllCode,
                as: "statusDataPatient",
                attributes: ["valueEn", "valueVi"],
              },
              {
                model: db.Doctor_Infor,
                where: { lang: lang },
                as: "doctorInforData",
                include: [
                  {
                    model: db.User,
                    as: "doctorData",
                    attributes: ["firstName", "lastName"],
                  },
                  {
                    model: db.AllCode,
                    as: "priceTypeData",
                    attributes: ["valueEn", "valueVi"],
                  },
                ],
              },
            ],
            order: [["createdAt", "DESC"]],
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
const buildTimeBooking = (appointmentData) => {
  if (appointmentData && !_.isEmpty(appointmentData)) {
    // process.stdout.write(
    //   "Check appointmentData ??? \n" +
    //     JSON.stringify(appointmentData, null, 2) +
    //     "\n"
    // );
    let time = appointmentData.timeTypeDataPatient.valueVi;

    let date = moment
      .unix(+appointmentData.date / 1000)
      .locale("vi")
      .format("dddd - DD//MM/YYYY");

    return ` ${time} ${date}`;
  }
  return "";
};
let sendRemedyService = (data) => {
  // process.stdout.write("Data: " + JSON.stringify(data, null, 2) + "\n");
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
            statusId: "S2",
          },
          include: [
            {
              model: db.Doctor_Infor,
              as: "doctorInforData",
              include: [
                {
                  model: db.User,
                  as: "doctorData",
                  attributes: ["firstName", "lastName", "phoneNumber"],
                },
                {
                  model: db.AllCode,
                  as: "priceTypeData",
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
          raw: false, // ✅ để có instance
          nest: true, // ✅ để dữ liệu con thành object lồng nhau
        });

        let appointmentData = appointment.get({ plain: true }); // Chuyển đổi instance thành object

        if (appointment) {
          appointment.statusId = "S3"; // S3 means sent remedy
          await appointment.save();
        }

        let timeString = buildTimeBooking(appointmentData);
        let doctorName = `${appointmentData.doctorInforData?.doctorData?.firstName || ""} ${appointmentData.doctorInforData?.doctorData?.lastName || ""}`.trim();

        // 1. Tính toán chi phí chính xác
        const examinationFee = Number(
          data.examinationPrice ||
          appointmentData.doctorInforData?.priceTypeData?.valueVi ||
          300000
        );
        const medicineFee = Number(data.medicinePrice) || (data.prescription || []).reduce(
          (sum, med) => sum + (Number(med.total) || (Number(med.quantity || 1) * Number(med.price || 0))),
          0
        );
        const totalFee = Number(data.totalPrice) || (examinationFee + medicineFee);

        // 2. Tạo hoặc cập nhật hóa đơn viện phí tạm thời cho quầy Thu ngân
        try {
          const [cashierRecord, created] = await db.Cashier.findOrCreate({
            where: { bookingId: String(appointment.id) },
            defaults: {
              bookingId: String(appointment.id),
              cashier: "Chờ thanh toán",
              date: Math.floor(Date.now() / 1000),
              totalPrire: String(totalFee),
              paymentMethod: "CASH",
              description: JSON.stringify({
                examinationFee: examinationFee,
                medicineFee: medicineFee,
                totalFee: totalFee,
                medicinesCount: (data.prescription || []).length,
              }),
            },
          });
          if (!created) {
            cashierRecord.totalPrire = String(totalFee);
            cashierRecord.description = JSON.stringify({
              examinationFee: examinationFee,
              medicineFee: medicineFee,
              totalFee: totalFee,
              medicinesCount: (data.prescription || []).length,
            });
            await cashierRecord.save();
          }
        } catch (cashierErr) {
          console.error("Error creating/updating Cashier record in sendRemedyService:", cashierErr);
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
          }
        };

        // Queue the task to run in the background
        await emailServices.sendAttachment(jobData);

        resolve({
          errCode: 0,
          errMessage: "Send remedy queued successfully!",
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
let sendPayment = (data, io) => {
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

          let [cashierRecord, created] = await db.Cashier.findOrCreate({
            where: { bookingId: String(appointment.id) },
            defaults: {
              cashier: data.cashier || "Thu ngân",
              date: String(data.date || Date.now()),
              totalPrire: String(data.totalPrice || data.totalPrire || 0),
              paymentMethod: data.paymentMethod || "CASH",
              description: JSON.stringify({
                examinationFee: Number(data.examinationPrice || data.totalPrice || 0),
                medicineFee: Number(data.medicinePrice || 0),
                totalFee: Number(data.totalPrice || 0),
                note: data.description || "Thanh toán viện phí",
              }),
              bookingId: String(appointment.id),
            },
          });
          if (!created) {
            let breakdown = {};
            if (cashierRecord.description) {
              try {
                breakdown = JSON.parse(cashierRecord.description);
              } catch (e) {}
            }
            const examPrice = data.examinationPrice !== undefined ? Number(data.examinationPrice) : (breakdown.examinationFee !== undefined ? Number(breakdown.examinationFee) : Number(data.totalPrice || 0));
            const medPrice = data.medicinePrice !== undefined ? Number(data.medicinePrice) : (breakdown.medicineFee !== undefined ? Number(breakdown.medicineFee) : 0);
            const finalTotal = Number(data.totalPrice || (examPrice + medPrice));

            cashierRecord.cashier = data.cashier || "Thu ngân";
            cashierRecord.date = String(data.date || Date.now());
            cashierRecord.totalPrire = String(finalTotal);
            cashierRecord.paymentMethod = data.paymentMethod || "CASH";
            cashierRecord.description = JSON.stringify({
              examinationFee: examPrice,
              medicineFee: medPrice,
              totalFee: finalTotal,
              medicinesCount: breakdown.medicinesCount || 0,
              note: data.description || breakdown.note || "Thanh toán viện phí",
            });
            await cashierRecord.save();
          }

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
            const patient = onlineUsers.find(
              (user) => user.id === data.patientId
            );

            cashiers.forEach((cashier) => {
              io.to(cashier.socketId).emit("PAYMENT_CONFIRMED", {
                ...notificationData,
                role: "cashier",
              });
            });

            if (patient) {
              io.to(patient.socketId).emit("PAYMENT_CONFIRMED", {
                ...notificationData,
                role: "patient",
              });
            }
          }

          let patientRecord = await db.User.findOne({
            where: { id: data.patientId },
            attributes: ["fcmToken"],
          });
          if (patientRecord && patientRecord.fcmToken) {
            sendPushNotification(
              patientRecord.fcmToken,
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
let updateBookingPaymentStatus = async (bookingId, amount, transactionDateTime, io) => {
  const booking = await db.Booking.findOne({
    where: { id: bookingId },
    include: [
      {
        model: db.User,
        as: "patientData",
        attributes: ["id", "email", "firstName", "fcmToken"],
      },
    ],
    raw: false,
  });
  if (booking) {
    booking.statusId = "S5";
    await booking.save();

    // Lưu thông tin thanh toán vào bảng Cashier nếu chưa có
    try {
      const [cashierRecord, created] = await db.Cashier.findOrCreate({
        where: { bookingId: String(booking.id) },
        defaults: {
          cashier: "Cổng PayOS / Casso",
          date: String(transactionDateTime || Date.now()),
          totalPrire: String(amount),
          paymentMethod: "TRANSFER_QR",
          description: JSON.stringify({
            examinationFee: Number(amount),
            medicineFee: 0,
            totalFee: Number(amount),
            note: `Thanh toán trực tuyến mã BOOKING${booking.id}`,
          }),
          bookingId: String(booking.id),
        },
      });
      if (!created) {
        cashierRecord.cashier = "Cổng PayOS / Casso";
        cashierRecord.date = String(transactionDateTime || Date.now());
        cashierRecord.totalPrire = String(amount);
        cashierRecord.paymentMethod = "TRANSFER_QR";
        await cashierRecord.save();
      }
    } catch (cashierErr) {
      console.warn("Không thể tạo Cashier record cho booking:", cashierErr.message);
    }
    // Gửi email xác nhận đã thanh toán
    try {
      const patient = booking.patientData;
      const dataSend = {
        reciverEmail: patient.email,
        patientName: patient.firstName,
        amount: amount,
        time: transactionDateTime,
        language: "vi",
      };
      await emailServices.sendEmailPaymentSuccess(dataSend);
    } catch (e) {
      console.error("Gửi email xác nhận thanh toán thất bại:", e);
    }
    // Emit PAYMENT_CONFIRMED to cashier and patient
    const onlineUsers = getOnlineUsers();
    const notificationData = {
      bookingId,
      patientName: booking.patientData ? booking.patientData.firstName : "",
      amount: amount,
      transactionDateTime: transactionDateTime,
      doctorId: booking.doctorId,
    };

    const cashiers = onlineUsers.filter((user) => user.roleId === "R4");
    const patient = onlineUsers.find(
      (user) => user.id === (booking.patientData ? booking.patientData.id : null)
    );

    cashiers.forEach((cashier) => {
      if (io) {
        io.to(cashier.socketId).emit("PAYMENT_CONFIRMED", {
          ...notificationData,
          role: "cashier",
        });
      }
    });

    if (patient && io) {
      io.to(patient.socketId).emit("PAYMENT_CONFIRMED", {
        ...notificationData,
        role: "patient",
      });
    }

    if (booking.patientData && booking.patientData.fcmToken) {
      sendPushNotification(
        booking.patientData.fcmToken,
        "Thanh toán thành công",
        `Lịch hẹn khám của bạn (Mã: BOOKING${bookingId}) đã được thanh toán thành công số tiền ${amount} VNĐ.`,
        { bookingId: String(bookingId), status: "paid" }
      );
    }
    return true;
  }
  return false;
};

// Get all payment and update booking status (Hỗ trợ PayOS và Casso Webhook)
let postConfirmPayment = (inputData, io) => {
  return new Promise(async (resolve, reject) => {
    try {
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
      if (
        paymentData &&
        (paymentData.description === "test" ||
          paymentData.orderCode === 123 ||
          paymentData.isTest)
      ) {
        return resolve({
          error: 0,
          errCode: 0,
          message: "PayOS test webhook received successfully",
        });
      }

      if (!paymentData) {
        return resolve({
          error: 1,
          errCode: 1,
          message: "No payment data provided",
        });
      }

      const description = paymentData.description || "";
      const match = description.match(/BOOKING([a-zA-Z0-9]+)/i);

      if (!match) {
        console.warn("Không tìm thấy bookingId trong description:", description);
        return resolve({
          error: 0,
          errCode: 0,
          message: "Webhook processed (no matching booking pattern)",
        });
      }

      const bookingId = match[1];
      const amount = paymentData.amount;
      const transactionDateTime = paymentData.transactionDateTime || new Date().toISOString();

      const success = await updateBookingPaymentStatus(
        bookingId,
        amount,
        transactionDateTime,
        io
      );

      if (success) {
        return resolve({
          error: 0,
          errCode: 0,
          errMessage: "Payment confirmed and booking updated successfully",
          message: "Success",
        });
      } else {
        return resolve({
          error: 0,
          errCode: 2,
          errMessage: `Booking ${bookingId} not found`,
        });
      }
    } catch (error) {
      console.error("Lỗi xử lý webhook payment:", error);
      reject(error);
    }
  });
};

// Create PayOS Payment Link
let createPayOSPaymentLink = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!payOS) {
        return resolve({
          errCode: -1,
          errMessage:
            "PayOS chưa được cấu hình Client ID, API Key hoặc Checksum Key trong file .env",
        });
      }

      if (!data.bookingId || !data.amount) {
        return resolve({
          errCode: 1,
          errMessage: "Missing required parameters: bookingId or amount",
        });
      }

      const { bookingId, amount, description } = data;
      // orderCode must be a number <= 9007199254740991
      const orderCode = Number(
        String(Date.now()).slice(-6) + Math.floor(1000 + Math.random() * 9000)
      );
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
let handlePayOSWebhook = (webhookBody, io) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!webhookBody) {
        resolve({
          errCode: 1,
          errMessage: "Missing webhook data",
        });
        return;
      }

      if (!payOS) {
        resolve({
          errCode: -1,
          errMessage: "PayOS is not initialized",
        });
        return;
      }

      let verifiedData = null;
      try {
        verifiedData = await payOS.webhooks.verify(webhookBody);
      } catch (verifyError) {
        console.warn("⚠️ PayOS webhook signature verification failed:", verifyError.message);
        verifiedData = webhookBody.data || webhookBody;
      }

      // Xử lý khi PayOS kiểm tra kết nối webhook (Test Webhook)
      if (
        verifiedData &&
        (verifiedData.description === "test" ||
          verifiedData.orderCode === 123 ||
          verifiedData.isTest)
      ) {
        return resolve({
          error: 0,
          errCode: 0,
          message: "PayOS test webhook received successfully",
        });
      }

      if (verifiedData.desc === "success" || verifiedData.success === true || verifiedData.code === "00") {
        const description = verifiedData.description || "";
        const match = description.match(/BOOKING([a-zA-Z0-9]+)/i);
        if (!match) {
          resolve({
            errCode: 2,
            errMessage: "No bookingId found in description",
          });
          return;
        }

        const bookingId = match[1];
        const success = await updateBookingPaymentStatus(
          bookingId,
          verifiedData.amount,
          verifiedData.transactionDateTime || new Date().toISOString(),
          io
        );

        if (success) {
          resolve({
            error: 0,
            errCode: 0,
            errMessage: "PayOS payment verified and booking updated successfully",
            message: "Success",
          });
        } else {
          resolve({
            errCode: 3,
            errMessage: "Booking not found",
          });
        }
      } else {
        resolve({
          errCode: 4,
          errMessage: "Transaction was not successful",
        });
      }
    } catch (e) {
      console.error("Lỗi Webhook PayOS:", e);
      reject(e);
    }
  });
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
