"use strict";
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "Medicine",
    {
      name: DataTypes.STRING,
      unit: DataTypes.STRING(50),
      description: DataTypes.TEXT,
      price: DataTypes.DECIMAL(12, 2),
      isActive: DataTypes.BOOLEAN,
    },
    { tableName: "medicines" }
  );
};
