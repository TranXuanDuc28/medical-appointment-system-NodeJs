"use strict";
/** Vé trong hàng đợi phòng khám. Một booking có tối đa 1 vé (UNIQUE booking_id). */
module.exports = (sequelize, DataTypes) => {
  const QueueTicket = sequelize.define(
    "QueueTicket",
    {
      bookingId: DataTypes.BIGINT.UNSIGNED,
      roomId: DataTypes.BIGINT.UNSIGNED,
      doctorId: DataTypes.BIGINT.UNSIGNED,
      patientProfileId: DataTypes.BIGINT.UNSIGNED,
      ticketDate: DataTypes.DATEONLY,
      shift: DataTypes.ENUM("MORNING", "AFTERNOON"),
      seq: DataTypes.INTEGER,
      displayNo: DataTypes.STRING(16),
      source: DataTypes.ENUM("BOOKED", "WALK_IN"),
      priority: DataTypes.ENUM("NORMAL", "ELDERLY", "EMERGENCY"),
      status: DataTypes.ENUM(
        "BOOKED", "CHECKED_IN", "WAITING", "CALLED", "IN_PROGRESS", "DONE", "NO_SHOW", "CANCELLED", "POSTPONED"
      ),
      checkInAt: DataTypes.DATE,
      calledAt: DataTypes.DATE,
      callCount: DataTypes.INTEGER,
      startedAt: DataTypes.DATE,
      finishedAt: DataTypes.DATE,
      postponedCount: DataTypes.INTEGER,
      sortAt: DataTypes.DATE(3),
      walkInName: DataTypes.STRING(200),
      walkInPhone: DataTypes.STRING(32),
    },
    { tableName: "queue_tickets" }
  );
  QueueTicket.associate = (models) => {
    QueueTicket.belongsTo(models.Booking, { foreignKey: "bookingId", as: "booking" });
    QueueTicket.belongsTo(models.Room, { foreignKey: "roomId", as: "room" });
    QueueTicket.belongsTo(models.User, { foreignKey: "doctorId", as: "doctor" });
    QueueTicket.belongsTo(models.PatientProfile, { foreignKey: "patientProfileId", as: "profile" });
    QueueTicket.hasMany(models.QueueEvent, { foreignKey: "ticketId", as: "events" });
  };
  return QueueTicket;
};
