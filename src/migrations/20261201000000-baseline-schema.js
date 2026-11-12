"use strict";

/**
 * BASELINE SCHEMA v2 – thiết kế một lần, dùng lâu dài.
 * Tài liệu: DB_ThietKe_Moi.md (ở thư mục gốc dự án).
 *
 * Quy ước:
 *  - InnoDB, utf8mb4_unicode_ci; tên bảng/cột snake_case, bảng số nhiều.
 *  - Khoá chính BIGINT UNSIGNED; khoá ngoại `<thực thể>_id` cùng kiểu; mọi quan hệ đều có FOREIGN KEY.
 *  - Ngày = DATE, giờ = DATETIME, tiền = DECIMAL, trạng thái nội bộ = ENUM, danh mục sửa được = reference_codes.
 *  - Ràng buộc nghiệp vụ đặt ở DB khi có thể (UNIQUE, CHECK, cột sinh tự động).
 *  - Cột JSON-dạng-TEXT luôn có CHECK(JSON_VALID) để tương thích code cũ nhưng vẫn đảm bảo hợp lệ.
 */
const TS = `created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`;
const ENGINE = "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
const ID = "id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT";
const CODE = "VARCHAR(32)"; // kiểu của reference_codes.code và rbac_roles.code

// Danh sách bảng theo THỨ TỰ TẠO (bảng cha trước). down() xoá theo thứ tự ngược lại.
const TABLES = [
  [
    "reference_codes",
    `CREATE TABLE reference_codes (
  ${ID},
  type VARCHAR(32) NOT NULL COMMENT 'GENDER|POSITION|PRICE|PROVINCE|PAYMENT|ROLE|STATUS|TIME',
  code ${CODE} NOT NULL COMMENT 'Mã duy nhất toàn cục (R1, S2, T3, PRI1...)',
  label_vi VARCHAR(255) NOT NULL,
  label_en VARCHAR(255) NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  numeric_value DECIMAL(14,2) NULL COMMENT 'Giá trị số (vd. mức giá khám)',
  meta JSON NULL COMMENT 'Dữ liệu thêm (vd. TIME: {"start":"08:00","end":"09:00"})',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  ${TS},
  PRIMARY KEY (id),
  UNIQUE KEY uq_reference_codes_code (code),
  KEY idx_reference_codes_type (type, sort_order)
) ${ENGINE}`,
  ],
  [
    "rbac_roles",
    `CREATE TABLE rbac_roles (
  code ${CODE} NOT NULL,
  name VARCHAR(64) NOT NULL,
  description VARCHAR(255) NULL,
  is_system TINYINT(1) NOT NULL DEFAULT 0,
  ${TS},
  PRIMARY KEY (code),
  UNIQUE KEY uq_rbac_roles_name (name)
) ${ENGINE}`,
  ],
  [
    "rbac_permissions",
    `CREATE TABLE rbac_permissions (
  code VARCHAR(64) NOT NULL,
  \`group\` VARCHAR(32) NOT NULL,
  description VARCHAR(255) NULL,
  ${TS},
  PRIMARY KEY (code)
) ${ENGINE}`,
  ],
  [
    "rbac_role_permissions",
    `CREATE TABLE rbac_role_permissions (
  role_code ${CODE} NOT NULL,
  permission_code VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_code, permission_code),
  CONSTRAINT fk_rrp_role FOREIGN KEY (role_code) REFERENCES rbac_roles (code) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_rrp_perm FOREIGN KEY (permission_code) REFERENCES rbac_permissions (code) ON UPDATE CASCADE ON DELETE CASCADE
) ${ENGINE}`,
  ],
  [
    "users",
    `CREATE TABLE users (
  ${ID},
  email VARCHAR(191) NOT NULL,
  password VARCHAR(255) NULL COMMENT 'bcrypt hash; NULL = tài khoản khách chưa đặt mật khẩu',
  first_name VARCHAR(100) NOT NULL DEFAULT '',
  last_name VARCHAR(100) NOT NULL DEFAULT '',
  phone_number VARCHAR(32) NULL,
  address VARCHAR(255) NULL,
  gender_code ${CODE} NULL,
  position_code ${CODE} NULL COMMENT 'Học hàm/học vị (bác sĩ)',
  role_code ${CODE} NOT NULL DEFAULT 'R3',
  image LONGBLOB NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  token_version INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Tăng khi đổi quyền/khoá/đăng xuất mọi nơi -> thu hồi token',
  last_login_at DATETIME NULL,
  deleted_at DATETIME NULL COMMENT 'Xoá mềm: bản ghi y tế/thanh toán không bao giờ mất tham chiếu',
  ${TS},
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role_code),
  CONSTRAINT fk_users_gender FOREIGN KEY (gender_code) REFERENCES reference_codes (code) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_users_position FOREIGN KEY (position_code) REFERENCES reference_codes (code) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_users_role FOREIGN KEY (role_code) REFERENCES rbac_roles (code) ON UPDATE CASCADE ON DELETE RESTRICT
) ${ENGINE}`,
  ],
  [
    "device_tokens",
    `CREATE TABLE device_tokens (
  ${ID},
  user_id BIGINT UNSIGNED NOT NULL,
  token VARCHAR(512) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  platform VARCHAR(16) NOT NULL DEFAULT 'web',
  last_seen_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_device_tokens_hash (token_hash),
  KEY idx_device_tokens_user (user_id),
  CONSTRAINT fk_device_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ${ENGINE}`,
  ],
  [
    "refresh_tokens",
    `CREATE TABLE refresh_tokens (
  ${ID},
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  replaced_by_hash CHAR(64) NULL,
  ip VARCHAR(64) NULL,
  user_agent VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_refresh_tokens_hash (token_hash),
  KEY idx_refresh_tokens_user (user_id, revoked_at),
  KEY idx_refresh_tokens_expiry (expires_at),
  CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ${ENGINE}`,
  ],
  [
    "access_audit_logs",
    `CREATE TABLE access_audit_logs (
  ${ID},
  user_id BIGINT UNSIGNED NULL,
  role_code ${CODE} NULL,
  action VARCHAR(64) NOT NULL,
  resource VARCHAR(64) NULL,
  resource_id VARCHAR(64) NULL,
  result ENUM('ALLOWED','DENIED','FAILED') NOT NULL DEFAULT 'ALLOWED',
  ip VARCHAR(64) NULL,
  meta TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_user (user_id, created_at),
  KEY idx_audit_action (action, created_at),
  KEY idx_audit_resource (resource, resource_id),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ${ENGINE}`,
  ],
  [
    "patient_profiles",
    `CREATE TABLE patient_profiles (
  ${ID},
  owner_user_id BIGINT UNSIGNED NOT NULL COMMENT 'Tài khoản quản lý hồ sơ',
  relationship ENUM('SELF','CHILD','PARENT','SPOUSE','OTHER') NOT NULL DEFAULT 'SELF',
  full_name VARCHAR(200) NOT NULL,
  date_of_birth DATE NULL,
  gender_code ${CODE} NULL,
  phone_number VARCHAR(32) NULL,
  address VARCHAR(255) NULL,
  insurance_number VARCHAR(32) NULL,
  blood_type ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NULL,
  allergies TEXT NULL,
  chronic_conditions TEXT NULL,
  self_flag TINYINT GENERATED ALWAYS AS (IF(relationship = 'SELF', 1, NULL)) STORED,
  deleted_at DATETIME NULL,
  ${TS},
  PRIMARY KEY (id),
  UNIQUE KEY uq_patient_profiles_one_self (owner_user_id, self_flag) COMMENT 'Mỗi tài khoản chỉ có 1 hồ sơ SELF',
  KEY idx_patient_profiles_owner (owner_user_id),
  CONSTRAINT fk_pp_owner FOREIGN KEY (owner_user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_pp_gender FOREIGN KEY (gender_code) REFERENCES reference_codes (code) ON UPDATE CASCADE ON DELETE SET NULL
) ${ENGINE}`,
  ],
  [
    "specialties",
    `CREATE TABLE specialties (
  ${ID},
  image LONGBLOB NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  ${TS},
  PRIMARY KEY (id)
) ${ENGINE}`,
  ],
  [
    "specialty_translations",
    `CREATE TABLE specialty_translations (
  ${ID},
  specialty_id BIGINT UNSIGNED NOT NULL,
  lang CHAR(2) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description MEDIUMTEXT NULL,
  content_markdown MEDIUMTEXT NULL,
  content_html MEDIUMTEXT NULL,
  ${TS},
  PRIMARY KEY (id),
  UNIQUE KEY uq_specialty_translations (specialty_id, lang),
  CONSTRAINT chk_specialty_translations_lang CHECK (lang IN ('vi','en')),
  CONSTRAINT fk_st_specialty FOREIGN KEY (specialty_id) REFERENCES specialties (id) ON DELETE CASCADE
) ${ENGINE}`,
  ],
  [
    "clinics",
    `CREATE TABLE clinics (
  ${ID},
  image LONGBLOB NULL,
  phone_number VARCHAR(32) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  ${TS},
  PRIMARY KEY (id)
) ${ENGINE}`,
  ],
  [
    "clinic_translations",
    `CREATE TABLE clinic_translations (
  ${ID},
  clinic_id BIGINT UNSIGNED NOT NULL,
  lang CHAR(2) NOT NULL,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(255) NULL,
  description MEDIUMTEXT NULL,
  content_markdown MEDIUMTEXT NULL,
  content_html MEDIUMTEXT NULL,
  ${TS},
  PRIMARY KEY (id),
  UNIQUE KEY uq_clinic_translations (clinic_id, lang),
  CONSTRAINT chk_clinic_translations_lang CHECK (lang IN ('vi','en')),
  CONSTRAINT fk_ct_clinic FOREIGN KEY (clinic_id) REFERENCES clinics (id) ON DELETE CASCADE
) ${ENGINE}`,
  ],
  [
    "rooms",
    `CREATE TABLE rooms (
  ${ID},
  clinic_id BIGINT UNSIGNED NOT NULL,
  specialty_id BIGINT UNSIGNED NULL,
  code VARCHAR(32) NOT NULL,
  name VARCHAR(100) NOT NULL,
  floor VARCHAR(16) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  ${TS},
  PRIMARY KEY (id),
  UNIQUE KEY uq_rooms_code (clinic_id, code),
  KEY idx_rooms_specialty (specialty_id),
  CONSTRAINT fk_rooms_clinic FOREIGN KEY (clinic_id) REFERENCES clinics (id) ON DELETE CASCADE,
  CONSTRAINT fk_rooms_specialty FOREIGN KEY (specialty_id) REFERENCES specialties (id) ON DELETE SET NULL
) ${ENGINE}`,
  ],
  [
    "handbooks",
    `CREATE TABLE handbooks (
  ${ID},
  image LONGBLOB NULL,
  category VARCHAR(100) NULL,
  authors TEXT NULL,
  reviewers TEXT NULL,
  published_on DATE NULL,
  last_reviewed_on DATE NULL,
  views INT UNSIGNED NOT NULL DEFAULT 0,
  ${TS},
  PRIMARY KEY (id),
  CONSTRAINT chk_handbooks_authors CHECK (authors IS NULL OR JSON_VALID(authors)),
  CONSTRAINT chk_handbooks_reviewers CHECK (reviewers IS NULL OR JSON_VALID(reviewers))
) ${ENGINE}`,
  ],
  [
    "handbook_translations",
    `CREATE TABLE handbook_translations (
  ${ID},
  handbook_id BIGINT UNSIGNED NOT NULL,
  lang CHAR(2) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description MEDIUMTEXT NULL,
  content_markdown MEDIUMTEXT NULL,
  content_html MEDIUMTEXT NULL,
  ${TS},
  PRIMARY KEY (id),
  UNIQUE KEY uq_handbook_translations (handbook_id, lang),
  CONSTRAINT chk_handbook_translations_lang CHECK (lang IN ('vi','en')),
  CONSTRAINT fk_ht_handbook FOREIGN KEY (handbook_id) REFERENCES handbooks (id) ON DELETE CASCADE
) ${ENGINE}`,
  ],
  [
    "facilities",
    `CREATE TABLE facilities (
  ${ID},
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  logo VARCHAR(255) NULL,
  address TEXT NULL,
  phone VARCHAR(32) NULL,
  email VARCHAR(191) NULL,
  website VARCHAR(255) NULL,
  type VARCHAR(32) NULL,
  level VARCHAR(32) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  rating DECIMAL(3,2) NOT NULL DEFAULT 0,
  total_reviews INT UNSIGNED NOT NULL DEFAULT 0,
  working_hours TEXT NULL,
  services TEXT NULL,
  specialties TEXT NULL,
  images TEXT NULL,
  location TEXT NULL,
  ${TS},
  PRIMARY KEY (id),
  KEY idx_facilities_listing (is_active, is_featured),
  CONSTRAINT chk_facilities_rating CHECK (rating BETWEEN 0 AND 5),
  CONSTRAINT chk_facilities_working_hours CHECK (working_hours IS NULL OR JSON_VALID(working_hours)),
  CONSTRAINT chk_facilities_services CHECK (services IS NULL OR JSON_VALID(services)),
  CONSTRAINT chk_facilities_specialties CHECK (specialties IS NULL OR JSON_VALID(specialties)),
  CONSTRAINT chk_facilities_images CHECK (images IS NULL OR JSON_VALID(images)),
  CONSTRAINT chk_facilities_location CHECK (location IS NULL OR JSON_VALID(location))
) ${ENGINE}`,
  ],
  [
    "packages",
    `CREATE TABLE packages (
  ${ID},
  facility_id BIGINT UNSIGNED NOT NULL,
  specialty_id BIGINT UNSIGNED NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  image VARCHAR(255) NULL,
  category VARCHAR(100) NULL,
  gender ENUM('male','female','both') NOT NULL DEFAULT 'both',
  age_range VARCHAR(32) NULL,
  duration INT UNSIGNED NULL COMMENT 'phút',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  included_services TEXT NULL,
  excluded_services TEXT NULL,
  requirements TEXT NULL,
  notes TEXT NULL,
  ${TS},
  PRIMARY KEY (id),
  KEY idx_packages_facility (facility_id),
  KEY idx_packages_specialty (specialty_id),
  KEY idx_packages_listing (is_active, is_featured),
  CONSTRAINT chk_packages_price CHECK (price >= 0),
  CONSTRAINT chk_packages_included CHECK (included_services IS NULL OR JSON_VALID(included_services)),
  CONSTRAINT chk_packages_excluded CHECK (excluded_services IS NULL OR JSON_VALID(excluded_services)),
  CONSTRAINT fk_packages_facility FOREIGN KEY (facility_id) REFERENCES facilities (id) ON DELETE RESTRICT,
  CONSTRAINT fk_packages_specialty FOREIGN KEY (specialty_id) REFERENCES specialties (id) ON DELETE SET NULL
) ${ENGINE}`,
  ],
  [
    "doctor_profiles",
    `CREATE TABLE doctor_profiles (
  doctor_id BIGINT UNSIGNED NOT NULL COMMENT '= users.id của bác sĩ',
  specialty_id BIGINT UNSIGNED NOT NULL,
  clinic_id BIGINT UNSIGNED NOT NULL,
  price_code ${CODE} NOT NULL,
  province_code ${CODE} NULL,
  payment_code ${CODE} NULL,
  years_of_experience TINYINT UNSIGNED NULL,
  booking_count INT UNSIGNED NOT NULL DEFAULT 0,
  ${TS},
  PRIMARY KEY (doctor_id),
  KEY idx_dp_specialty (specialty_id),
  KEY idx_dp_clinic (clinic_id),
  CONSTRAINT fk_dp_doctor FOREIGN KEY (doctor_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_dp_specialty FOREIGN KEY (specialty_id) REFERENCES specialties (id) ON DELETE RESTRICT,
  CONSTRAINT fk_dp_clinic FOREIGN KEY (clinic_id) REFERENCES clinics (id) ON DELETE RESTRICT,
  CONSTRAINT fk_dp_price FOREIGN KEY (price_code) REFERENCES reference_codes (code) ON UPDATE CASCADE,
  CONSTRAINT fk_dp_province FOREIGN KEY (province_code) REFERENCES reference_codes (code) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_dp_payment FOREIGN KEY (payment_code) REFERENCES reference_codes (code) ON UPDATE CASCADE ON DELETE SET NULL
) ${ENGINE}`,
  ],
  [
    "doctor_profile_translations",
    `CREATE TABLE doctor_profile_translations (
  ${ID},
  doctor_id BIGINT UNSIGNED NOT NULL,
  lang CHAR(2) NOT NULL,
  clinic_name VARCHAR(255) NULL,
  clinic_address VARCHAR(255) NULL,
  note VARCHAR(500) NULL,
  description MEDIUMTEXT NULL,
  content_markdown MEDIUMTEXT NULL,
  content_html MEDIUMTEXT NULL,
  ${TS},
  PRIMARY KEY (id),
  UNIQUE KEY uq_dpt (doctor_id, lang),
  CONSTRAINT chk_dpt_lang CHECK (lang IN ('vi','en')),
  CONSTRAINT fk_dpt_doctor FOREIGN KEY (doctor_id) REFERENCES doctor_profiles (doctor_id) ON DELETE CASCADE
) ${ENGINE}`,
  ],
  [
    "schedules",
    `CREATE TABLE schedules (
  ${ID},
  doctor_id BIGINT UNSIGNED NOT NULL,
  work_date DATE NOT NULL,
  time_code ${CODE} NOT NULL,
  max_patients SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  current_patients SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('available','booked','closed') NOT NULL DEFAULT 'available',
  room_id BIGINT UNSIGNED NULL,
  ${TS},
  PRIMARY KEY (id),
  UNIQUE KEY uq_schedules_slot (doctor_id, work_date, time_code),
  KEY idx_schedules_date (work_date),
  CONSTRAINT chk_schedules_capacity CHECK (max_patients >= 1 AND current_patients <= max_patients),
  CONSTRAINT fk_schedules_doctor FOREIGN KEY (doctor_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_schedules_time FOREIGN KEY (time_code) REFERENCES reference_codes (code) ON UPDATE CASCADE,
  CONSTRAINT fk_schedules_room FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE SET NULL
) ${ENGINE}`,
  ],
  [
    "bookings",
    `CREATE TABLE bookings (
  ${ID},
  code VARCHAR(16) NOT NULL COMMENT 'Mã vé hiển thị cho bệnh nhân',
  doctor_id BIGINT UNSIGNED NOT NULL,
  work_date DATE NOT NULL,
  time_code ${CODE} NOT NULL,
  patient_id BIGINT UNSIGNED NOT NULL COMMENT 'Tài khoản đặt lịch',
  patient_profile_id BIGINT UNSIGNED NULL COMMENT 'Người được khám (bản thân/người thân)',
  status_code ${CODE} NOT NULL DEFAULT 'S1',
  source ENUM('ONLINE','WALK_IN') NOT NULL DEFAULT 'ONLINE',
  symptoms TEXT NULL,
  confirm_token_hash CHAR(64) NULL COMMENT 'sha256 của token xác nhận email',
  hold_expires_at DATETIME NULL COMMENT 'Hạn giữ chỗ khi chưa xác nhận (S1)',
  confirmed_at DATETIME NULL,
  cancelled_at DATETIME NULL,
  cancel_reason VARCHAR(255) NULL,
  holder_flag TINYINT GENERATED ALWAYS AS (IF(status_code IN ('S1','S2','S3','S5','S6'), 1, NULL)) STORED,
  ${TS},
  PRIMARY KEY (id),
  UNIQUE KEY uq_bookings_code (code),
  UNIQUE KEY uq_bookings_confirm_token (confirm_token_hash),
  UNIQUE KEY uq_bookings_patient_slot (patient_id, work_date, time_code, holder_flag) COMMENT 'Một bệnh nhân không giữ 2 lịch cùng khung giờ',
  KEY idx_bookings_doctor_day (doctor_id, work_date, status_code),
  KEY idx_bookings_patient (patient_id, created_at),
  KEY idx_bookings_hold (status_code, hold_expires_at),
  KEY idx_bookings_profile (patient_profile_id),
  CONSTRAINT fk_bookings_slot FOREIGN KEY (doctor_id, work_date, time_code) REFERENCES schedules (doctor_id, work_date, time_code) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_bookings_patient FOREIGN KEY (patient_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_bookings_profile FOREIGN KEY (patient_profile_id) REFERENCES patient_profiles (id) ON DELETE SET NULL,
  CONSTRAINT fk_bookings_status FOREIGN KEY (status_code) REFERENCES reference_codes (code) ON UPDATE RESTRICT
) ${ENGINE}`,
  ],
  [
    "medical_records",
    `CREATE TABLE medical_records (
  ${ID},
  booking_id BIGINT UNSIGNED NULL,
  patient_id BIGINT UNSIGNED NOT NULL,
  patient_profile_id BIGINT UNSIGNED NULL,
  doctor_id BIGINT UNSIGNED NOT NULL,
  description MEDIUMTEXT NULL COMMENT 'JSON: chẩn đoán, khám lâm sàng, đơn thuốc...',
  document LONGBLOB NULL COMMENT 'PDF đơn thuốc/hoá đơn',
  ${TS},
  PRIMARY KEY (id),
  UNIQUE KEY uq_medical_records_booking (booking_id),
  KEY idx_mr_patient (patient_id, created_at),
  KEY idx_mr_doctor (doctor_id, created_at),
  CONSTRAINT fk_mr_booking FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE SET NULL,
  CONSTRAINT fk_mr_patient FOREIGN KEY (patient_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_mr_profile FOREIGN KEY (patient_profile_id) REFERENCES patient_profiles (id) ON DELETE SET NULL,
  CONSTRAINT fk_mr_doctor FOREIGN KEY (doctor_id) REFERENCES users (id) ON DELETE RESTRICT
) ${ENGINE}`,
  ],
  [
    "payments",
    `CREATE TABLE payments (
  ${ID},
  booking_id BIGINT UNSIGNED NOT NULL,
  cashier_name VARCHAR(255) NULL,
  amount DECIMAL(12,0) NOT NULL DEFAULT 0,
  payment_method VARCHAR(20) NOT NULL DEFAULT 'CASH',
  paid_at DATETIME NULL,
  gateway_ref VARCHAR(64) NULL COMMENT 'Mã giao dịch PayOS/Casso – chống xử lý webhook trùng',
  description TEXT NULL,
  ${TS},
  PRIMARY KEY (id),
  UNIQUE KEY uq_payments_booking (booking_id),
  UNIQUE KEY uq_payments_gateway_ref (gateway_ref),
  CONSTRAINT chk_payments_amount CHECK (amount >= 0),
  CONSTRAINT fk_payments_booking FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE RESTRICT
) ${ENGINE}`,
  ],
  [
    "messages",
    `CREATE TABLE messages (
  ${ID},
  sender_id BIGINT UNSIGNED NOT NULL,
  receiver_id BIGINT UNSIGNED NOT NULL,
  body TEXT NULL,
  file_url VARCHAR(512) NULL,
  file_type VARCHAR(100) NULL,
  file_name VARCHAR(255) NULL,
  ${TS},
  PRIMARY KEY (id),
  KEY idx_messages_pair (sender_id, receiver_id, created_at),
  KEY idx_messages_reverse (receiver_id, sender_id, created_at),
  CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_messages_receiver FOREIGN KEY (receiver_id) REFERENCES users (id) ON DELETE CASCADE
) ${ENGINE}`,
  ],
  [
    "medicines",
    `CREATE TABLE medicines (
  ${ID},
  name VARCHAR(255) NOT NULL,
  unit VARCHAR(50) NULL,
  description TEXT NULL,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  ${TS},
  PRIMARY KEY (id),
  UNIQUE KEY uq_medicines_name (name),
  CONSTRAINT chk_medicines_price CHECK (price >= 0)
) ${ENGINE}`,
  ],
  [
    "category_questions",
    `CREATE TABLE category_questions (
  ${ID},
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  ${TS},
  PRIMARY KEY (id)
) ${ENGINE}`,
  ],
  [
    "questions",
    `CREATE TABLE questions (
  ${ID},
  category_question_id BIGINT UNSIGNED NOT NULL,
  question_text TEXT NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  ${TS},
  PRIMARY KEY (id),
  KEY idx_questions_category (category_question_id, sort_order),
  CONSTRAINT fk_questions_category FOREIGN KEY (category_question_id) REFERENCES category_questions (id) ON DELETE RESTRICT
) ${ENGINE}`,
  ],
  [
    "question_options",
    `CREATE TABLE question_options (
  ${ID},
  question_id BIGINT UNSIGNED NOT NULL,
  option_text VARCHAR(255) NOT NULL,
  score INT NOT NULL DEFAULT 0,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  ${TS},
  PRIMARY KEY (id),
  KEY idx_question_options_question (question_id, sort_order),
  CONSTRAINT fk_qo_question FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE
) ${ENGINE}`,
  ],
  [
    "health_assessments",
    `CREATE TABLE health_assessments (
  ${ID},
  user_id BIGINT UNSIGNED NULL,
  guest_key VARCHAR(64) NULL COMMENT 'Định danh khách chưa đăng nhập (vd. user_1755943911197)',
  total_score INT NOT NULL DEFAULT 0,
  max_score INT NOT NULL DEFAULT 0,
  percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  health_level VARCHAR(100) NULL,
  answers JSON NULL,
  ai_advice TEXT NULL,
  completed_at DATETIME NULL,
  ${TS},
  PRIMARY KEY (id),
  KEY idx_ha_user (user_id, created_at),
  KEY idx_ha_guest (guest_key),
  CONSTRAINT chk_ha_owner CHECK (user_id IS NOT NULL OR guest_key IS NOT NULL),
  CONSTRAINT fk_ha_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT
) ${ENGINE}`,
  ],

  /* ===== Các bảng cho nhóm chức năng sắp làm (hàng đợi, AI, thông báo) – tạo sẵn để KHÔNG phải sửa schema về sau ===== */
  [
    "ml_model_versions",
    `CREATE TABLE ml_model_versions (
  ${ID},
  kind ENUM('DURATION','TRIAGE') NOT NULL,
  version VARCHAR(50) NOT NULL,
  algorithm VARCHAR(50) NOT NULL,
  metrics JSON NULL,
  artifact_path VARCHAR(255) NULL,
  trained_at DATETIME NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ml_versions (kind, version)
) ${ENGINE}`,
  ],
  [
    "queue_tickets",
    `CREATE TABLE queue_tickets (
  ${ID},
  booking_id BIGINT UNSIGNED NULL COMMENT 'NULL = bệnh nhân vãng lai',
  room_id BIGINT UNSIGNED NOT NULL,
  doctor_id BIGINT UNSIGNED NOT NULL,
  patient_profile_id BIGINT UNSIGNED NULL,
  ticket_date DATE NOT NULL,
  shift ENUM('MORNING','AFTERNOON') NOT NULL,
  seq INT UNSIGNED NOT NULL,
  display_no VARCHAR(16) NOT NULL,
  source ENUM('BOOKED','WALK_IN') NOT NULL DEFAULT 'BOOKED',
  priority ENUM('NORMAL','ELDERLY','EMERGENCY') NOT NULL DEFAULT 'NORMAL',
  status ENUM('BOOKED','CHECKED_IN','WAITING','CALLED','IN_PROGRESS','DONE','NO_SHOW','CANCELLED','POSTPONED') NOT NULL DEFAULT 'BOOKED',
  check_in_at DATETIME NULL,
  called_at DATETIME NULL,
  call_count TINYINT UNSIGNED NOT NULL DEFAULT 0,
  started_at DATETIME NULL,
  finished_at DATETIME NULL,
  postponed_count TINYINT UNSIGNED NOT NULL DEFAULT 0,
  ${TS},
  PRIMARY KEY (id),
  UNIQUE KEY uq_queue_seq (room_id, ticket_date, shift, seq),
  UNIQUE KEY uq_queue_booking (booking_id),
  KEY idx_queue_room_status (room_id, ticket_date, status),
  KEY idx_queue_doctor (doctor_id, ticket_date),
  CONSTRAINT fk_qt_booking FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE SET NULL,
  CONSTRAINT fk_qt_room FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE RESTRICT,
  CONSTRAINT fk_qt_doctor FOREIGN KEY (doctor_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_qt_profile FOREIGN KEY (patient_profile_id) REFERENCES patient_profiles (id) ON DELETE SET NULL
) ${ENGINE}`,
  ],
  [
    "queue_events",
    `CREATE TABLE queue_events (
  ${ID},
  ticket_id BIGINT UNSIGNED NOT NULL,
  event_type VARCHAR(32) NOT NULL,
  actor_user_id BIGINT UNSIGNED NULL,
  payload JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_qe_ticket (ticket_id, created_at),
  CONSTRAINT fk_qe_ticket FOREIGN KEY (ticket_id) REFERENCES queue_tickets (id) ON DELETE CASCADE,
  CONSTRAINT fk_qe_actor FOREIGN KEY (actor_user_id) REFERENCES users (id) ON DELETE SET NULL
) ${ENGINE}`,
  ],
  [
    "ai_predictions",
    `CREATE TABLE ai_predictions (
  ${ID},
  ticket_id BIGINT UNSIGNED NOT NULL,
  model_version_id BIGINT UNSIGNED NULL,
  predicted_duration_min DECIMAL(6,2) NOT NULL,
  predicted_wait_min DECIMAL(6,2) NULL,
  actual_duration_min DECIMAL(6,2) NULL,
  actual_wait_min DECIMAL(6,2) NULL,
  features JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ap_ticket (ticket_id),
  KEY idx_ap_model (model_version_id, created_at),
  CONSTRAINT fk_ap_ticket FOREIGN KEY (ticket_id) REFERENCES queue_tickets (id) ON DELETE CASCADE,
  CONSTRAINT fk_ap_model FOREIGN KEY (model_version_id) REFERENCES ml_model_versions (id) ON DELETE SET NULL
) ${ENGINE}`,
  ],
  [
    "symptom_intakes",
    `CREATE TABLE symptom_intakes (
  ${ID},
  booking_id BIGINT UNSIGNED NULL,
  user_id BIGINT UNSIGNED NULL,
  raw_text TEXT NOT NULL,
  severity ENUM('MILD','MODERATE','SEVERE') NULL,
  onset_days SMALLINT UNSIGNED NULL,
  suggested_specialty_id BIGINT UNSIGNED NULL,
  confidence DECIMAL(4,3) NULL,
  urgency ENUM('ROUTINE','URGENT','EMERGENCY') NULL,
  model_version_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_si_booking (booking_id),
  CONSTRAINT chk_si_confidence CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
  CONSTRAINT fk_si_booking FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE SET NULL,
  CONSTRAINT fk_si_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_si_specialty FOREIGN KEY (suggested_specialty_id) REFERENCES specialties (id) ON DELETE SET NULL,
  CONSTRAINT fk_si_model FOREIGN KEY (model_version_id) REFERENCES ml_model_versions (id) ON DELETE SET NULL
) ${ENGINE}`,
  ],
  [
    "notifications",
    `CREATE TABLE notifications (
  ${ID},
  user_id BIGINT UNSIGNED NOT NULL,
  type VARCHAR(40) NOT NULL,
  channel ENUM('PUSH','EMAIL','SMS','INAPP') NOT NULL DEFAULT 'INAPP',
  title VARCHAR(255) NOT NULL,
  body TEXT NULL,
  payload JSON NULL,
  dedupe_key VARCHAR(100) NULL COMMENT 'Chống gửi trùng (vd. proximity:<ticket>:<n>)',
  sent_at DATETIME NULL,
  read_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_notifications_dedupe (dedupe_key),
  KEY idx_notifications_user (user_id, read_at, created_at),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ${ENGINE}`,
  ],
  [
    "feedbacks",
    `CREATE TABLE feedbacks (
  ${ID},
  booking_id BIGINT UNSIGNED NOT NULL,
  doctor_rating TINYINT UNSIGNED NULL,
  wait_accuracy_rating TINYINT UNSIGNED NULL,
  comment TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_feedbacks_booking (booking_id),
  CONSTRAINT chk_feedbacks_doctor CHECK (doctor_rating IS NULL OR doctor_rating BETWEEN 1 AND 5),
  CONSTRAINT chk_feedbacks_wait CHECK (wait_accuracy_rating IS NULL OR wait_accuracy_rating BETWEEN 1 AND 5),
  CONSTRAINT fk_feedbacks_booking FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE CASCADE
) ${ENGINE}`,
  ],
];

