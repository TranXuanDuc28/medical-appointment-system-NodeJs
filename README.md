# Backend – Hệ thống đặt lịch khám và quản lý hàng đợi tích hợp AI

REST API + Socket.io (Node.js, Express 5, Sequelize, MySQL) cho đồ án tốt nghiệp VKU. Backend phụ trách: xác thực/phân quyền, đặt lịch, **hàng đợi khám bệnh thời gian thực**, ETA bằng ML (gọi AI Service), nhắc hẹn/thông báo, cân bằng tải cho bệnh nhân vãng lai, hồ sơ bệnh án + đơn thuốc, thanh toán.

Tổng quan toàn hệ thống: [README gốc](../README.md). Số liệu ML và chỗ khác đề cương: `docs/DIEU_CHINH_SO_VOI_DE_CUONG.md` ở repo gốc.

## Chức năng

| Nhóm | Nội dung | Tài liệu |
|---|---|---|
| Xác thực & phân quyền | JWT + refresh token (cookie httpOnly), **RBAC theo permission** lưu trong DB (admin chỉnh được), default-deny, kiểm tra chủ sở hữu dữ liệu, nhật ký audit, giới hạn tần suất | `src/config/accessRules.js`, `permissions.js` |
| Đặt lịch | Khung giờ theo bác sĩ, giữ chỗ có hạn đến khi xác nhận email (`BOOKING_HOLD_MINUTES`), chặn đặt trùng bằng transaction + khoá dòng | `src/services/bookingService.js` |
| Hàng đợi | Check-in, cấp số thứ tự không trùng, gọi số, bấm giờ, khẩn cấp, dời lượt, vắng mặt, realtime cho bệnh nhân/bác sĩ/TV; ETA; **cân bằng tải vãng lai** (tự chọn bác sĩ chờ ngắn nhất) | [QUEUE_ENGINE.md](QUEUE_ENGINE.md) |
| Tích hợp AI | Gọi AI Service (FastAPI) theo lô, timeout + ngắt mạch, dự phòng (`ml` → `history` → `default`), ghi dự đoán so với thực tế, gợi ý chuyên khoa | [AI_INTEGRATION.md](AI_INTEGRATION.md) |
| Nhắc hẹn & thông báo | Nhắc 24h/2h, cảnh báo "còn N người", API đọc thông báo, socket `NOTIFICATION_NEW`, FCM push | [REMINDERS.md](REMINDERS.md) |
| Bệnh án & thanh toán | Hồ sơ khám (`medical_records`), đơn thuốc PDF gửi email (BullMQ), PayOS / Casso webhook | |
| Nội dung & khác | Chuyên khoa, phòng khám/cơ sở y tế, gói khám, cẩm nang, câu hỏi khảo sát, chat bác sĩ–bệnh nhân, đa ngôn ngữ vi/en | |

## Công nghệ

Node.js 22 · Express 5 · Sequelize 6 + MySQL 8 · Socket.io 4 · BullMQ + Redis (**tuỳ chọn**) · Nodemailer · PDFKit/Puppeteer · Firebase Admin (FCM) · Babel (chạy dev) · `node:test` + supertest.

## Cài đặt và chạy

Cần: Node.js 22, MySQL 8. (Redis và AI Service không bắt buộc.)

```bash
cd backend
npm install
cp .env.example .env      # điền các biến [BẮT BUỘC] bên dưới
npm run db:create         # tạo database
npm run db:migrate        # schema v2 (baseline + cột hàng đợi)
npm run db:seed           # danh mục tham chiếu (vai trò, trạng thái, khung giờ...)
npm run dev               # http://localhost:6969
```

Thiếu biến bắt buộc thì server **từ chối khởi động** (xem `src/config/env.js`). RBAC được đồng bộ vào DB mỗi lần khởi động; nếu báo lỗi đồng bộ RBAC nghĩa là chưa chạy migration.

### Biến môi trường chính (đầy đủ trong `.env.example`, có chú thích từng biến)

| Biến | Ý nghĩa |
|---|---|
| `PORT` | Cổng (mặc định **6969**). Frontend trỏ tới đây qua `REACT_APP_BACKEND_URL` |
| `DB_HOST` `DB_PORT` `DB_DIALECT` `DB_USERNAME` `DB_PASSWORD` `DB_DATABASE_NAME` | **[Bắt buộc]** MySQL |
| `JWT_SECRET` `JWT_REFRESH_SECRET` | **[Bắt buộc]**, hai giá trị **khác nhau**, ≥ 32 ký tự khi production |
| `URL_REACT` `CORS_ORIGINS` | Origin frontend (CORS, link xác nhận email) |
| `EMAIL_APP` `EMAIL_APP_PASSWORD` | Gmail SMTP gửi email xác nhận, đơn thuốc |
| `PAYOS_*` `CASSO_*` | Thanh toán |
| `FIREBASE_*` | FCM push (thiếu → chạy chế độ giả lập, chỉ in log) |
| `REDIS_URL` `REDIS_HOST` `REDIS_PORT` | Tuỳ chọn. Không có Redis: cache dùng bộ nhớ, email gửi trực tiếp, nhắc hẹn chạy bằng `setInterval` |
| `AI_SERVICE_URL` `AI_SERVICE_TOKEN` `AI_TIMEOUT_MS` `AI_CIRCUIT_*` | AI Service. **Để trống `AI_SERVICE_URL` = tắt AI** (ETA dùng trung bình lịch sử) |
| `REMINDERS_ENABLED` `REMINDER_SCAN_SECONDS` `REMINDER_AHEAD_THRESHOLDS` | Nhắc hẹn |
| `BOOKING_HOLD_MINUTES` | Thời gian giữ chỗ khi chưa xác nhận email |

