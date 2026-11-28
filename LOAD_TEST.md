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

- **Bão check-in chậm:** khi 100–200 người check-in *đúng cùng một khoảnh khắc*, p95 độ trễ HTTP là 3,7–5,6 giây (thông lượng 23–50 lượt/giây). Đúng nhưng chậm: các vé cùng phòng xếp hàng qua khoá dòng phòng (để không trùng số) và mỗi lần check-in còn tính ETA ghi dự đoán sau commit. Thực tế người bệnh đến rải rác nên khó gặp, nhưng giờ mở cửa buổi sáng có thể tăng đột biến. Chưa tối ưu; hướng xử lý: đẩy phần ghi dự đoán AI ra khỏi đường phản hồi, gom đẩy ETA.
- Chưa đo: nhiều tiến trình server (cluster/nhiều replica cần Redis adapter cho socket), AI Service bật, mạng thật (không phải localhost), chạy kéo dài (soak).
- Overbooking mới kiểm ở tầng service (gọi trực tiếp), không qua HTTP, vì `bookingLimiter` chặn 15 yêu cầu/10 phút/IP và việc gửi email thật.

## Lỗi thật mà load test tìm ra (đã sửa)

**Deadlock cạn pool kết nối:** lần chạy đầu với 100 bệnh nhân, **98/100 check-in trả 500 sau 60 giây** (`ConnectionAcquireTimeoutError`). Nguyên nhân: `checkIn` mở transaction (giữ 1 kết nối) rồi gọi `slotInfo()` **không truyền transaction**, nên cần kết nối thứ hai; pool mặc định của Sequelize chỉ có 5 kết nối, 5 transaction đầu giữ hết pool và chờ nhau đến hết hạn. Test đơn lẻ không bao giờ thấy lỗi này.

Sửa: `slotInfo` nhận và dùng `transaction`; đặt pool tường minh `DB_POOL_MAX` (mặc định 20). Kiểm chứng: với **pool vẫn 5** kịch bản 100 bệnh nhân đạt (100/100), nghĩa là lỗi hết nhờ sửa truy vấn chứ không phải nhờ pool lớn hơn.

## Ghi chú vận hành

- `LOAD_TEST_DISABLE_RATE_LIMIT=true` tắt **mọi** giới hạn tần suất. Chỉ dùng khi đo trên máy dev, không bật ở môi trường thật.
- Dọn dữ liệu chạy ở `finally`; nếu kịch bản bị ngắt giữa chừng, tìm và xoá email `load-*`, phòng `LT*`.
