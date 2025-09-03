"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class QuestionOption extends Model {
    /**
     * Helper method for defining associations.
     */
    static associate(models) {
      // Mỗi option thuộc về một Question
      QuestionOption.belongsTo(models.Question, {
        foreignKey: "question_id",
        as: "options",
      });
    }
  }

  QuestionOption.init(
    {
      question_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      option_text: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      score: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      modelName: "QuestionOption",
      tableName: "question_options",
      underscored: true, // map snake_case (question_id, option_text, ...)
      timestamps: true, // Sequelize sẽ quản lý created_at, updated_at
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return QuestionOption;
};
