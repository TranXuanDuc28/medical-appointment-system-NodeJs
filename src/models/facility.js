'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Facility extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Facility.hasMany(models.Package, { foreignKey: 'facilityId', as: 'packages' });
    }
  }
  Facility.init({
    name: DataTypes.STRING,
    description: DataTypes.TEXT,
    logo: DataTypes.STRING,
    address: DataTypes.TEXT,
    phone: DataTypes.STRING,
    email: DataTypes.STRING,
    website: DataTypes.STRING,
    type: DataTypes.ENUM('hospital', 'clinic', 'medical_center', 'laboratory'),
    level: DataTypes.ENUM('provincial', 'district', 'private', 'international'),
    isActive: DataTypes.BOOLEAN,
    isFeatured: DataTypes.BOOLEAN,
    rating: DataTypes.DECIMAL(3, 2),
    totalReviews: DataTypes.INTEGER,
    workingHours: DataTypes.TEXT, // JSON string of working hours
    services: DataTypes.TEXT, // JSON string of available services
    specialties: DataTypes.TEXT, // JSON string of specialties
    images: DataTypes.TEXT, // JSON string of facility images
    location: DataTypes.TEXT, // JSON string of coordinates
  }, {
    sequelize,
    modelName: 'Facility',
  });
  return Facility;
}; 