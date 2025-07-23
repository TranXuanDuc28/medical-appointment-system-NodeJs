"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Message extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {}
  }
  Message.init(
    {
      msg: DataTypes.STRING,
      sender_id: DataTypes.INTEGER,
      sender_name: DataTypes.STRING,
      sender_email: DataTypes.STRING,
      receiver_id: DataTypes.INTEGER,
      receiver_name: DataTypes.STRING,
      receiver_email: DataTypes.STRING,
      file_url: DataTypes.STRING,
      file_type: DataTypes.STRING,
      file_name: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Message",
    }
  );
  return Message;
};
