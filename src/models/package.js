'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Package extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Package.belongsTo(models.Facility, { foreignKey: 'facilityId', as: 'facilityData' });
      Package.belongsTo(models.Specialty, { foreignKey: 'specialtyId', as: 'specialtyData' });
    }
  }
  Package.init({
    name: DataTypes.STRING,
    description: DataTypes.TEXT,
    price: DataTypes.DECIMAL(10, 2),
    image: DataTypes.STRING,
    category: DataTypes.STRING,
    gender: DataTypes.ENUM('male', 'female', 'both'),
    ageRange: DataTypes.STRING,
    duration: DataTypes.INTEGER, // Thời gian khám (phút)
    isActive: DataTypes.BOOLEAN,
    isFeatured: DataTypes.BOOLEAN,
    facilityId: DataTypes.INTEGER,
    specialtyId: DataTypes.INTEGER,
    includedServices: DataTypes.TEXT, // JSON string of included services
    excludedServices: DataTypes.TEXT, // JSON string of excluded services
    requirements: DataTypes.TEXT, // Yêu cầu trước khi khám
    notes: DataTypes.TEXT, // Ghi chú
  }, {
    sequelize,
    modelName: 'Package',
  });
  return Package;
}; 