"use strict";
module.exports = (sequelize, DataTypes) => {
  const O = sequelize.define(
    "QuestionOption",
    {
      question_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      option_text: { type: DataTypes.STRING, allowNull: false },
      score: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      sortOrder: DataTypes.INTEGER,
    },
    { tableName: "question_options" }
  );
  O.associate = (models) => {
    O.belongsTo(models.Question, { foreignKey: "question_id", as: "options" });
  };
  return O;
};
