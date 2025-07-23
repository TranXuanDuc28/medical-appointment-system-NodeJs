const medicineService = require("../services/medicineServices");

let getAllMedicine = async (req, res) => {
  try {
    let data = await medicineService.getAllMedicine();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(200).json({
      errCode: -1,
      errMessage: "Error from the server",
    });
  }
};

module.exports = {
  getAllMedicine,
};
