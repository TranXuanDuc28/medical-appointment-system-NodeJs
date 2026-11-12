"use strict";
/** Bảng reference_codes (cũ: allcodes). Giữ tên thuộc tính cũ: keyMap, valueEn, valueVi. */
module.exports = (sequelize, DataTypes) => {
  const AllCode = sequelize.define(
    "AllCode",
    {
      keyMap: { type: DataTypes.STRING(32), field: "code", allowNull: false, unique: true },
      type: DataTypes.STRING(32),
      valueEn: { type: DataTypes.STRING, field: "label_en" },
      valueVi: { type: DataTypes.STRING, field: "label_vi" },
      sortOrder: DataTypes.INTEGER,
      numericValue: DataTypes.DECIMAL(14, 2),
      meta: DataTypes.JSON,
      isActive: DataTypes.BOOLEAN,
    },
    { tableName: "reference_codes" }
  );
  return AllCode;
};
