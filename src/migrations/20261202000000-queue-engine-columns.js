"use strict";

/**
 * Bổ sung cho queue_tickets khi hiện thực lõi hàng đợi (phát hiện lúc viết thuật toán sắp xếp):
 *  - sort_at      : khoá sắp xếp trong hàng đợi (booked = giờ hẹn, walk-in = giờ đến, hoãn/vắng = đẩy ra sau)
 *  - walk_in_name / walk_in_phone : bệnh nhân vãng lai không có tài khoản / lịch hẹn
 *  - fk_qt_booking: SET NULL -> RESTRICT (MySQL không cho cột có SET NULL nằm trong CHECK; vé không được mồ côi khỏi lịch hẹn)
 * Thay đổi chỉ THÊM cột + index + CHECK, không đụng dữ liệu cũ.
 */
module.exports = {
  up: async (queryInterface) => {
    const q = (sql) => queryInterface.sequelize.query(sql);
    // MySQL không cho DROP và ADD cùng tên khoá ngoại trong một ALTER -> tách bước
    await q("ALTER TABLE queue_tickets DROP FOREIGN KEY fk_qt_booking");
    await q(`ALTER TABLE queue_tickets
      ADD COLUMN sort_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Khoá sắp xếp trong hàng đợi' AFTER postponed_count,
      ADD COLUMN walk_in_name VARCHAR(200) NULL AFTER sort_at,
      ADD COLUMN walk_in_phone VARCHAR(32) NULL AFTER walk_in_name,
      ADD KEY idx_queue_order (doctor_id, ticket_date, status, sort_at),
      ADD CONSTRAINT fk_qt_booking FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE RESTRICT,
      ADD CONSTRAINT chk_queue_identity CHECK (booking_id IS NOT NULL OR walk_in_name IS NOT NULL)`);
  },
  down: async (queryInterface) => {
    const q = (sql) => queryInterface.sequelize.query(sql);
    await q("ALTER TABLE queue_tickets DROP CONSTRAINT chk_queue_identity");
    await q("ALTER TABLE queue_tickets DROP FOREIGN KEY fk_qt_booking");
    await q(`ALTER TABLE queue_tickets
      DROP KEY idx_queue_order,
      DROP COLUMN walk_in_phone,
      DROP COLUMN walk_in_name,
      DROP COLUMN sort_at,
      ADD CONSTRAINT fk_qt_booking FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE SET NULL`);
  },
};
