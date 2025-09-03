"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class HandBook_Translation extends Model {
    static associate(models) {
      HandBook_Translation.belongsTo(models.HandBook, {
        foreignKey: "handbookId",
        as: "handbookData",
      });
    }
  }

  HandBook_Translation.init(
    {
      handbookId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      lang: {
        type: DataTypes.STRING, // "vi", "en"
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "HandBook_Translation",
    }
  );

  return HandBook_Translation;
};
