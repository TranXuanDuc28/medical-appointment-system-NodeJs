"use strict";
module.exports = (sequelize, DataTypes) => {
  const T = sequelize.define(
    "DoctorProfileTranslation",
    {
      doctorId: DataTypes.BIGINT.UNSIGNED,
      lang: DataTypes.CHAR(2),
      clinicName: DataTypes.STRING,
      clinicAddress: DataTypes.STRING,
      note: DataTypes.STRING(500),
      description: DataTypes.TEXT("medium"),
      contentMarkdown: DataTypes.TEXT("medium"),
      contentHtml: DataTypes.TEXT("medium"),
    },
    { tableName: "doctor_profile_translations" }
  );
  T.associate = (models) => {
    T.belongsTo(models.DoctorProfile, { foreignKey: "doctorId", as: "profile" });
  };
  return T;
};
