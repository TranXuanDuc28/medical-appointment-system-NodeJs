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

module.exports = {
  postBookAppointment: postBookAppointment,
  postVerifyBookAppointment: postVerifyBookAppointment,
};
