"use strict";
module.exports = (sequelize, DataTypes) => {
  const Question = sequelize.define(
    "Question",
    {
      question_text: { type: DataTypes.TEXT, allowNull: false },
      category_question_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      sortOrder: DataTypes.INTEGER,
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    { tableName: "questions" }
  );
  Question.associate = (models) => {
    Question.hasMany(models.QuestionOption, { foreignKey: "question_id", as: "options" });
    Question.belongsTo(models.Category_Question, { foreignKey: "category_question_id", as: "questions" });
  };
  return Question;
};
