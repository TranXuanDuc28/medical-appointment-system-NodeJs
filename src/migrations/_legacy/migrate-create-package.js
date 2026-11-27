"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("Packages", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      image: {
        type: Sequelize.STRING,
      },
      category: {
        type: Sequelize.STRING,
      },
      gender: {
        type: Sequelize.ENUM("male", "female", "both"),
        defaultValue: "both",
      },
      ageRange: {
        type: Sequelize.STRING,
      },
      duration: {
        type: Sequelize.INTEGER,
        comment: "Thời gian khám (phút)",
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      isFeatured: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      facilityId: {
        type: Sequelize.INTEGER,
      },
      specialtyId: {
        type: Sequelize.INTEGER,
      },
      includedServices: {
        type: Sequelize.TEXT,
        comment: "JSON string of included services",
      },
      excludedServices: {
        type: Sequelize.TEXT,
        comment: "JSON string of excluded services",
      },
      requirements: {
        type: Sequelize.TEXT,
        comment: "Yêu cầu trước khi khám",
      },
      notes: {
        type: Sequelize.TEXT,
        comment: "Ghi chú",
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("Packages");
  },
};
