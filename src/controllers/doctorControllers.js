import doctorServices from "../services/doctorServices";
const socket = require("../socket/index");
let getTopDoctorHome = async (req, res) => {
  let limit = req.query.limit;
  let lang = req.query.lang;
  if (!limit) limit = 10;
  try {
    let message = await doctorServices.getTopDoctorHomeServices(limit, lang);
    return res.status(200).json(message);
  } catch (error) {
    return res.status(200).json({
      errCode: -1,
      errMessage: "Lỗi từ server!",
    });
  }
};
let getAllDoctor = async (req, res) => {
  try {
    let message = await doctorServices.getAllDoctorServices();
    return res.status(200).json(message);
  } catch (error) {
    return res.status(200).json({
      errCode: -1,
      errMessage: "Lỗi từ server!",
    });
  }
};
let postInforDoctor = async (req, res) => {
  try {
    let message = await doctorServices.saveDetailInforDoctor(req.body);
    return res.status(200).json(message);
  } catch (error) {
    return res.status(200).json({
      errCode: -1,
      errMessage: "Lỗi từ server!",
    });
  }
};
let getDetailDoctorById = async (req, res) => {
  try {
    let message = await doctorServices.getDetailDoctorByIdServices(
      req.query.id,
      req.query.lang
    );
    return res.status(200).json(message);
  } catch (error) {
    return res.status(200).json({
      errCode: -1,
      errMessage: "Lỗi từ server!",
    });
  }
};
let getBulkCreateSchedule = async (req, res) => {
  try {
    let message = await doctorServices.bulkCreateScheduleServices(req.body);
    return res.status(200).json(message);
  } catch (error) {
    return res.status(200).json({
      errCode: -1,
      errMessage: "Lỗi từ server!",
    });
  }
};
let getScheduleDoctorByDate = async (req, res) => {
  try {
    let message = await doctorServices.getScheduleDoctorByDateServices({
      doctorId: req.query.doctorId,
      date: req.query.date,
    });
    return res.status(200).json(message);
  } catch (error) {
    return res.status(200).json({
      errCode: -1,
      errMessage: "Lỗi từ server!",
    });
  }
};
let getExtraDoctorInforById = async (req, res) => {
  try {
    let message = await doctorServices.getExtraDoctorInforByIdServices(
      req.query.doctorId,
      req.query.lang
    );
    return res.status(200).json(message);
  } catch (error) {
    return res.status(200).json({
      errCode: -1,
      errMessage: "Lỗi từ server!",
    });
  }
};
let getProfileDoctorById = async (req, res) => {
  try {
    let message = await doctorServices.getProfileDoctorByIdServices(
      req.query.doctorId,
      req.query.lang
    );
    return res.status(200).json(message);
  } catch (error) {
    return res.status(200).json({
      errCode: -1,
      errMessage: "Lỗi từ server!",
    });
  }
};
let getListPatientForDoctor = async (req, res) => {
  try {
    let message = await doctorServices.getListPatientForDoctor(
      req.query.doctorId,
      req.query.roleId,
      req.query.date,
      req.query.lang
    );
    return res.status(200).json(message);
  } catch (error) {
    return res.status(200).json({
      errCode: -1,
      errMessage: "Lỗi từ server!",
    });
  }
};
let sendRemedy = async (req, res) => {
  try {
    let message = await doctorServices.sendRemedyService(req.body);
    return res.status(200).json(message);
  } catch (error) {
    return res.status(200).json({
      errCode: -1,
      errMessage: "Lỗi từ server!",
    });
  }
};
let getListGDPR = async (req, res) => {
  try {
    let message = await doctorServices.getListGDPR();
    return res.status(200).json(message);
  } catch (error) {
    return res.status(200).json({
      errCode: -1,
      errMessage: "Lỗi từ server!",
    });
  }
};
let postConfirmPayment = async (req, res) => {
  try {
    const webhookToken = req.headers["secure-token-header"];
    const expectedToken = process.env.CASSO_WEBHOOK_KEY;
    if (!webhookToken || webhookToken !== expectedToken) {
      return res.status(401).json({
        errCode: -1,
        errMessage: "Không có quyền truy cập webhook!",
      });
    }

    let message = await doctorServices.postConfirmPayment(
      req.body,
      req.app.get("socketio")
    );
    return res.status(200).json(message);
  } catch (error) {
    return res.status(200).json({
      errCode: -1,
      errMessage: "Lỗi từ server!",
    });
  }
};
let postMedicalAppointmentStatus = async (req, res) => {
  try {
    let message = await doctorServices.postMedicalAppointmentStatus(req.body);
    return res.status(200).json(message);
  } catch (error) {
    return res.status(200).json({
      errCode: -1,
      errMessage: "Lỗi từ server!",
    });
  }
};
let sendPayment = async (req, res) => {
  try {
    let message = await doctorServices.sendPayment(
      req.body,
      req.app.get("socketio")
    );
    return res.status(200).json(message);
  } catch (error) {
    return res.status(200).json({
      errCode: -1,
      errMessage: "Lỗi từ server!",
    });
  }
};
let createPayOSPaymentLink = async (req, res) => {
  try {
    let message = await doctorServices.createPayOSPaymentLink(req.body);
    return res.status(200).json(message);
  } catch (error) {
    return res.status(200).json({
      errCode: -1,
      errMessage: "Lỗi từ server!",
    });
  }
};
let handlePayOSWebhook = async (req, res) => {
  try {
    let message = await doctorServices.handlePayOSWebhook(
      req.body,
      req.app.get("socketio")
    );
    return res.status(200).json(message);
  } catch (error) {
    return res.status(200).json({
      errCode: -1,
      errMessage: "Lỗi từ server!",
    });
  }
};

module.exports = {
  getTopDoctorHome: getTopDoctorHome,
  getAllDoctor: getAllDoctor,
  postInforDoctor: postInforDoctor,
  getDetailDoctorById: getDetailDoctorById,
  getBulkCreateSchedule: getBulkCreateSchedule,
  getScheduleDoctorByDate: getScheduleDoctorByDate,
  getExtraDoctorInforById: getExtraDoctorInforById,
  getProfileDoctorById: getProfileDoctorById,
  getListPatientForDoctor: getListPatientForDoctor,
  sendRemedy: sendRemedy,
  getListGDPR: getListGDPR,
  postConfirmPayment: postConfirmPayment,
  postMedicalAppointmentStatus: postMedicalAppointmentStatus,
  sendPayment: sendPayment,
  createPayOSPaymentLink: createPayOSPaymentLink,
  handlePayOSWebhook: handlePayOSWebhook,
};
