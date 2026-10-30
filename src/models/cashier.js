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
      date: DataTypes.STRING,
      totalPrire: DataTypes.STRING,
      totalPrice: {
        type: DataTypes.VIRTUAL,
        get() {
          return this.getDataValue("totalPrire");
        },
        set(value) {
          this.setDataValue("totalPrire", String(value));
        },
      },
      paymentMethod: DataTypes.STRING,
      description: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Cashier",
    }
  );
  return Cashier;
};
