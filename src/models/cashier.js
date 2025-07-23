"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Cashier extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Cashier.belongsTo(models.Booking, {
        foreignKey: "bookingId",
        as: "bookingData",
      });
    }
  }
  Cashier.init(
    {
      bookingId: DataTypes.STRING,
      cashier: DataTypes.STRING,
      date: DataTypes.INTEGER,
      totalPrire: DataTypes.STRING,
      description: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Cashier",
    }
  );
  return Cashier;
};
