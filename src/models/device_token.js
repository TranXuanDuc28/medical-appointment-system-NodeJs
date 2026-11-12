"use strict";
module.exports = (sequelize, DataTypes) => {
  const DeviceToken = sequelize.define(
    "DeviceToken",
    {
      userId: DataTypes.BIGINT.UNSIGNED,
      token: DataTypes.STRING(512),
      tokenHash: DataTypes.STRING(64),
      platform: DataTypes.STRING(16),
      lastSeenAt: DataTypes.DATE,
    },
    { tableName: "device_tokens", updatedAt: false }
  );
  DeviceToken.associate = (models) => {
    DeviceToken.belongsTo(models.User, { foreignKey: "userId", as: "user" });
  };
  return DeviceToken;
};