## Scripts

| Lệnh | Việc làm |
|---|---|
| `npm run dev` | Chạy dev (nodemon + babel-node) |
| `npm run build` / `npm start` | Biên dịch vào `build/` / chạy bản đã biên dịch |
| `npm test` | Test không cần DB (phân quyền, luật hàng đợi, client AI...) |
| `RUN_DB_TESTS=1 npm test` | Thêm test trên **MySQL thật**: đặt lịch đồng thời, lõi hàng đợi, RBAC, tích hợp AI, cân bằng tải, nhắc hẹn, thông báo. Chạy tuần tự; tạo dữ liệu tạm rồi tự dọn |
| `npm run db:migrate` / `db:migrate:undo` / `db:seed` / `db:reset` | Quản lý schema (`db:reset` **xoá và dựng lại DB**) |
| `npm run db:import-v1` | Chuyển dữ liệu từ DB v1 cũ sang v2 |
| `npm run smoke:queue` · `smoke:ai` · `smoke:e2e` | Chạy thử đầu-cuối trên server đang chạy (hàng đợi / AI thật / luồng chính) |

> Test DB dùng đúng CSDL trong `.env`. Nên trỏ tới DB thử nghiệm, không phải DB đang có dữ liệu thật. Nếu một lần chạy bị ngắt giữa chừng có thể còn dữ liệu tạm mồ côi (email `qtest-*`, `aitest-*`, `ntest-*`, `rmtest-*`; phòng `QT*`/`AI*`/`QB*`) làm test sau hỏng — cần xoá tay.

## API

Mọi route `/api/*` đi qua `accessControl` và bảng `src/config/accessRules.js` (**route không khai báo thì bị 403**). Phản hồi dạng `{ errCode, errMessage, data }` (`errCode: 0` là thành công).

| Nhóm | Đường dẫn tiêu biểu |
|---|---|
| Xác thực | `/api/register` · `/api/login` · `/api/logout` · `/api/refresh-token` |
| Người dùng & RBAC | `/api/get_all_users` · `/api/rbac/roles` · `/api/rbac/permissions` · `/api/rbac/audit-logs` |
| Hàng đợi | `/api/queue/check-in` · `/walk-in` · `/walk-in/suggest` · `/doctor/call-next` · `/doctor/board` · `/tickets/:id/{call,start,finish,no-show,postpone,emergency,cancel}` · `/my-tickets` · `/rooms…` |
| AI | `/api/ai/triage` · `/api/ai/status` · `/api/ai/metrics` |
| Thông báo | `/api/notifications` · `/unread-count` · `/:id/read` · `/read-all` |
| Đặt lịch, bác sĩ, nội dung | `/api/patient-book-appointment`, `/api/get_schedule_doctor_by_date`, `/api/packages`, `/api/facilities`… |

Chi tiết tham số, quyền và mã lỗi của hàng đợi/AI/thông báo nằm trong ba file tài liệu ở trên.

## Socket.io

Xác thực bằng JWT lúc handshake (cookie `jwt` hoặc `auth.token`); khách chưa đăng nhập chỉ xem/đặt slot. Phòng: `user:<id>` (bệnh nhân), `queue:doctor:<id>` (bác sĩ), `queue:room:<id>` (TV/bảng phòng).

| Sự kiện (server → client) | Ý nghĩa |
|---|---|
| `QUEUE_UPDATED` | Thay đổi trong phòng (không có tên bệnh nhân) |
| `TICKET_CALLED` | Gọi số, kèm câu đọc tiếng Việt cho TV |
| `QUEUE_TICKET_UPDATED` | Vé của bệnh nhân (vị trí + ETA) |
| `DOCTOR_QUEUE_UPDATED` | Nhắc bảng bác sĩ tải lại |
| `NOTIFICATION_NEW` | Thông báo mới |

## Cấu trúc

```text
src/
├── config/        env, CORS, accessRules (phân quyền), permissions, Firebase, PayOS
├── controllers/   nhận request, gọi service
├── middleware/    JWT, accessControl, ownership/policies, rateLimit
├── models/        Sequelize (schema v2: snake_case trong DB, camelCase trong code)
├── services/      bookingService, rbacService, notificationService, reminder*, queue/, ai/ ...
├── socket/        Socket.io: chat, đặt slot, hàng đợi
├── utils/         dateKey, queueBus (bus sự kiện nội bộ), queue (BullMQ email), redis
├── migrations/    baseline-schema + queue-engine-columns (cũ trong _legacy/)
└── seeders/       danh mục tham chiếu
scripts/           tạo/migrate DB, chuyển dữ liệu v1→v2, smoke test
tests/             node:test
```

## Hạn chế đã biết

- **`Dockerfile` đã lỗi thời** (Node 14, kiểu BookingCare); chưa có docker compose. Chạy bằng `npm run dev` / `npm start`.
- Chưa có chuyển vé giữa các phòng khi quá tải; chưa có email/SMS nhắc hẹn (mới có thông báo trong ứng dụng + push).
- Ước tính thời gian khám của mô hình ML hiện huấn luyện trên dữ liệu mô phỏng; xem tài liệu AI để biết cách tái huấn luyện bằng log thật.
