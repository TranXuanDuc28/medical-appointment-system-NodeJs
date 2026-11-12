const db = require("../models");

// Medicine.price là DECIMAL (mysql trả chuỗi "2000.00"); API cũ trả số -> ép về Number. Chỉ trả thuốc còn dùng (isActive).
const legacyMedicine = (m) => {
  const { isActive, ...rest } = m;
  return { ...rest, price: m.price === null || m.price === undefined ? null : Number(m.price) };
};

let getAllMedicine = async () => {
  try {
    let medicines = await db.Medicine.findAll({ where: { isActive: true }, order: [["id", "ASC"]], raw: true });
    return {
      errCode: 0,
      data: medicines.map(legacyMedicine),
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
