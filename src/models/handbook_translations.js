"use strict";
module.exports = (sequelize, DataTypes) => {
  const T = sequelize.define(
    "HandBook_Translation",
    {
      handbookId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      lang: { type: DataTypes.CHAR(2), allowNull: false },
      title: { type: DataTypes.STRING, allowNull: false },
      description: DataTypes.TEXT("medium"),
      contentMarkdown: DataTypes.TEXT("medium"),
      contentHtml: DataTypes.TEXT("medium"),
    },
    { tableName: "handbook_translations" }
  );
  T.associate = (models) => {
    T.belongsTo(models.HandBook, { foreignKey: "handbookId", as: "handbookData" });
  };
  return T;
};
