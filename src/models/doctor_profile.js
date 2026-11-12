"use strict";
/** Hồ sơ chuyên môn bác sĩ (1 dòng/bác sĩ). Thay doctor_infor cũ (1 dòng/ngôn ngữ). */
module.exports = (sequelize, DataTypes) => {
  const DoctorProfile = sequelize.define(
    "DoctorProfile",
    {
      doctorId: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: false },
      specialtyId: DataTypes.BIGINT.UNSIGNED,
      clinicId: DataTypes.BIGINT.UNSIGNED,
      priceId: { type: DataTypes.STRING(32), field: "price_code" },
      provinceId: { type: DataTypes.STRING(32), field: "province_code" },
      paymentId: { type: DataTypes.STRING(32), field: "payment_code" },
      yearsOfExperience: DataTypes.TINYINT.UNSIGNED,
      bookingCount: DataTypes.INTEGER,
    },
    { tableName: "doctor_profiles" }
  );
  DoctorProfile.associate = (models) => {
    const ref = { targetKey: "keyMap", constraints: false };
    DoctorProfile.belongsTo(models.User, { foreignKey: "doctorId", as: "doctorData" });
    DoctorProfile.belongsTo(models.Specialty, { foreignKey: "specialtyId", as: "doctorSpecialty" });
    DoctorProfile.belongsTo(models.Clinic, { foreignKey: "clinicId", as: "clinic" });
    DoctorProfile.belongsTo(models.AllCode, { foreignKey: "priceId", as: "priceTypeData", ...ref });
    DoctorProfile.belongsTo(models.AllCode, { foreignKey: "paymentId", as: "paymentTypeData", ...ref });
    DoctorProfile.belongsTo(models.AllCode, { foreignKey: "provinceId", as: "provinceTypeData", ...ref });
    DoctorProfile.hasMany(models.DoctorProfileTranslation, { foreignKey: "doctorId", as: "translations" });
  };
  return DoctorProfile;
};
