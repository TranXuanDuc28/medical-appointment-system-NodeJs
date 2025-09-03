import patientServices from "../services/patientServices";
let postBookAppointment = async (req, res) => {
  try {
    let message = await patientServices.postBookAppointmentServices(req.body);
    return res.status(200).json(message);
  } catch (error) {
    return res.status(200).json({
      errCode: -1,
      errMessage: "Lỗi từ server!",
    });
  }
};

let postVerifyBookAppointment = async (req, res) => {
  try {
    let infor = await patientServices.postVerifyBookAppointment(req.body);
    return res.status(200).json(infor);
  } catch (e) {
    console.log(e);
    return res.status(200).json({
      errCode: -1,
      errMessage: "Error from the server",
    });
  }
};
let getPatientAppointments = async (req, res) => {
  try {
    let patientId = req.query.patientId;
    if (!patientId) {
      return res.status(400).json({
        errCode: 1,
        errMessage: "Missing required parameter: patientId",
      });
    }
    let appointments = await patientServices.getPatientAppointments(patientId);
    return res.status(200).json(appointments);
  } catch (error) {
    console.error("Error fetching patient appointments:", error);
    return res.status(500).json({
      errCode: -1,
      errMessage: "Error from the server",
    });
  }
};

module.exports = {
  postBookAppointment: postBookAppointment,
  postVerifyBookAppointment: postVerifyBookAppointment,
  getPatientAppointments: getPatientAppointments,
};
