"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Category_Question extends Model {
    static associate(models) {
      // Mỗi bài test có nhiều câu hỏi
      Category_Question.hasMany(models.Question, {
        foreignKey: "category_question_id",
        as: "questions",
      });
    }
  }

  Category_Question.init(
    {
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "Category_Question",
      tableName: "category_questions",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return Category_Question;
};
