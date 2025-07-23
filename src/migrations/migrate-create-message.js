"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("messages", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      msg: {
        type: Sequelize.STRING,
      },
      sender_id: {
        type: Sequelize.INTEGER,
      },
      sender_name: {
        type: Sequelize.STRING,
      },
      sender_email: {
        type: Sequelize.STRING,
      },
      receiver_id: {
        type: Sequelize.INTEGER,
      },
      receiver_name: {
        type: Sequelize.STRING,
      },
      receiver_email: {
        type: Sequelize.STRING,
      },
      file_url: {
        type: Sequelize.STRING,
      },
      file_type: {
        type: Sequelize.STRING,
      },
      file_name: {
        type: Sequelize.STRING,
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
    await queryInterface.dropTable("message");
  },
};
