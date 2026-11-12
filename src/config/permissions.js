/**
 * NGUỒN SỰ THẬT DUY NHẤT cho phân quyền (RBAC cấp quyền hạn).
 *
 * - PERMISSIONS: danh mục quyền `resource:action` do code khai báo. Lúc khởi động hệ thống
 *   tự đồng bộ vào bảng rbac_permissions (admin chỉ gán quyền cho vai trò, không tạo quyền mới).
 * - SYSTEM_ROLES: vai trò hệ thống + quyền mặc định. Mã vai trò (`code`) chính là giá trị
 *   users.roleId (R1..R4 giữ nguyên để tương thích frontend; R5..R8 là vai trò mới).
 * - Quyền mặc định chỉ được cấp khi vai trò MỚI được tạo / quyền MỚI xuất hiện lần đầu,
 *   nên các chỉnh sửa của admin sau đó không bị ghi đè.
 */
const P = {
  // Người dùng & vai trò
  USER_READ_ANY: "user:read:any",
  USER_CREATE: "user:create",
  USER_UPDATE: "user:update",
  USER_DELETE: "user:delete",
  ROLE_ASSIGN: "role:assign",
  ROLE_MANAGE: "role:manage",
  // Lịch & bác sĩ
  SCHEDULE_MANAGE: "schedule:manage",
  DOCTOR_DATA_ANY: "doctor-data:manage:any", // thao tác thay mọi bác sĩ (không bị ép doctorId = chính mình)
  DOCTOR_PROFILE_UPDATE: "doctor-profile:update",
  // Đặt lịch
  BOOKING_CANCEL_OWN: "booking:cancel:own",
  BOOKING_CANCEL_ASSIGNED: "booking:cancel:assigned",
  BOOKING_CANCEL_ANY: "booking:cancel:any",
  BOOKING_READ_OWN: "booking:read:own",
  BOOKING_READ_ANY: "booking:read:any",
  // Hồ sơ y tế
  RECORD_READ_OWN: "patient-record:read:own",
  RECORD_READ_TREATED: "patient-record:read:treated",
  RECORD_READ_ANY: "patient-record:read:any",
  PRESCRIPTION_CREATE: "prescription:create",
  PATIENT_LIST_READ: "patient-list:read",
  MEDICINE_READ: "medicine:read",
  // Thanh toán
  PAYMENT_READ: "payment:read",
  PAYMENT_CONFIRM: "payment:confirm",
  // Nội dung, báo cáo, hệ thống
  CONTENT_MANAGE: "content:manage",
  ANALYTICS_READ: "analytics:read",
  AI_METRICS_READ: "ai-metrics:read",
  AUDIT_READ: "audit:read",
  // Hàng đợi (dùng cho nhóm chức năng B)
  QUEUE_CHECKIN: "queue:checkin",
  QUEUE_WALKIN_CREATE: "queue:walkin:create",
  QUEUE_CALL: "queue:call",
  QUEUE_START: "queue:start",
  QUEUE_FINISH: "queue:finish",
  QUEUE_NOSHOW: "queue:noshow",
  QUEUE_EMERGENCY: "queue:emergency",
  QUEUE_REBALANCE: "queue:rebalance",
  QUEUE_DISPLAY_READ: "queue:display:read",
  ROOM_MANAGE: "room:manage",
};

const DESCRIPTIONS = {
  [P.USER_READ_ANY]: "Xem danh sách/hồ sơ mọi người dùng",
  [P.USER_CREATE]: "Tạo tài khoản người dùng",
  [P.USER_UPDATE]: "Sửa thông tin, khóa/mở tài khoản",
  [P.USER_DELETE]: "Xóa tài khoản",
  [P.ROLE_ASSIGN]: "Gán/đổi vai trò cho người dùng",
  [P.ROLE_MANAGE]: "Quản lý vai trò và quyền của vai trò",
  [P.SCHEDULE_MANAGE]: "Tạo/sửa lịch làm việc bác sĩ",
  [P.DOCTOR_DATA_ANY]: "Thao tác dữ liệu của bác sĩ bất kỳ",
  [P.DOCTOR_PROFILE_UPDATE]: "Cập nhật hồ sơ bác sĩ",
  [P.BOOKING_CANCEL_OWN]: "Huỷ lịch hẹn của chính mình",
  [P.BOOKING_CANCEL_ASSIGNED]: "Huỷ lịch hẹn được phân cho mình (bác sĩ)",
  [P.BOOKING_CANCEL_ANY]: "Huỷ mọi lịch hẹn",
  [P.BOOKING_READ_OWN]: "Xem lịch hẹn của chính mình",
  [P.BOOKING_READ_ANY]: "Xem lịch hẹn của mọi bệnh nhân",
  [P.RECORD_READ_OWN]: "Xem hồ sơ bệnh án của chính mình",
  [P.RECORD_READ_TREATED]: "Xem hồ sơ bệnh nhân có quan hệ điều trị",
  [P.RECORD_READ_ANY]: "Xem hồ sơ bệnh án của mọi bệnh nhân",
  [P.PRESCRIPTION_CREATE]: "Kê đơn / cập nhật trạng thái khám",
  [P.PATIENT_LIST_READ]: "Xem danh sách bệnh nhân khám",
  [P.MEDICINE_READ]: "Xem danh mục thuốc",
  [P.PAYMENT_READ]: "Xem giao dịch/viện phí",
  [P.PAYMENT_CONFIRM]: "Xác nhận thanh toán",
  [P.CONTENT_MANAGE]: "Quản lý nội dung (cẩm nang, chuyên khoa, phòng khám, gói khám, khảo sát)",
  [P.ANALYTICS_READ]: "Xem báo cáo vận hành",
  [P.AI_METRICS_READ]: "Xem chỉ số đối sánh AI",
  [P.AUDIT_READ]: "Xem nhật ký truy cập",
  [P.QUEUE_CHECKIN]: "Check-in bệnh nhân",
  [P.QUEUE_WALKIN_CREATE]: "Đăng ký bệnh nhân vãng lai",
  [P.QUEUE_CALL]: "Gọi số",
  [P.QUEUE_START]: "Bắt đầu ca khám",
  [P.QUEUE_FINISH]: "Hoàn thành ca khám",
  [P.QUEUE_NOSHOW]: "Đánh dấu vắng mặt",
  [P.QUEUE_EMERGENCY]: "Ưu tiên khẩn cấp",
  [P.QUEUE_REBALANCE]: "Cân bằng tải phòng khám",
  [P.QUEUE_DISPLAY_READ]: "Đọc dữ liệu màn hình TV sảnh",
  [P.ROOM_MANAGE]: "Quản lý phòng khám vật lý và gán phòng cho bác sĩ",
};

