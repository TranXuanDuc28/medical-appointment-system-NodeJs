"use strict";
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      email: DataTypes.STRING,
      password: DataTypes.STRING,
      firstName: DataTypes.STRING,
      lastName: DataTypes.STRING,
      phoneNumber: DataTypes.STRING,
      address: DataTypes.STRING,
      gender: { type: DataTypes.STRING(32), field: "gender_code" },
      positionId: { type: DataTypes.STRING(32), field: "position_code" },
      roleId: { type: DataTypes.STRING(32), field: "role_code" },
      image: DataTypes.BLOB("long"),
      isActive: DataTypes.BOOLEAN,
      tokenVersion: DataTypes.INTEGER,
      lastLoginAt: DataTypes.DATE,
    },
    { tableName: "users", paranoid: true } // xoá mềm (deleted_at)
  );

  User.associate = (models) => {
    const ref = { targetKey: "keyMap", constraints: false };
    User.belongsTo(models.AllCode, { foreignKey: "positionId", as: "positionData", ...ref });
    User.belongsTo(models.AllCode, { foreignKey: "gender", as: "genderData", ...ref });
    User.belongsTo(models.AllCode, { foreignKey: "roleId", as: "roleData", ...ref });
    User.hasOne(models.DoctorProfile, { foreignKey: "doctorId", as: "doctorProfile" });
    User.hasMany(models.DeviceToken, { foreignKey: "userId", as: "deviceTokens" });
    User.hasMany(models.PatientProfile, { foreignKey: "ownerUserId", as: "profiles" });
    User.hasMany(models.Schedule, { foreignKey: "doctorId", as: "schedules" });
    User.hasMany(models.Booking, { foreignKey: "patientId", as: "bookingsAsPatient" });
    User.hasMany(models.Booking, { foreignKey: "doctorId", as: "bookingsAsDoctor" });
  };
  return User;
};
