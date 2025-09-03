"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Booking extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Booking.belongsTo(models.User, {
        foreignKey: "patientId",
        targetKey: "id",
        as: "patientData",
      });
      Booking.belongsTo(models.User, {
        foreignKey: "doctorId",
        targetKey: "id",
        as: "doctorData",
      });
      Booking.belongsTo(models.AllCode, {
        foreignKey: "timeType",
        targetKey: "keyMap",
        as: "timeTypeDataPatient",
      });
      Booking.belongsTo(models.AllCode, {
        foreignKey: "statusId",
        targetKey: "keyMap",
        as: "statusDataPatient",
      });
      Booking.hasOne(models.Cashier, {
        foreignKey: "bookingId",
        as: "bookingData",
      });
      Booking.belongsTo(models.Doctor_Infor, {
        foreignKey: "doctorId",
        targetKey: "doctorId",
        as: "doctorInforData",
      });
    }
  }
  Booking.init(
    {
      statusId: DataTypes.STRING,
      doctorId: DataTypes.INTEGER,
      patientId: DataTypes.INTEGER,
      date: DataTypes.STRING,
      timeType: DataTypes.STRING,
      token: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Booking",
    }
  );
  return Booking;
};
