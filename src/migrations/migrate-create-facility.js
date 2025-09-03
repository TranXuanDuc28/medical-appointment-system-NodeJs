'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Facilities', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT
      },
      logo: {
        type: Sequelize.STRING
      },
      address: {
        type: Sequelize.TEXT
      },
      phone: {
        type: Sequelize.STRING
      },
      email: {
        type: Sequelize.STRING
      },
      website: {
        type: Sequelize.STRING
      },
      type: {
        type: Sequelize.ENUM('hospital', 'clinic', 'medical_center', 'laboratory'),
        defaultValue: 'clinic'
      },
      level: {
        type: Sequelize.ENUM('provincial', 'district', 'private', 'international'),
        defaultValue: 'private'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      isFeatured: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      rating: {
        type: Sequelize.DECIMAL(3, 2),
        defaultValue: 0
      },
      totalReviews: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      workingHours: {
        type: Sequelize.TEXT
      },
      services: {
        type: Sequelize.TEXT
      },
      specialties: {
        type: Sequelize.TEXT
      },
      images: {
        type: Sequelize.TEXT
      },
      location: {
        type: Sequelize.TEXT
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Facilities');
  }
}; 