"use strict";
module.exports = (sequelize, DataTypes) => {
  const Package = sequelize.define(
    "Package",
    {
      name: DataTypes.STRING,
      description: DataTypes.TEXT,
      price: DataTypes.DECIMAL(12, 2),
      image: DataTypes.STRING,
      category: DataTypes.STRING(100),
      gender: DataTypes.ENUM("male", "female", "both"),
      ageRange: DataTypes.STRING(32),
      duration: DataTypes.INTEGER, // phút
      isActive: DataTypes.BOOLEAN,
      isFeatured: DataTypes.BOOLEAN,
      facilityId: DataTypes.BIGINT.UNSIGNED,
      specialtyId: DataTypes.BIGINT.UNSIGNED,
      includedServices: DataTypes.TEXT, // chuỗi JSON
      excludedServices: DataTypes.TEXT,
      requirements: DataTypes.TEXT,
      notes: DataTypes.TEXT,
    },
    { tableName: "packages" }
  );
  Package.associate = (models) => {
    Package.belongsTo(models.Facility, { foreignKey: "facilityId", as: "facilityData" });
    Package.belongsTo(models.Specialty, { foreignKey: "specialtyId", as: "specialtyData" });
  };
  return Package;
};
