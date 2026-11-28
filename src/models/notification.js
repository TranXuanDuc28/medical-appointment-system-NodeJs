"use strict";
/** Thông báo gửi cho người dùng (nhắc hẹn, sắp đến lượt...). dedupe_key UNIQUE để không gửi trùng. */
module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define(
    "Notification",
    {
      userId: DataTypes.BIGINT.UNSIGNED,
      type: DataTypes.STRING(40),
      channel: DataTypes.ENUM("PUSH", "EMAIL", "SMS", "INAPP"),
      title: DataTypes.STRING,
      body: DataTypes.TEXT,
      payload: DataTypes.JSON,
      dedupeKey: DataTypes.STRING(100),
      sentAt: DataTypes.DATE,
      readAt: DataTypes.DATE,
    },
    { tableName: "notifications", updatedAt: false }
  );
  Notification.associate = (models) => {
    Notification.belongsTo(models.User, { foreignKey: "userId", as: "user" });
  };
  return Notification;
};
