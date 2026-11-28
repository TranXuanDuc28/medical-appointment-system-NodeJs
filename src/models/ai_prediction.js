"use strict";
/** Dự đoán của AI cho một vé + kết quả thực tế sau khi khám => dữ liệu đối sánh AI và baseline. */
module.exports = (sequelize, DataTypes) => {
  const AiPrediction = sequelize.define(
    "AiPrediction",
    {
      ticketId: DataTypes.BIGINT.UNSIGNED,
      modelVersionId: DataTypes.BIGINT.UNSIGNED,
      predictedDurationMin: DataTypes.DECIMAL(6, 2),
      predictedWaitMin: DataTypes.DECIMAL(6, 2),
      actualDurationMin: DataTypes.DECIMAL(6, 2),
      actualWaitMin: DataTypes.DECIMAL(6, 2),
      features: DataTypes.JSON,
    },
    { tableName: "ai_predictions", updatedAt: false }
  );
  AiPrediction.associate = (models) => {
    AiPrediction.belongsTo(models.QueueTicket, { foreignKey: "ticketId", as: "ticket" });
    AiPrediction.belongsTo(models.MlModelVersion, { foreignKey: "modelVersionId", as: "modelVersion" });
  };
  return AiPrediction;
};
