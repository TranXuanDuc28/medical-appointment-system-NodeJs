"use strict";
/** Hồ sơ khám (cũ: histories). document = PDF đơn thuốc/hoá đơn (cũ: files). */
module.exports = (sequelize, DataTypes) => {
  const MedicalRecord = sequelize.define(
    "MedicalRecord",
    {
      bookingId: DataTypes.BIGINT.UNSIGNED,
      patientId: DataTypes.BIGINT.UNSIGNED,
      patientProfileId: DataTypes.BIGINT.UNSIGNED,
      doctorId: DataTypes.BIGINT.UNSIGNED,
      description: DataTypes.TEXT("medium"),
      document: DataTypes.BLOB("long"),
    },
    { tableName: "medical_records" }
  );
  MedicalRecord.associate = (models) => {
    MedicalRecord.belongsTo(models.User, { foreignKey: "doctorId", as: "doctorData" });
    MedicalRecord.belongsTo(models.User, { foreignKey: "patientId", as: "patientData" });
    MedicalRecord.belongsTo(models.Booking, { foreignKey: "bookingId", as: "booking" });
  };
  return MedicalRecord;
};
