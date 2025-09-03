"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class HandBook extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     * */
    static associate(models) {
      // Handbook.hasMany(models.User, {
      //     foreignKey: "handbookId",
      //     as: "userHandbook",
      // });
      HandBook.hasMany(models.Markdown, {
        foreignKey: "handbookId",
        as: "handbookMarkdown",
      });
      HandBook.hasMany(models.HandBook_Translation, {
        foreignKey: "handbookId",
        as: "handbookData",
      });
    }
  }
  HandBook.init(
    {
      image: DataTypes.STRING,
      authors: DataTypes.TEXT, // JSON string or plain text
      reviewers: DataTypes.TEXT, // JSON string or plain text
      published: DataTypes.DATEONLY,
      updated: DataTypes.DATEONLY,
      views: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      category: {
        type: DataTypes.STRING,
        defaultValue: "Cẩm nang",
      },
    },
    {
      sequelize,
      modelName: "HandBook",
    }
  );
  return HandBook;
};