// Vai trò hệ thống phải tồn tại trước khi có user (FK users.role_code)
const SYSTEM_ROLES = [
  ["R1", "ADMIN", "Quản trị hệ thống"],
  ["R2", "DOCTOR", "Bác sĩ"],
  ["R3", "PATIENT", "Bệnh nhân"],
  ["R4", "CASHIER", "Thu ngân"],
  ["R5", "RECEPTIONIST", "Lễ tân"],
  ["R6", "NURSE", "Điều dưỡng"],
  ["R7", "COORDINATOR", "Điều phối viên"],
  ["R8", "DISPLAY_DEVICE", "Thiết bị màn hình TV sảnh (tài khoản dịch vụ, chỉ đọc)"],
];

module.exports = {
  up: async (queryInterface) => {
    const q = (sql, opts) => queryInterface.sequelize.query(sql, opts);
    await q("SET FOREIGN_KEY_CHECKS = 0");
    try {
      for (const [, ddl] of TABLES) await q(ddl);
    } finally {
      await q("SET FOREIGN_KEY_CHECKS = 1");
    }
    for (const [code, name, description] of SYSTEM_ROLES) {
      await q(
        "INSERT INTO rbac_roles (code, name, description, is_system) VALUES (?, ?, ?, 1)",
        { replacements: [code, name, description] }
      );
    }
  },

  down: async (queryInterface) => {
    const q = (sql) => queryInterface.sequelize.query(sql);
    await q("SET FOREIGN_KEY_CHECKS = 0");
    try {
      for (const [name] of [...TABLES].reverse()) await q(`DROP TABLE IF EXISTS \`${name}\``);
    } finally {
      await q("SET FOREIGN_KEY_CHECKS = 1");
    }
  },
};
