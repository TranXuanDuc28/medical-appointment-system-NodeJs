"use strict";
module.exports = (sequelize, DataTypes) => {
  const HandBook = sequelize.define(
    "HandBook",
    {
      image: DataTypes.BLOB("long"),
      category: { type: DataTypes.STRING(100), defaultValue: "Cẩm nang" },
      authors: DataTypes.TEXT, // chuỗi JSON (DB có CHECK JSON_VALID)
      reviewers: DataTypes.TEXT,
      published: { type: DataTypes.DATEONLY, field: "published_on" },
      updated: { type: DataTypes.DATEONLY, field: "last_reviewed_on" },
      views: { type: DataTypes.INTEGER, defaultValue: 0 },
    },
    { tableName: "handbooks" }
  );
  HandBook.associate = (models) => {
    HandBook.hasMany(models.HandBook_Translation, { foreignKey: "handbookId", as: "handbookData" });
  };
  return HandBook;
};
