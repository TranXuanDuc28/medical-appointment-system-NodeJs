# LÕI HÀNG ĐỢI KHÁM BỆNH (Queue Engine)

Phần backend của chức năng "Quản lý hàng đợi thời gian thực": bệnh nhân check-in → xếp hàng → bác sĩ gọi số → TV sảnh đọc loa → khám xong.
Mã nguồn: `src/services/queue/` (`queueRules.js` quy tắc thuần, `queueService.js` nghiệp vụ, `queueEta.js` ước lượng chờ), `src/controllers/queueController.js`, `src/socket/queueSocket.js`.

## 1. Máy trạng thái của vé

```
 check-in / walk-in ──► WAITING ──call──► CALLED ──start──► IN_PROGRESS ──finish──► DONE
                         │  ▲  │            │ ▲
             postpone ◄──┘  │  └─cancel──► CANCELLED        call lại (tối đa 3 lần)
             emergency ─────┘                │
                                              └─ no-show (đã gọi đủ 3 lần):
                                                   lần 1 → xếp lại cuối hàng (WAITING)
                                                   lần 2 → NO_SHOW (kết thúc) + huỷ lịch hẹn, nhả khung giờ
```
- Vé chỉ được tạo **khi bệnh nhân đến** (check-in lịch hẹn đã xác nhận, hoặc đăng ký vãng lai tại quầy).
- Mỗi lịch hẹn có tối đa 1 vé (DB: `UNIQUE booking_id`). Huỷ vé rồi đến lại → hồi sinh đúng vé cũ, giữ nguyên số thứ tự.
- Mọi chuyển trạng thái ghi 1 dòng `queue_events` (ai, lúc nào, lý do) – dùng để audit và làm dữ liệu huấn luyện ML.

## 2. Thứ tự gọi số

1. **Khẩn cấp** luôn đứng đầu (cần quyền `queue:emergency`, **bắt buộc nêu lý do**, lý do được lưu vào nhật ký).
2. Còn lại theo `sort_at` tăng dần, hoà thì theo `id` (đến trước):
   - **Lịch hẹn**: `sort_at` = giờ bắt đầu khung hẹn. Đến trễ quá **15 phút** thì tính theo giờ đến (như vãng lai) → người đặt trước vẫn được ưu tiên giờ hẹn nhưng không chặn người khác mãi.
   - **Vãng lai**: `sort_at` = giờ đến.
   - **Cao tuổi (≥ 65) / trẻ nhỏ (≤ 6)**: tự động ưu tiên, xếp sớm hơn 30 phút (ưu tiên có giới hạn).
3. **Xin dời lượt**: nhường 2 người phía sau, tối đa 2 lần/vé (ca khẩn cấp không được dời).
4. Bác sĩ "Gọi số tiếp theo" lấy người đứng đầu hàng **của chính mình**. Gọi số chỉ định thủ công cũng được (ghi `outOfOrder` vào nhật ký).

Hằng số cấu hình ở `queueRules.js → CONFIG` (số lần gọi, số lần dời, thời gian ân hạn, thời lượng mặc định 15 phút).

## 3. Đồng thời an toàn (đã test)

| Rủi ro | Cách chặn |
|---|---|
| 2 người check-in cùng lúc nhận trùng số | Khoá dòng **phòng** (`SELECT … FOR UPDATE`) khi cấp `MAX(seq)+1`; DB còn `UNIQUE(room, date, shift, seq)` |
| Bác sĩ bấm "Gọi số tiếp" nhiều lần/song song | Khoá dòng **bác sĩ**; mỗi lúc chỉ 1 vé `CALLED`/`IN_PROGRESS`, các yêu cầu thừa nhận `DOCTOR_BUSY` |
| Hai thao tác đè lên cùng một vé | Khoá dòng **vé** trước mỗi lần đổi trạng thái |
| Realtime phát khi giao dịch chưa xong | Chỉ phát sự kiện **sau COMMIT** (`queueBus`) |

## 4. API (`/api/queue/*`)

Quyền do bảng `accessRules` + RBAC quy định; kiểm tra chủ vé/bác sĩ nằm trong `queueService`. Lỗi nghiệp vụ trả `errCode` ≠ 0 kèm `reason` (vd. `DOCTOR_BUSY`, `NOT_ENOUGH_CALLS`, `NOT_TODAY`).

| Method | Đường dẫn | Ai | Mô tả |
|---|---|---|---|
| POST | `/check-in` `{bookingId}` | nhân viên `queue:checkin` hoặc chính bệnh nhân | Vào hàng (lịch hẹn phải đã xác nhận và đúng ngày). Idempotent |
| POST | `/walk-in` `{doctorId, fullName, phone?, priority?}` | `queue:walkin:create` | Đăng ký vãng lai |
| POST | `/doctor/call-next` | `queue:call` | Gọi người đứng đầu hàng của bác sĩ |
| GET | `/doctor/board?date=` | `queue:call` | Đang xử lý + hàng chờ (đã sắp, có ETA) + đã xong + thống kê |
| POST | `/tickets/:id/call` `/start` `/finish` `/no-show` | `queue:call` / `start` / `finish` / `noshow` | Thao tác theo vé (chỉ bác sĩ của vé) |
| POST | `/tickets/:id/postpone` `/cancel` | chủ vé hoặc `queue:checkin` | Dời lượt / huỷ |
| POST | `/tickets/:id/emergency` `{reason}` | `queue:emergency` | Ưu tiên khẩn cấp |
| GET | `/my-tickets` | đã đăng nhập | Vé hôm nay của tôi + vị trí + ETA |
| GET | `/rooms/:roomId/display` | `queue:display:read` (TV) | Số đang gọi + 5 số kế tiếp, **không có tên bệnh nhân** |
| GET/POST/PUT | `/rooms`, `/rooms/:id` | xem: nhân viên; sửa: `room:manage` | Quản lý phòng khám vật lý |
| PUT | `/assign-room` `{doctorId, date(ms), roomId}` | `room:manage` | Gán phòng cho bác sĩ trong một ngày |

