"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Specialty_Translation extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Specialty_Translation.belongsTo(models.Specialty, {
        foreignKey: "specialtyId",
        as: "specialtyData",
      });
    }
  }
  Specialty_Translation.init(
    {
      specialtyId: DataTypes.STRING,
      name: DataTypes.STRING,
      lang: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Specialty_Translation",
    }
  );
  return Specialty_Translation;
};
