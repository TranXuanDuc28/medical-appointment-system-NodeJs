"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Question extends Model {
    /**
     * Helper method for defining associations.
     */
    static associate(models) {
      // Ví dụ: Một câu hỏi có thể có nhiều lựa chọn/đáp án (nếu bạn có bảng options)
      // Question.hasMany(models.Option, { foreignKey: "question_id", as: "options" });
      // Nếu muốn liên kết với HealthAssessment (mỗi answer liên quan 1 question)
      // Question.hasMany(models.HealthAssessment, { foreignKey: "question_id", as: "assessments" });
      Question.hasMany(models.QuestionOption, {
        foreignKey: "question_id",
        as: "options",
      });
      Question.belongsTo(models.Category_Question, {
        foreignKey: "category_question_id",
        as: "questions",
      });
    }
  }

  Question.init(
    {
      question_text: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      category_question_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "Question",
      tableName: "questions",
      underscored: true, // mapping snake_case
      timestamps: true, // Sequelize sẽ tự quản lý created_at, updated_at
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return Question;
};
