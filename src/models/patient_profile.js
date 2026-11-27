"use strict";
module.exports = (sequelize, DataTypes) => {
  const PatientProfile = sequelize.define(
    "PatientProfile",
    {
      ownerUserId: DataTypes.BIGINT.UNSIGNED,
      relationship: DataTypes.ENUM("SELF", "CHILD", "PARENT", "SPOUSE", "OTHER"),
      fullName: DataTypes.STRING(200),
      dateOfBirth: DataTypes.DATEONLY,
      gender: { type: DataTypes.STRING(32), field: "gender_code" },
      phoneNumber: DataTypes.STRING,
      address: DataTypes.STRING,
      insuranceNumber: DataTypes.STRING(32),
      bloodType: DataTypes.ENUM("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"),
      allergies: DataTypes.TEXT,
      chronicConditions: DataTypes.TEXT,
    },
    { tableName: "patient_profiles", paranoid: true }
  );
  PatientProfile.associate = (models) => {
    PatientProfile.belongsTo(models.User, { foreignKey: "ownerUserId", as: "owner" });
  };
  return PatientProfile;
};
