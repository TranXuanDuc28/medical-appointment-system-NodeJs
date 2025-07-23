"use strict";
module.exports = (sequelize, DataTypes) => {
  const Medicine = sequelize.define(
    "Medicine",
    {
      name: DataTypes.STRING,
      unit: DataTypes.STRING,
      description: DataTypes.TEXT,
      price: DataTypes.FLOAT,
    },
    {
      tableName: "medicines",
    }
  );
  return Medicine;
}; 