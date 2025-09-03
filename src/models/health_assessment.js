"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class HealthAssessment extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Nếu có quan hệ với User thì bạn có thể thêm
      // HealthAssessment.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
    }
  }

  HealthAssessment.init(
    {
      user_id: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      total_score: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      max_score: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      percentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
      },
      health_level: {
        type: DataTypes.STRING(50),
      },
      answers: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      ai_advice: {
        type: DataTypes.TEXT,
      },
      completed_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "HealthAssessment",
      tableName: "health_assessments",
      underscored: true, // để mapping snake_case (user_id, total_score, ...)
      timestamps: true, // sẽ tự map created_at, updated_at
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return HealthAssessment;
};
