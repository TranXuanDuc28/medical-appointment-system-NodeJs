"use strict";
/**
 * Lịch làm việc. workDate là DATE chuẩn ("YYYY-MM-DD"); API cũ dùng chuỗi ms -> chuyển bằng utils/dateKey.
 * Thuộc tính giữ tên cũ: timeType, maxNumber, currentNumber.
 */
module.exports = (sequelize, DataTypes) => {
  const Schedule = sequelize.define(
    "Schedule",
    {
      doctorId: DataTypes.BIGINT.UNSIGNED,
      workDate: { type: DataTypes.DATEONLY, field: "work_date" },
      timeType: { type: DataTypes.STRING(32), field: "time_code" },
      maxNumber: { type: DataTypes.INTEGER, field: "max_patients" },
      currentNumber: { type: DataTypes.INTEGER, field: "current_patients" },
      status: DataTypes.ENUM("available", "booked", "closed"),
      roomId: DataTypes.BIGINT.UNSIGNED,
    },
    { tableName: "schedules" }
  );
  Schedule.associate = (models) => {
    Schedule.belongsTo(models.AllCode, { foreignKey: "timeType", targetKey: "keyMap", as: "timeTypeData", constraints: false });
    Schedule.belongsTo(models.User, { foreignKey: "doctorId", targetKey: "id", as: "doctorData" });
    Schedule.belongsTo(models.Room, { foreignKey: "roomId", as: "room" });
  };
  return Schedule;
};
