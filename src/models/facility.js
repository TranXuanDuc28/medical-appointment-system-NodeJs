"use strict";
module.exports = (sequelize, DataTypes) => {
  const Facility = sequelize.define(
    "Facility",
    {
      name: DataTypes.STRING,
      description: DataTypes.TEXT,
      logo: DataTypes.STRING,
      address: DataTypes.TEXT,
      phone: DataTypes.STRING(32),
      email: DataTypes.STRING,
      website: DataTypes.STRING,
      type: DataTypes.ENUM("hospital", "clinic", "medical_center", "laboratory"),
      level: DataTypes.ENUM("provincial", "district", "private", "international"),
      isActive: DataTypes.BOOLEAN,
      isFeatured: DataTypes.BOOLEAN,
      rating: DataTypes.DECIMAL(3, 2),
      totalReviews: DataTypes.INTEGER,
      workingHours: DataTypes.TEXT, // chuỗi JSON (DB có CHECK JSON_VALID)
      services: DataTypes.TEXT,
      specialties: DataTypes.TEXT,
      images: DataTypes.TEXT,
      location: DataTypes.TEXT,
    },
    { tableName: "facilities" }
  );
  Facility.associate = (models) => {
    Facility.hasMany(models.Package, { foreignKey: "facilityId", as: "packages" });
  };
  return Facility;
};
