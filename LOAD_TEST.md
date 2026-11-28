# Kiểm thử tải hàng đợi (D2)

Kịch bản: `scripts/load-queue.js` (Node thuần, dùng `fetch` + `socket.io-client`, không thêm phụ thuộc). Chạy trên server **đang chạy**, tự dựng và dọn dữ liệu tạm (email `load-*`, phòng `LT*`).

```bash
# 1) server với rate-limit tắt (CHỈ để đo tải), tắt nhắc hẹn / tự vắng mặt cho khỏi nhiễu
LOAD_TEST_DISABLE_RATE_LIMIT=true REMINDERS_ENABLED=false NOSHOW_AUTO_ENABLED=false PORT=6990 npx babel-node src/server.js
# 2) kịch bản (N bệnh nhân, ROOMS phòng; OUT=file.json để lưu kết quả; P95_MS đổi ngưỡng)
BASE=http://localhost:6990 N=200 ROOMS=10 npm run load:queue
```

## Kịch bản

| Bước | Nội dung | Đo |
|---|---|---|
| 0 | N yêu cầu đặt lịch **đồng thời** vào slot sức chứa 5 (gọi thẳng `bookingService`) | số thành công phải đúng 5, DB đúng 5 booking |
| 1 | Đăng nhập N bệnh nhân + R bác sĩ + R TV, mở N+2R socket | số kết nối, thời gian kết nối |
| 2 | **Bão check-in**: N bệnh nhân check-in cùng một lúc | độ trễ HTTP, trùng số thứ tự |
| 3 | Mỗi bác sĩ gọi số → bắt đầu → hoàn thành hết hàng, các phòng song song | độ trễ HTTP; *gọi số → TV nhận `TICKET_CALLED`*; *→ điện thoại bệnh nhân nhận*; *→ bệnh nhân cuối hàng nhận ETA mới* |
| 4 | Đối chiếu DB | mọi vé `DONE`, nhật ký ≥ 4 sự kiện/vé |

**Tiêu chí đạt** (theo `DanhGia_NangCap_HeThong.md` D2): 0 lỗi HTTP/socket, 0 overbooking, 0 trùng số, p95 các độ trễ sự kiện "gọi số" **< 1000 ms**.

## Kết quả đo (28/11/2026)

Môi trường: máy dev Windows 11 (8 luồng), MySQL cục bộ, Node 22, server **1 tiến trình**, client load test chạy **cùng máy** (nên số liệu bao gồm cả tải của client). AI Service **không chạy** (ETA dùng lịch sử/mặc định). Mỗi dòng là một lần chạy duy nhất, chưa lặp nhiều lần.

| Cấu hình | Overbooking | Socket | Check-in OK / p50 / p95 | Gọi số → TV p50 / p95 | Gọi số → điện thoại p50 / p95 | Gọi số → ETA cuối hàng p95 | Kết quả |
|---|---|---|---|---|---|---|---|
| 100 BN, 5 phòng | 5/5 đúng | 110/110 | 100/100 · 3291 / 4348 ms | 159 / 187 ms | 157 / 185 ms | 202 ms | đạt |
| 200 BN, 5 phòng | 5/5 đúng | 210/210 | 200/200 · 3077 / 3696 ms | 86 / 115 ms | 85 / 114 ms | 58 ms | đạt |
| 200 BN, 10 phòng | 5/5 đúng | 220/220 | 200/200 · 4797 / 5569 ms | 256 / 329 ms | 254 / 328 ms | 243 ms | đạt |

Cả ba: 0 lỗi, 0 trùng số thứ tự, mọi vé `DONE`. p95 "gọi số → TV/điện thoại" tối đa **329 ms** (ngưỡng 1000 ms).

### Điểm yếu còn lại

- **Bão check-in vẫn là điểm chậm nhất, nhưng đã nhanh hơn 2–3 lần** (xem "Tối ưu bão check-in" bên dưới): còn khoảng 1,0–2,3 giây p95 khi 100–200 người check-in cùng một khoảnh khắc (thông lượng 65–106 lượt/giây, trước đó 23–50). Vẫn bị chặn bởi khoá dòng phòng (để không trùng số) và số kết nối DB. Số liệu **dao động mạnh giữa các lần chạy** (có lần 200 BN/10 phòng lên tới 5,5 giây) vì máy dev dùng chung với client tải.
- Chưa đo: nhiều tiến trình server (cluster/nhiều replica cần Redis adapter cho socket), AI Service bật, mạng thật (không phải localhost), chạy kéo dài (soak).
- Overbooking mới kiểm ở tầng service (gọi trực tiếp), không qua HTTP, vì `bookingLimiter` chặn 15 yêu cầu/10 phút/IP và việc gửi email thật.

