"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("HandBooks", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      image: {
        type: Sequelize.BLOB("long"), // hoặc Sequelize.BLOB("long") nếu lưu binary
      },
      authors: {
        type: Sequelize.TEXT,
      },
      reviewers: {
        type: Sequelize.TEXT,
      },
      published: {
        type: Sequelize.DATEONLY,
      },
      updated: {
        type: Sequelize.DATEONLY,
      },
      views: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      category: {
        type: Sequelize.STRING,
        defaultValue: "Cẩm nang",
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
    await queryInterface.dropTable("HandBooks");
  },
};
