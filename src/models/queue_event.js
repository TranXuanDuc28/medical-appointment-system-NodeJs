"use strict";
/** Nhật ký mọi chuyển trạng thái của vé (audit + dữ liệu huấn luyện ML). Chỉ ghi thêm, không sửa. */
module.exports = (sequelize, DataTypes) => {
  const QueueEvent = sequelize.define(
    "QueueEvent",
    {
      ticketId: DataTypes.BIGINT.UNSIGNED,
      eventType: DataTypes.STRING(32),
      actorUserId: DataTypes.BIGINT.UNSIGNED,
      payload: DataTypes.JSON,
    },
    { tableName: "queue_events", updatedAt: false }
  );
  QueueEvent.associate = (models) => {
    QueueEvent.belongsTo(models.QueueTicket, { foreignKey: "ticketId", as: "ticket" });
    QueueEvent.belongsTo(models.User, { foreignKey: "actorUserId", as: "actor" });
  };
  return QueueEvent;
};