## Lỗi thật mà load test tìm ra (đã sửa)

**Deadlock cạn pool kết nối:** lần chạy đầu với 100 bệnh nhân, **98/100 check-in trả 500 sau 60 giây** (`ConnectionAcquireTimeoutError`). Nguyên nhân: `checkIn` mở transaction (giữ 1 kết nối) rồi gọi `slotInfo()` **không truyền transaction**, nên cần kết nối thứ hai; pool mặc định của Sequelize chỉ có 5 kết nối, 5 transaction đầu giữ hết pool và chờ nhau đến hết hạn. Test đơn lẻ không bao giờ thấy lỗi này.

Sửa: `slotInfo` nhận và dùng `transaction`; đặt pool tường minh `DB_POOL_MAX` (mặc định 20). Kiểm chứng: với **pool vẫn 5** kịch bản 100 bệnh nhân đạt (100/100), nghĩa là lỗi hết nhờ sửa truy vấn chứ không phải nhờ pool lớn hơn.

## Ghi chú vận hành

- `LOAD_TEST_DISABLE_RATE_LIMIT=true` tắt **mọi** giới hạn tần suất. Chỉ dùng khi đo trên máy dev, không bật ở môi trường thật.
- Dọn dữ liệu chạy ở `finally`; nếu kịch bản bị ngắt giữa chừng, tìm và xoá email `load-*`, phòng `LT*`.

## Tối ưu bão check-in (28/11/2026)

Đo thời gian từng giai đoạn của một lần check-in (100 BN, 5 phòng) thấy phần lớn thời gian là **chờ kết nối DB** và các truy vấn sau commit, không phải phần giữ khoá phòng. Mỗi check-in trước đây kéo theo 3–4 lần tính ETA (mỗi lần đọc cả hàng đợi, trung bình lịch sử, gọi AI) và một lần phát socket cho **toàn bộ** hàng đợi của bác sĩ: tổng việc tăng theo bình phương số người chờ.

| Thay đổi | Tác dụng |
|---|---|
| Gộp lần tính ETA đang chạy của cùng bác sĩ/ngày khi dữ liệu chưa đổi (`etaForDoctor`, có "phiên bản" tăng sau mỗi commit; không lưu kết quả sau khi xong) | 3–4 lần tính còn khoảng 1; không bao giờ trả số cũ (có test cố ý tạo chồng lấn, đã kiểm bằng cách tắt cơ chế phiên bản thì test thất bại) |
| Gộp phát socket theo bác sĩ trong 80 ms (`QUEUE_BROADCAST_BATCH_MS`, 0 = tắt); **gọi số vẫn phát ngay** | mỗi phòng chỉ phát snapshot 1 lần và mỗi bệnh nhân nhận vé mới nhất 1 lần cho cả loạt |
| Ghi dự đoán AI (`ai_predictions`) chạy nền, nối tiếp từng việc và nhường khi còn thao tác của người dùng | không tranh kết nối với yêu cầu đang chờ |
| Nhớ cấu hình khung giờ 60 giây; không truy vấn lại chủ vé khi check-in | bớt 2–3 truy vấn mỗi lần |

So sánh **cùng một phiên đo, cùng máy** (200 BN, 10 phòng): code cũ check-in p95 **4,4 / 4,8 / 7,8 s**; code mới **2,0 / 2,3 / 5,5 s** (và 2,1–2,2 s ở 4 lần khác). Cấu hình 100 BN/5 phòng: 3,1 s → 1,0–1,4 s; 200 BN/5 phòng: 3,7 s → 1,9 s. p95 "gọi số → TV/điện thoại" không xấu đi (121–315 ms ở hầu hết lần chạy). Cả hai bản đều có một lần p95 gọi số vượt 1000 ms trong lúc máy bị nhiễu, nên đó là biến động của môi trường chứ không do thay đổi này.

Đánh đổi cần biết: (1) thông báo hàng đợi dồn dập có thể trễ tối đa 80 ms (người dùng không nhận ra; gọi số không bị ảnh hưởng); (2) dự đoán AI "lúc vào hàng" ghi trễ vài chục đến vài trăm ms sau check-in, và nếu vé đã được phục vụ xong trước khi việc nền chạy tới (chỉ xảy ra khi bão kéo dài hơn thời gian khám) thì dòng đối sánh của vé đó bị bỏ; (3) việc nền nằm trong bộ nhớ, tắt server giữa chừng thì mất các việc chưa chạy.
