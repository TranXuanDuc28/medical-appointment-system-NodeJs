"use strict";
module.exports = (sequelize, DataTypes) => {
  const MlModelVersion = sequelize.define(
    "MlModelVersion",
    {
      kind: DataTypes.ENUM("DURATION", "TRIAGE"),
      version: DataTypes.STRING(50),
      algorithm: DataTypes.STRING(50),
      metrics: DataTypes.JSON,
      artifactPath: DataTypes.STRING,
      trainedAt: DataTypes.DATE,
      isActive: DataTypes.BOOLEAN,
    },
    { tableName: "ml_model_versions", updatedAt: false }
  );
  return MlModelVersion;
};
