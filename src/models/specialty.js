"use strict";
module.exports = (sequelize, DataTypes) => {
  const Specialty = sequelize.define(
    "Specialty",
    { image: DataTypes.BLOB("long"), sortOrder: DataTypes.INTEGER, isActive: DataTypes.BOOLEAN },
    { tableName: "specialties" }
  );
  Specialty.associate = (models) => {
    Specialty.hasMany(models.Specialty_Translation, { foreignKey: "specialtyId", as: "specialtyData" });
    Specialty.hasMany(models.DoctorProfile, { foreignKey: "specialtyId", as: "doctorProfiles" });
  };
  return Specialty;
};
