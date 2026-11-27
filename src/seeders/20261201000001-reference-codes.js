"use strict";

/**
 * Danh mục tham chiếu (thay cho bảng allcodes cũ). Idempotent: chạy lại không tạo trùng.
 * [type, code, label_en, label_vi, numeric_value, meta]
 */
const ROWS = [
  ["GENDER", "M", "Male", "Nam"],
  ["GENDER", "F", "Female", "Nữ"],
  ["GENDER", "O", "Other", "Khác"],

  ["POSITION", "P0", "Physician", "Bác sĩ"],
  ["POSITION", "P1", "Master", "Thạc sĩ"],
  ["POSITION", "P2", "Doctor", "Tiến sĩ"],
  ["POSITION", "P3", "Associate Professor", "Phó giáo sư"],
  ["POSITION", "P4", "Professor", "Giáo sư"],

  ["PAYMENT", "PAY1", "Cash", "Tiền mặt"],
  ["PAYMENT", "PAY2", "Credit card", "Thẻ ATM"],
  ["PAYMENT", "PAY3", "All payment method", "Tất cả"],

  // Mức giá khám: label_vi/label_en giữ nguyên như API cũ (VND / USD), numeric_value là số VND
  ["PRICE", "PRI1", "10", "200000", 200000, { usd: 10 }],
  ["PRICE", "PRI2", "15", "250000", 250000, { usd: 15 }],
  ["PRICE", "PRI3", "20", "300000", 300000, { usd: 20 }],
  ["PRICE", "PRI4", "25", "350000", 350000, { usd: 25 }],
  ["PRICE", "PRI5", "30", "400000", 400000, { usd: 30 }],
  ["PRICE", "PRI6", "35", "450000", 450000, { usd: 35 }],
  ["PRICE", "PRI7", "40", "500000", 500000, { usd: 40 }],

  ["PROVINCE", "PRO1", "Ha Noi", "Hà Nội"],
  ["PROVINCE", "PRO2", "Ho Chi Minh", "Hồ Chí Minh"],
  ["PROVINCE", "PRO3", "Da Nang", "Đà Nẵng"],
  ["PROVINCE", "PRO4", "Can Tho", "Cần Thơ"],
  ["PROVINCE", "PRO5", "Binh Duong", "Bình Dương"],
  ["PROVINCE", "PRO6", "Dong Nai", "Đồng Nai"],
  ["PROVINCE", "PRO7", "Quang Ninh", "Quảng Ninh"],
  ["PROVINCE", "PRO8", "Hue", "Thừa Thiên Huế"],
  ["PROVINCE", "PRO9", "Quang Binh", "Quảng Bình"],
  ["PROVINCE", "PRO10", "Khanh Hoa", "Khánh Hòa"],

  // Nhãn vai trò (quyền thật nằm ở rbac_roles / rbac_role_permissions)
  ["ROLE", "R1", "Admin", "Quản trị viên"],
  ["ROLE", "R2", "Doctor", "Bác sĩ"],
  ["ROLE", "R3", "Patient", "Bệnh nhân"],
  ["ROLE", "R4", "Cashier", "Thu Ngân"],
  ["ROLE", "R5", "Receptionist", "Lễ tân"],
  ["ROLE", "R6", "Nurse", "Điều dưỡng"],
  ["ROLE", "R7", "Coordinator", "Điều phối viên"],
  ["ROLE", "R8", "Display device", "Thiết bị màn hình TV"],

  // Trạng thái lịch hẹn
  ["STATUS", "S1", "New", "Lịch hẹn mới"],
  ["STATUS", "S2", "Confirmed", "Đã xác nhận"],
  ["STATUS", "S3", "Done", "Đã khám xong"],
  ["STATUS", "S4", "Cancel", "Đã hủy"],
  ["STATUS", "S5", "Paid", "Đã thanh toán"],
  ["STATUS", "S6", "UnPaid", "Chưa thanh toán"],

  // Khung giờ khám: meta.start/end là giờ thật, dùng cho hàng đợi và tính ETA
  ["TIME", "T1", "8:00 AM - 9:00 AM", "8:00 - 9:00", null, { start: "08:00", end: "09:00", shift: "MORNING" }],
  ["TIME", "T2", "9:00 AM - 10:00 AM", "9:00 - 10:00", null, { start: "09:00", end: "10:00", shift: "MORNING" }],
  ["TIME", "T3", "10:00 AM - 11:00 AM", "10:00 - 11:00", null, { start: "10:00", end: "11:00", shift: "MORNING" }],
  ["TIME", "T4", "11:00 AM - 12:00 PM", "11:00 - 12:00", null, { start: "11:00", end: "12:00", shift: "MORNING" }],
  ["TIME", "T5", "1:00 PM - 2:00 PM", "13:00 - 14:00", null, { start: "13:00", end: "14:00", shift: "AFTERNOON" }],
  ["TIME", "T6", "2:00 PM - 3:00 PM", "14:00 - 15:00", null, { start: "14:00", end: "15:00", shift: "AFTERNOON" }],
  ["TIME", "T7", "3:00 PM - 4:00 PM", "15:00 - 16:00", null, { start: "15:00", end: "16:00", shift: "AFTERNOON" }],
  ["TIME", "T8", "4:00 PM - 5:00 PM", "16:00 - 17:00", null, { start: "16:00", end: "17:00", shift: "AFTERNOON" }],
];

module.exports = {
  up: async (queryInterface) => {
    const q = queryInterface.sequelize;
    let order = {};
    for (const [type, code, labelEn, labelVi, numeric, meta] of ROWS) {
      order[type] = (order[type] || 0) + 1;
      await q.query(
        `INSERT INTO reference_codes (type, code, label_en, label_vi, sort_order, numeric_value, meta)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE type = VALUES(type), label_en = VALUES(label_en), label_vi = VALUES(label_vi),
           sort_order = VALUES(sort_order), numeric_value = VALUES(numeric_value), meta = VALUES(meta)`,
        { replacements: [type, code, labelEn, labelVi, order[type], numeric ?? null, meta ? JSON.stringify(meta) : null] }
      );
    }
  },
  down: async (queryInterface) => {
    await queryInterface.sequelize.query("DELETE FROM reference_codes");
  },
};
