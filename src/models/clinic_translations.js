"use strict";
module.exports = (sequelize, DataTypes) => {
  const T = sequelize.define(
    "Clinic_Translation",
    {
      clinicId: DataTypes.BIGINT.UNSIGNED,
      lang: DataTypes.CHAR(2),
      name: DataTypes.STRING,
      address: DataTypes.STRING,
      description: DataTypes.TEXT("medium"),
      contentMarkdown: DataTypes.TEXT("medium"),
      contentHtml: DataTypes.TEXT("medium"),
    },
    { tableName: "clinic_translations" }
  );
  T.associate = (models) => {
    T.belongsTo(models.Clinic, { foreignKey: "clinicId", as: "clinicData" });
  };
  return T;
};
