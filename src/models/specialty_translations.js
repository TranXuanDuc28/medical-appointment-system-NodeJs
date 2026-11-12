"use strict";
module.exports = (sequelize, DataTypes) => {
  const T = sequelize.define(
    "Specialty_Translation",
    {
      specialtyId: DataTypes.BIGINT.UNSIGNED,
      lang: DataTypes.CHAR(2),
      name: DataTypes.STRING,
      description: DataTypes.TEXT("medium"),
      contentMarkdown: DataTypes.TEXT("medium"),
      contentHtml: DataTypes.TEXT("medium"),
    },
    { tableName: "specialty_translations" }
  );
  T.associate = (models) => {
    T.belongsTo(models.Specialty, { foreignKey: "specialtyId", as: "specialtyData" });
  };
  return T;
};
