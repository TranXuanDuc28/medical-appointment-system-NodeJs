# Nhắc hẹn & cảnh báo sắp đến lượt

Hai loại thông báo gửi cho bệnh nhân (bảng `notifications` + FCM push tới mọi thiết bị đã đăng ký):

| Loại (`type`) | Khi nào | `dedupe_key` |
|---|---|---|
| `APPT_REMIND_24H` | Lịch **S2 (đã xác nhận)** còn 22–24h nữa tới giờ bắt đầu khung khám | `remind:24h:<bookingId>` |
| `APPT_REMIND_2H` | Còn 30 phút – 2h | `remind:2h:<bookingId>` |
| `QUEUE_NEARING` | Vé **WAITING** có số người phía trước ≤ ngưỡng (mặc định 3, rồi 1; ngưỡng 1 gồm cả "là người kế tiếp") | `proximity:<ticketId>:<ngưỡng>` |

## Cách hoạt động
- **Quét 24h/2h** (`services/reminderService.scanDueReminders`): chạy định kỳ, tìm booking S2 trong ~2 ngày tới, tính giờ bắt đầu từ `reference_codes.meta.start` (giờ VN), gửi nếu nằm trong cửa sổ.
  Cửa sổ rộng hơn chu kỳ quét nên server tắt vài chục phút không làm mất nhắc; `dedupe_key` UNIQUE đảm bảo mỗi nhắc chỉ gửi **một lần** dù quét lặp, retry, hay chạy nhiều tiến trình.
  Lịch đặt sát giờ (vd. còn 5h) không bị nhắc "24h". Booking đã huỷ (S4) hoặc đã check-in vào hàng đợi thì bỏ qua.
- **Sắp đến lượt** (`handleQueueChange`): nghe `queueBus` (sự kiện sau mỗi lần COMMIT của hàng đợi), gom sự kiện dồn dập của cùng bác sĩ/ngày trong 1,5s rồi lấy vị trí + ETA qua `queueService.getActiveTicketsForPush`. Khi hàng đợi nhảy nhiều bước (vd. từ 5 xuống 1) chỉ gửi ngưỡng nhỏ nhất đã chạm.
- **Scheduler** (`services/reminderScheduler`): có Redis → BullMQ *job scheduler* `reminderQueue` (lặp theo `REMINDER_SCAN_SECONDS`, retry nằm ở BullMQ); không có Redis → `setInterval` trong tiến trình. Quét bù 5s sau khi server khởi động. Được gọi trong `server.js` sau khi đồng bộ RBAC.

## Cấu hình (`.env`)
| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `REMINDERS_ENABLED` | `true` | `false` để tắt hẳn |
| `REMINDER_SCAN_SECONDS` | `300` | Chu kỳ quét (tối thiểu 30) |
| `REMINDER_AHEAD_THRESHOLDS` | `3,1` | Cảnh báo khi còn ≤ N người phía trước (mỗi ngưỡng 1 lần/vé) |

## Giới hạn hiện tại
- Kênh gửi: INAPP (ghi DB) + FCM push + socket realtime. **Chưa có email/SMS nhắc hẹn.**
- Bệnh nhân vãng lai (walk-in, không có tài khoản) không nhận cảnh báo vì không có `userId`.
- Nếu Firebase chưa cấu hình, push chỉ in log (chế độ mock); thông báo INAPP vẫn được lưu.

## Kiểm thử
`npm test` chạy 4 test thuần (cửa sổ, ngưỡng, debounce). Với DB thật: `RUN_DB_TESTS=1 npm test` thêm 2 test quét lịch + chống gửi trùng + ngưỡng hàng đợi (dữ liệu tạm `rmtest-*`, ngày 2031-03-05, tự dọn).

## API thông báo cho frontend
Tất cả cần đăng nhập (cookie `jwt` hoặc Bearer); luôn chỉ thao tác trên thông báo của **chính người đăng nhập** (userId lấy từ token). Phản hồi dạng `{errCode, errMessage, data}`.

| Method | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/api/notifications?limit=20&before=<id>&unread=1` | Mới nhất trước. `limit` 1–50 (mặc định 20). Phân trang: truyền `before = data.nextBefore` của trang trước; `nextBefore = null` khi hết. `unread=1` chỉ lấy chưa đọc. Trả `{items[], unreadCount, nextBefore}` |
| GET | `/api/notifications/unread-count` | `{unreadCount}` – số trên chuông |
| POST | `/api/notifications/:id/read` | Đánh dấu đã đọc (idempotent). 404 nếu không phải thông báo của mình. Trả `{unreadCount}` |
| POST | `/api/notifications/read-all` | Đọc hết. Trả `{updated, unreadCount: 0}` |

Mỗi item: `{id, type, title, body, payload, createdAt, readAt, isRead}`. `type`: `APPT_REMIND_24H`, `APPT_REMIND_2H`, `QUEUE_NEARING`. `payload` để điều hướng: nhắc hẹn có `{bookingId, code, slotAt}`, sắp đến lượt có `{ticketId, displayNo, aheadCount, estimatedWaitMin}`.

**Realtime:** socket (đã đăng nhập) nhận `NOTIFICATION_NEW {notification}` (cùng dạng item) ngay khi có thông báo mới → tăng số trên chuông, chèn đầu danh sách, không cần polling. Gọi `unread-count` khi mở app để đồng bộ.
