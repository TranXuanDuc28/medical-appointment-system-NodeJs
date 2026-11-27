"use strict";
module.exports = (sequelize, DataTypes) => {
  const Clinic = sequelize.define(
    "Clinic",
    { image: DataTypes.BLOB("long"), phoneNumber: DataTypes.STRING, isActive: DataTypes.BOOLEAN },
    { tableName: "clinics" }
  );
  Clinic.associate = (models) => {
    Clinic.hasMany(models.Clinic_Translation, { foreignKey: "clinicId", as: "clinicData" });
    Clinic.hasMany(models.DoctorProfile, { foreignKey: "clinicId", as: "doctorProfiles" });
    Clinic.hasMany(models.Room, { foreignKey: "clinicId", as: "rooms" });
  };
  return Clinic;
};
