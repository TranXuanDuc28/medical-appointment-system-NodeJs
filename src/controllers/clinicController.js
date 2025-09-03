const clinicService = require("../services/clinicService");

let createClinic = async (req, res) => {
  try {
    let infor = await clinicService.createClinicServices(req.body);
    return res.status(200).json(infor);
  } catch (e) {
    return res.status(200).json({
      errCode: -1,
      errMessage: "Error from the server",
    });
  }
};
let getAllClinic = async (req, res) => {
  try {
    let infor = await clinicService.getAllClinic(
      req.query.lang // Lấy ngôn ngữ từ query parameters
    );
    return res.status(200).json(infor);
  } catch (e) {
    return res.status(200).json({
      errCode: -1,
      errMessage: "Error from the server",
    });
  }
};

let getDetailClinicById = async (req, res) => {
  try {
    let infor = await clinicService.getDetailClinicById(
      req.query.id,
      req.query.lang
    );
    return res.status(200).json(infor);
  } catch (e) {
    return res.status(200).json({
      errCode: -1,
      errMessage: "Error from the server",
    });
  }
};
module.exports = {
  createClinic: createClinic,
  getAllClinic: getAllClinic,
  getDetailClinicById: getDetailClinicById,
};
