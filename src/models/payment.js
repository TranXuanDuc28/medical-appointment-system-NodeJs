"use strict";
/** Hoá đơn/thanh toán (cũ: cashiers). 1 hoá đơn / booking. */
module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define(
    "Payment",
    {
      bookingId: DataTypes.BIGINT.UNSIGNED,
      cashier: { type: DataTypes.STRING, field: "cashier_name" },
      amount: DataTypes.DECIMAL(12, 0),
      paymentMethod: DataTypes.STRING(20),
      paidAt: DataTypes.DATE,
      gatewayRef: DataTypes.STRING(64),
      description: DataTypes.TEXT,
    },
    { tableName: "payments" }
  );
  Payment.associate = (models) => {
    Payment.belongsTo(models.Booking, { foreignKey: "bookingId", as: "booking" });
  };
  return Payment;
};
