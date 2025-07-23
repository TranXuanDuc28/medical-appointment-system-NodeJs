const db = require("../models");

let getAllMedicine = async () => {
  try {
    let medicines = await db.Medicine.findAll();
    return {
      errCode: 0,
      data: medicines,
    };
  } catch (e) {
    return {
      errCode: -1,
      errMessage: "Error from the server",
    };
  }
};

module.exports = {
  getAllMedicine,
};