Phòng của một vé được xác định theo thứ tự: `schedules.room_id` → phòng cùng phòng khám + chuyên khoa với bác sĩ → phòng bất kỳ của phòng khám. Chưa có phòng ⇒ `NO_ROOM` (admin tạo phòng và gán).

## 5. Realtime (Socket.io, xác thực JWT)

| Client gửi | Điều kiện | Kết quả |
|---|---|---|
| `QUEUE_JOIN_ROOM {roomId}` (có ack) | `queue:display:read`/`call`/`checkin`/`rebalance` | vào room `queue:room:<id>`, nhận snapshot |
| `QUEUE_JOIN_DOCTOR {doctorId}` | chính bác sĩ đó hoặc `doctor-data:manage:any` | vào room `queue:doctor:<id>` |

| Server phát | Tới | Nội dung |
|---|---|---|
| `QUEUE_UPDATED` | room phòng | `{room, serving[], next[]}` mỗi khi hàng đợi đổi |
| `TICKET_CALLED` | room phòng + bệnh nhân | `{displayNo, roomName, doctorName, callCount, announce}` — `announce` là câu để TV đọc loa: *"Xin mời bệnh nhân có số thứ tự A-005 vào Phòng khám 2 gặp bác sĩ …"* |
| `DOCTOR_QUEUE_UPDATED` | room bác sĩ | nhắc bảng bác sĩ tải lại |
| `QUEUE_TICKET_UPDATED` | từng bệnh nhân (`user:<id>`) | `{ticket}` với vị trí + ETA mới nhất (mọi người phía sau đều đổi khi hàng thay đổi) |

## 6. Ước lượng thời gian chờ

`Wait(Pₙ) = phần còn lại của ca đang khám/đang gọi + Σ thời lượng dự kiến của những người đứng trước`

Thời lượng dự kiến của mỗi ca, theo thứ tự ưu tiên: (1) **bộ dự đoán ML** nếu đã đăng ký bằng `setDurationPredictor(fn)` trong `queueEta.js` — đây là điểm cắm cho AI Service; (2) trung bình thực tế 30 ca `DONE` gần nhất của bác sĩ (loại ca < 1 giây); (3) mặc định 15 phút. Kết quả có `etaBasis` = `history` | `default` để frontend hiển thị độ tin cậy. AI Service lỗi thì tự quay về (2)/(3).

## 7. Thay đổi schema đi kèm

Migration `20261202000000-queue-engine-columns.js` (chỉ thêm, có `down`): `queue_tickets.sort_at`, `walk_in_name`, `walk_in_phone`, index sắp xếp, `CHECK(booking_id IS NOT NULL OR walk_in_name IS NOT NULL)`, và đổi `fk_qt_booking` từ `SET NULL` sang `RESTRICT` (MySQL không cho cột `SET NULL` nằm trong CHECK; vé không được mồ côi khỏi lịch hẹn). Cần chạy `npm run db:migrate` sau khi lấy code mới.

## 8. Kiểm thử

- `node --test tests/queue.rules.test.js` — 9 test thuần (máy trạng thái, thứ tự, dời lượt, ETA, bộ dự đoán ML).
- `RUN_DB_TESTS=1 npm test` — 8 test tích hợp DB (10 check-in song song → số duy nhất, 5 lần gọi song song → chỉ 1 thành công, khẩn cấp, dời lượt, vắng mặt 2 lần → huỷ lịch, phân quyền…).
- `BASE=http://localhost:PORT npm run smoke:queue` — 33 kiểm tra đầu-cuối qua HTTP + Socket.io với 3 thiết bị (bệnh nhân, bác sĩ, TV).

## 9. Chưa làm trong nhánh này (kế hoạch tiếp)

- Nhắc hẹn 24h/2h và cảnh báo "còn 2–3 người" (cần scheduler BullMQ) — dữ liệu `QUEUE_TICKET_UPDATED` đã đủ để kích hoạt.
- Cân bằng tải tự động giữa các phòng cùng chuyên khoa cho bệnh nhân vãng lai (hiện chọn bác sĩ thủ công).
- Cắm mô hình ML dự đoán thời lượng (`setDurationPredictor`) và ghi `ai_predictions` để đối sánh dự đoán/thực tế.
- Giao diện: vé QR + theo dõi hàng đợi, bảng bác sĩ, màn hình TV, quản lý phòng.
