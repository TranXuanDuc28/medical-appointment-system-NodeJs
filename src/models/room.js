"use strict";
module.exports = (sequelize, DataTypes) => {
  const Room = sequelize.define(
    "Room",
    {
      clinicId: DataTypes.BIGINT.UNSIGNED,
      specialtyId: DataTypes.BIGINT.UNSIGNED,
      code: DataTypes.STRING(32),
      name: DataTypes.STRING(100),
      floor: DataTypes.STRING(16),
      isActive: DataTypes.BOOLEAN,
    },
    { tableName: "rooms" }
  );
  Room.associate = (models) => {
    Room.belongsTo(models.Clinic, { foreignKey: "clinicId", as: "clinic" });
    Room.belongsTo(models.Specialty, { foreignKey: "specialtyId", as: "specialty" });
  };
  return Room;
};
