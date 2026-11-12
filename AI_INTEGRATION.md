# Tích hợp AI Service vào hàng đợi

Backend gọi `ai-service` (Python/FastAPI) để **dự đoán thời lượng khám từng ca** và **gợi ý chuyên khoa từ triệu chứng**.
Nguyên tắc: **AI chỉ là phần tăng cường – AI chết/chậm/sai thì hệ thống vẫn chạy bình thường.**

## Luồng

```
check-in / walk-in ─► queueService.etaForDoctor
                        └─ queueAi.predictDurations (1 lần gọi theo lô cho cả hàng đợi của bác sĩ, cache 5s)
                              └─ aiClient (timeout, ngắt mạch)  ──lỗi──►  Map rỗng
                        └─ queueEta.estimateForDoctor(tickets, avgMinutes, now, {durations})
                              ├─ đủ thời lượng AI cho MỌI vé  → basis = "ml"
                              ├─ thiếu một phần / AI lỗi       → basis = "history" (trung bình lịch sử bác sĩ)
                              └─ chưa có lịch sử               → basis = "default" (15 phút)
sau commit: CHECK_IN/WALK_IN → aiPredictions.recordInitial   (ghi dự đoán + baseline)
            FINISH           → aiPredictions.recordActual    (điền thời lượng/thời gian chờ THỰC TẾ)
```

## Thành phần (`src/services/ai/`)

| File | Vai trò |
|---|---|
| `aiClient.js` | HTTP client: timeout (`AI_TIMEOUT_MS`), chia lô 200, ngắt mạch closed/open/half-open (`AI_CIRCUIT_FAILS`, `AI_CIRCUIT_COOLDOWN_MS`). 5xx/mạng/timeout = lỗi hạ tầng (đếm vào ngắt mạch); 4xx = `AiRequestError` (không mở mạch). |
| `queueAi.js` | Dựng đặc trưng từ DB (khoa, nguồn vé, giờ, độ dài hàng, kinh nghiệm bác sĩ, tuổi/giới/bệnh mạn, mức nặng từ `symptom_intakes`), gọi AI, trả `Map ticketId → {minutes,p10,p90,version}`; mọi lỗi → `Map` rỗng. |
| `aiPredictions.js` | Ghi `ai_predictions` (dự đoán so với thực tế) và `getMetrics`: MAE của AI so với baseline (trung bình lịch sử, hằng số 15'), % cải thiện, độ phủ khoảng p10–p90. |
| `triageService.js` | Gợi ý chuyên khoa; ánh xạ khoá của AI về `specialty_id` thật; ghi `symptom_intakes`. |

## API

| Route | Quyền | Mô tả |
|---|---|---|
| `POST /api/ai/triage` `{text}` | công khai (giới hạn 40 lần/10 phút/IP) | `data.available=false` khi AI tắt/chết → giao diện cho chọn chuyên khoa thủ công. Không bao giờ chặn đặt lịch. |
| `GET /api/ai/status` | `ai-metrics:read` | Tình trạng AI Service + trạng thái ngắt mạch |
| `GET /api/ai/metrics?days=30` | `ai-metrics:read` | Số liệu đối sánh AI vs baseline trên ca đã khám xong |

Đặt lịch nhận thêm `symptoms`, `severity` (`nhẹ|vừa|nặng`) — tuỳ chọn; có thì ghi `symptom_intakes` (best-effort, lỗi không làm hỏng đặt lịch).
Vé trả về thêm `predictedDurationMin`; khi `etaBasis="ml"` có thêm `predictedDurationRangeMin` và `modelVersion`.

## Cấu hình
Xem mục 9 trong `.env.example`. Để trống `AI_SERVICE_URL` = tắt AI hoàn toàn.

## Kiểm thử
- `tests/ai.client.test.js` (không cần DB): client, timeout, ngắt mạch, ETA, thống kê.
- `tests/ai.integration.test.js` (`RUN_DB_TESTS=1`): luồng đầy đủ với AI giả trên MySQL thật, và kịch bản AI chết.

## Lưu ý trung thực về số liệu
Mô hình hiện huấn luyện trên **dữ liệu mô phỏng** nên `GET /api/ai/metrics` mới là bằng chứng thật: chỉ có ý nghĩa khi đã tích luỹ ca khám thực. Khi đủ ≥ 200 ca, huấn luyện lại từ log thật (xem `ai-service/README.md`).
