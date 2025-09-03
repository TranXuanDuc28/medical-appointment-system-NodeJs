"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Specialty extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Specialty.hasMany(models.Doctor_Infor, {
        foreignKey: "specialtyId",
        as: "doctorSpecialty",
      });
      Specialty.hasMany(models.Markdown, {
        foreignKey: "specialtyId",
        as: "specialtyMarkdown",
      });
      Specialty.hasMany(models.Specialty_Translation, {
        foreignKey: "specialtyId",
        as: "specialtyData",
      });
    }
  }
  Specialty.init(
    {
      image: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Specialty",
    }
  );
  return Specialty;
};
