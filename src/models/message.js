"use strict";
module.exports = (sequelize, DataTypes) => {
  const Message = sequelize.define(
    "Message",
    {
      senderId: DataTypes.BIGINT.UNSIGNED,
      receiverId: DataTypes.BIGINT.UNSIGNED,
      body: DataTypes.TEXT,
      fileUrl: DataTypes.STRING(512),
      fileType: DataTypes.STRING(100),
      fileName: DataTypes.STRING,
    },
    { tableName: "messages" }
  );
  Message.associate = (models) => {
    Message.belongsTo(models.User, { foreignKey: "senderId", as: "sender" });
    Message.belongsTo(models.User, { foreignKey: "receiverId", as: "receiver" });
  };
  return Message;
};
