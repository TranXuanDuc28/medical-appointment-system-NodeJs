"use strict";
/** Triệu chứng bệnh nhân khai khi đặt lịch + kết quả phân loại của AI. */
module.exports = (sequelize, DataTypes) => {
  const SymptomIntake = sequelize.define(
    "SymptomIntake",
    {
      bookingId: DataTypes.BIGINT.UNSIGNED,
      userId: DataTypes.BIGINT.UNSIGNED,
      rawText: DataTypes.TEXT,
      severity: DataTypes.ENUM("MILD", "MODERATE", "SEVERE"),
      onsetDays: DataTypes.INTEGER,
      suggestedSpecialtyId: DataTypes.BIGINT.UNSIGNED,
      confidence: DataTypes.DECIMAL(4, 3),
      urgency: DataTypes.ENUM("ROUTINE", "URGENT", "EMERGENCY"),
      modelVersionId: DataTypes.BIGINT.UNSIGNED,
    },
    { tableName: "symptom_intakes", updatedAt: false }
  );
  SymptomIntake.associate = (models) => {
    SymptomIntake.belongsTo(models.Booking, { foreignKey: "bookingId", as: "booking" });
    SymptomIntake.belongsTo(models.Specialty, { foreignKey: "suggestedSpecialtyId", as: "suggestedSpecialty" });
  };
  return SymptomIntake;
};
