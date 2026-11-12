/**
 * BẢNG PHÂN QUYỀN TẬP TRUNG (default-deny) – mỗi route gắn với PERMISSION (config/permissions.js).
 * Route không có trong bảng sẽ bị 403.
 *
 * access: PUBLIC | AUTH (mọi người đã đăng nhập) | [permission...] (cần ít nhất một quyền).
 * Quyền hạn của từng vai trò nằm trong DB (rbac_role_permissions), admin chỉnh được.
 * Với dữ liệu thuộc về người dùng (own / treated) còn có thêm lớp policy ở middleware/policies.js.
 */
const { P } = require("./permissions");

const PUBLIC = "public";
const AUTH = "auth";

const CANCEL = [P.BOOKING_CANCEL_OWN, P.BOOKING_CANCEL_ASSIGNED, P.BOOKING_CANCEL_ANY];

module.exports = {
  PUBLIC,
  AUTH,
  RULES: [
    // ---- Auth ----
    ["POST", "/api/register", PUBLIC],
    ["POST", "/api/login", PUBLIC],
    ["POST", "/api/logout", PUBLIC],
    ["POST", "/api/refresh-token", PUBLIC],
    ["POST", "/api/login-patient-chat", PUBLIC],
    ["POST", "/api/save-fcm-token", AUTH], // chính chủ hoặc user:update (kiểm ở route)

    // ---- Quản lý người dùng & vai trò ----
    ["GET", "/api/get_all_users", AUTH], // id=ALL cần user:read:any, id khác chỉ chính chủ
    ["POST", "/api/create_new_users", [P.USER_CREATE]],
    ["DELETE", "/api/delete_users", [P.USER_DELETE]],
    ["PUT", "/api/edit_users", [P.USER_UPDATE]],
    ["GET", "/api/allcode", PUBLIC],
    ["GET", "/api/rbac/me", AUTH],
    ["GET", "/api/rbac/roles", [P.ROLE_MANAGE]],
    ["POST", "/api/rbac/roles", [P.ROLE_MANAGE]],
    ["GET", "/api/rbac/permissions", [P.ROLE_MANAGE]],
    ["PUT", "/api/rbac/roles/:code/permissions", [P.ROLE_MANAGE]],
    ["DELETE", "/api/rbac/roles/:code", [P.ROLE_MANAGE]],
    ["PUT", "/api/rbac/users/:id/role", [P.ROLE_ASSIGN]],
    ["PUT", "/api/rbac/users/:id/active", [P.USER_UPDATE]],
    ["GET", "/api/rbac/audit-logs", [P.AUDIT_READ]],

    // ---- Bác sĩ (dữ liệu công khai cho trang đặt lịch + chatbot) ----
    ["GET", "/api/top-doctor-home", PUBLIC],
    ["GET", "/api/get_all_doctor", PUBLIC],
    ["GET", "/api/get_detail_doctor_by_id", PUBLIC],
    ["GET", "/api/get-extra-doctor-by-id", PUBLIC],
    ["GET", "/api/get-profile-doctor-by-id", PUBLIC],
    ["GET", "/api/get_schedule_doctor_by_date", PUBLIC],
    ["POST", "/api/save_detail_doctor", [P.DOCTOR_PROFILE_UPDATE]],
    ["POST", "/api/bulk_create_schedule", [P.SCHEDULE_MANAGE]],

    // ---- Đặt lịch ----
    ["POST", "/api/patient-book-appointment", PUBLIC],
    ["POST", "/api/verify-book-appointment", PUBLIC],
    ["POST", "/api/cancel-appointment", CANCEL],
    ["GET", "/api/get-patient-appointments", AUTH], // policy: own / any / treated
    ["GET", "/api/get-patient-history", AUTH], // policy: own / any / treated (+ audit)

    // ---- Khám bệnh / kê đơn ----
    ["GET", "/api/get-list-patient-for-doctor", [P.PATIENT_LIST_READ]],
    ["POST", "/api/send-remedy", [P.PRESCRIPTION_CREATE]],
    ["POST", "/api/update-medical-appointment-status", [P.PRESCRIPTION_CREATE]],
    ["GET", "/api/get-medicines", [P.MEDICINE_READ]],

    // ---- Hàng đợi (quyền chi tiết + kiểm tra chủ vé/bác sĩ nằm trong queueService) ----
    ["POST", "/api/queue/check-in", AUTH], // nhân viên có queue:checkin hoặc chính bệnh nhân đặt lịch
    ["POST", "/api/queue/walk-in", [P.QUEUE_WALKIN_CREATE]],
    ["POST", "/api/queue/doctor/call-next", [P.QUEUE_CALL]],
    ["GET", "/api/queue/doctor/board", [P.QUEUE_CALL]],
    ["POST", "/api/queue/tickets/:id/call", [P.QUEUE_CALL]],
    ["POST", "/api/queue/tickets/:id/start", [P.QUEUE_START]],
    ["POST", "/api/queue/tickets/:id/finish", [P.QUEUE_FINISH]],
    ["POST", "/api/queue/tickets/:id/no-show", [P.QUEUE_NOSHOW]],
    ["POST", "/api/queue/tickets/:id/postpone", AUTH], // chủ vé hoặc queue:checkin
    ["POST", "/api/queue/tickets/:id/emergency", [P.QUEUE_EMERGENCY]],
    ["POST", "/api/queue/tickets/:id/cancel", AUTH], // chủ vé hoặc queue:checkin
    ["GET", "/api/queue/my-tickets", AUTH],
    ["GET", "/api/queue/rooms/:roomId/display", [P.QUEUE_DISPLAY_READ, P.QUEUE_CALL, P.QUEUE_CHECKIN, P.QUEUE_REBALANCE]],
    ["GET", "/api/queue/rooms", [P.QUEUE_CHECKIN, P.QUEUE_CALL, P.QUEUE_REBALANCE, P.ROOM_MANAGE]],
    ["POST", "/api/queue/rooms", [P.ROOM_MANAGE]],
    ["PUT", "/api/queue/rooms/:id", [P.ROOM_MANAGE]],
    ["PUT", "/api/queue/assign-room", [P.ROOM_MANAGE]],

    // ---- Thanh toán ----
    ["GET", "/api/check-paid", [P.PAYMENT_READ]],
    ["POST", "/api/send-payment", [P.PAYMENT_CONFIRM]],
    // Webhook: tự xác thực bằng chữ ký/token trong controller
    ["POST", "/api/payos/webhook", PUBLIC],
    ["POST", "/api/casso/webhook", PUBLIC],
    ["POST", "/api/payos/create-payment-link", PUBLIC],

    // ---- Chat / upload ----
    ["GET", "/api/get-msg/:receiverId", AUTH],
    ["POST", "/api/del-msg/:id", AUTH],
    ["POST", "/api/upload-file", AUTH],

    // ---- Nội dung ----
    ["POST", "/api/create-new-handbook", [P.CONTENT_MANAGE]],
    ["GET", "/api/get-handbook", PUBLIC],
    ["GET", "/api/get-detail-handbook-by-id", PUBLIC],
    ["GET", "/api/get-related-handbooks", PUBLIC],
    ["POST", "/api/create-new-specialty", [P.CONTENT_MANAGE]],
    ["GET", "/api/get-specialty", PUBLIC],
    ["GET", "/api/get-detail-specialty-by-id", PUBLIC],
    ["POST", "/api/create-new-clinic", [P.CONTENT_MANAGE]],
    ["GET", "/api/get-clinic", PUBLIC],
    ["GET", "/api/get-detail-clinic-by-id", PUBLIC],

    // ---- Gói khám ----
    ["GET", "/api/packages/all", PUBLIC],
    ["GET", "/api/packages/featured", PUBLIC],
    ["GET", "/api/packages/filter-options", PUBLIC],
    ["GET", "/api/packages/search", PUBLIC],
    ["GET", "/api/packages/booking-slots", PUBLIC],
    ["GET", "/api/packages/:id", PUBLIC],
    ["POST", "/api/packages/create", [P.CONTENT_MANAGE]],
    ["PUT", "/api/packages/update/:id", [P.CONTENT_MANAGE]],
    ["DELETE", "/api/packages/delete/:id", [P.CONTENT_MANAGE]],

    // ---- Cơ sở y tế ----
    ["GET", "/api/facilities/all", PUBLIC],
    ["GET", "/api/facilities/featured", PUBLIC],
    ["GET", "/api/facilities/filter-options", PUBLIC],
    ["GET", "/api/facilities/search", PUBLIC],
    ["GET", "/api/facilities/:id", PUBLIC],
    ["POST", "/api/facilities/create", [P.CONTENT_MANAGE]],
    ["PUT", "/api/facilities/update/:id", [P.CONTENT_MANAGE]],
    ["DELETE", "/api/facilities/delete/:id", [P.CONTENT_MANAGE]],

    // ---- Khảo sát sức khỏe ----
    ["GET", "/api/get_all_questions", AUTH],
    ["POST", "/api/submit-assessment", AUTH],
    ["GET", "/api/assessment-detail-by-id/:id", AUTH],
    ["GET", "/api/assessment-history-by-userid/:userId", AUTH], // policy: own / any / treated
    ["POST", "/api/create-new-question", [P.CONTENT_MANAGE]],
    ["PUT", "/api/edit-question", [P.CONTENT_MANAGE]],
    ["GET", "/api/questions/:id", AUTH],
    ["DELETE", "/api/questions/:id", [P.CONTENT_MANAGE]],
    ["GET", "/api/category-questions", AUTH],
    ["POST", "/api/category-questions", [P.CONTENT_MANAGE]],
    ["GET", "/api/category-questions/:categoryId/questions", AUTH],
  ],
};
