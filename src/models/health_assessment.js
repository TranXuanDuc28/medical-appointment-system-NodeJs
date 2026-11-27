"use strict";
/** Kết quả khảo sát: user_id (FK, người đã đăng nhập) HOẶC guest_key (khách). */
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "HealthAssessment",
    {
      user_id: DataTypes.BIGINT.UNSIGNED,
      guest_key: DataTypes.STRING(64),
      total_score: { type: DataTypes.INTEGER, allowNull: false },
      max_score: { type: DataTypes.INTEGER, allowNull: false },
      percentage: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
      health_level: DataTypes.STRING(100),
      answers: DataTypes.JSON,
      ai_advice: DataTypes.TEXT,
      completed_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    { tableName: "health_assessments" }
  );
};
