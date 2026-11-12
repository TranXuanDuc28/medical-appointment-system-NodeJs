"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert("medicines", [
      {
        name: "Paracetamol 500mg",
        unit: "Viên",
        description: "Thuốc giảm đau, hạ sốt.",
        price: 2000,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "Amoxicillin 500mg",
        unit: "Viên",
        description: "Kháng sinh điều trị nhiễm khuẩn.",
        price: 3500,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "Vitamin C 500mg",
        unit: "Viên",
        description: "Bổ sung vitamin C, tăng sức đề kháng.",
        price: 1500,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "Cefixime 100mg",
        unit: "Viên",
        description: "Kháng sinh điều trị nhiễm khuẩn.",
        price: 5000,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "Loperamide 2mg",
        unit: "Viên",
        description: "Điều trị tiêu chảy cấp và mãn tính.",
        price: 2500,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete("medicines", null, {});
  },
}; 