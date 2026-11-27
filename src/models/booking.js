"use strict";
module.exports = (sequelize, DataTypes) => {
  const Booking = sequelize.define(
    "Booking",
    {
      code: DataTypes.STRING(16),
      doctorId: DataTypes.BIGINT.UNSIGNED,
      workDate: { type: DataTypes.DATEONLY, field: "work_date" },
      timeType: { type: DataTypes.STRING(32), field: "time_code" },
      patientId: DataTypes.BIGINT.UNSIGNED,
      patientProfileId: DataTypes.BIGINT.UNSIGNED,
      statusId: { type: DataTypes.STRING(32), field: "status_code" },
      source: DataTypes.ENUM("ONLINE", "WALK_IN"),
      symptoms: DataTypes.TEXT,
      confirmTokenHash: DataTypes.STRING(64),
      holdExpiresAt: DataTypes.DATE,
      confirmedAt: DataTypes.DATE,
      cancelledAt: DataTypes.DATE,
      cancelReason: DataTypes.STRING,
    },
    { tableName: "bookings" }
  );
  Booking.associate = (models) => {
    const ref = { targetKey: "keyMap", constraints: false };
    Booking.belongsTo(models.User, { foreignKey: "patientId", targetKey: "id", as: "patientData" });
    Booking.belongsTo(models.User, { foreignKey: "doctorId", targetKey: "id", as: "doctorData" });
    Booking.belongsTo(models.PatientProfile, { foreignKey: "patientProfileId", as: "patientProfile" });
    Booking.belongsTo(models.AllCode, { foreignKey: "timeType", as: "timeTypeDataPatient", ...ref });
    Booking.belongsTo(models.AllCode, { foreignKey: "statusId", as: "statusDataPatient", ...ref });
    Booking.belongsTo(models.DoctorProfile, { foreignKey: "doctorId", targetKey: "doctorId", as: "doctorInforData", constraints: false });
    Booking.hasOne(models.Payment, { foreignKey: "bookingId", as: "bookingData" });
    Booking.hasOne(models.MedicalRecord, { foreignKey: "bookingId", as: "medicalRecord" });
  };
  return Booking;
};
