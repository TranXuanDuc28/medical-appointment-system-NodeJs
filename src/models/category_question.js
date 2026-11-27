"use strict";
module.exports = (sequelize, DataTypes) => {
  const C = sequelize.define(
    "Category_Question",
    {
      title: { type: DataTypes.STRING(255), allowNull: false },
      description: DataTypes.TEXT,
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    { tableName: "category_questions" }
  );
  C.associate = (models) => {
    C.hasMany(models.Question, { foreignKey: "category_question_id", as: "questions" });
  };
  return C;
};
