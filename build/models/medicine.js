"use strict";

module.exports = function (sequelize, DataTypes) {
  var Medicine = sequelize.define("Medicine", {
    name: DataTypes.STRING,
    unit: DataTypes.STRING,
    description: DataTypes.TEXT,
    price: DataTypes.FLOAT
  }, {
    tableName: "medicines"
  });
  return Medicine;
};