const PERMISSIONS = Object.values(P).map((code) => ({
  code,
  group: code.split(":")[0],
  description: DESCRIPTIONS[code] || code,
}));

const ADMIN_PERMS = [
  P.USER_READ_ANY, P.USER_CREATE, P.USER_UPDATE, P.USER_DELETE, P.ROLE_ASSIGN, P.ROLE_MANAGE,
  P.SCHEDULE_MANAGE, P.DOCTOR_DATA_ANY, P.DOCTOR_PROFILE_UPDATE,
  P.BOOKING_CANCEL_OWN, P.BOOKING_CANCEL_ANY, P.BOOKING_READ_OWN, P.BOOKING_READ_ANY,
  P.RECORD_READ_OWN, // Admin KHÔNG mặc định xem hồ sơ bệnh án của người khác (bật thủ công khi cần)
  P.PATIENT_LIST_READ, P.MEDICINE_READ, P.PAYMENT_READ, P.PAYMENT_CONFIRM,
  P.CONTENT_MANAGE, P.ANALYTICS_READ, P.AI_METRICS_READ, P.AUDIT_READ, P.ROOM_MANAGE,
];

/** Quyền không được phép gỡ khỏi ADMIN (chống tự khoá hệ thống). */
const ADMIN_LOCKED_PERMS = [P.ROLE_MANAGE, P.ROLE_ASSIGN, P.USER_READ_ANY, P.USER_UPDATE, P.AUDIT_READ];

const SYSTEM_ROLES = [
  { code: "R1", name: "ADMIN", description: "Quản trị hệ thống", permissions: ADMIN_PERMS },
  {
    code: "R2",
    name: "DOCTOR",
    description: "Bác sĩ",
    permissions: [
      P.SCHEDULE_MANAGE, P.DOCTOR_PROFILE_UPDATE, P.BOOKING_CANCEL_ASSIGNED, P.BOOKING_READ_OWN,
      P.RECORD_READ_OWN, P.RECORD_READ_TREATED, P.PRESCRIPTION_CREATE, P.PATIENT_LIST_READ, P.MEDICINE_READ,
      P.QUEUE_CALL, P.QUEUE_START, P.QUEUE_FINISH, P.QUEUE_NOSHOW, P.QUEUE_EMERGENCY,
    ],
  },
  {
    code: "R3",
    name: "PATIENT",
    description: "Bệnh nhân",
    permissions: [P.BOOKING_CANCEL_OWN, P.BOOKING_READ_OWN, P.RECORD_READ_OWN],
  },
  {
    code: "R4",
    name: "CASHIER",
    description: "Thu ngân",
    permissions: [P.PAYMENT_READ, P.PAYMENT_CONFIRM, P.PATIENT_LIST_READ],
  },
  {
    code: "R5",
    name: "RECEPTIONIST",
    description: "Lễ tân",
    permissions: [P.QUEUE_CHECKIN, P.QUEUE_WALKIN_CREATE, P.QUEUE_EMERGENCY, P.BOOKING_READ_ANY, P.BOOKING_CANCEL_ANY],
  },
  {
    code: "R6",
    name: "NURSE",
    description: "Điều dưỡng",
    permissions: [P.QUEUE_CHECKIN, P.QUEUE_EMERGENCY, P.BOOKING_READ_ANY],
  },
  {
    code: "R7",
    name: "COORDINATOR",
    description: "Điều phối viên",
    permissions: [P.QUEUE_REBALANCE, P.ANALYTICS_READ, P.BOOKING_READ_ANY],
  },
  {
    code: "R8",
    name: "DISPLAY_DEVICE",
    description: "Thiết bị màn hình TV sảnh (tài khoản dịch vụ, chỉ đọc)",
    permissions: [P.QUEUE_DISPLAY_READ],
  },
];

const SYSTEM_ROLE_CODES = SYSTEM_ROLES.map((r) => r.code);
const ADMIN_ROLE = "R1";
const DEFAULT_ROLE_PERMISSIONS = Object.fromEntries(SYSTEM_ROLES.map((r) => [r.code, r.permissions]));

module.exports = {
  P,
  PERMISSIONS,
  SYSTEM_ROLES,
  SYSTEM_ROLE_CODES,
  ADMIN_ROLE,
  ADMIN_LOCKED_PERMS,
  DEFAULT_ROLE_PERMISSIONS,
};
