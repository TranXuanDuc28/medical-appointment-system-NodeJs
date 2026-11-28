/**
 * Client gọi AI Service (Python/FastAPI) – được thiết kế để AI KHÔNG BAO GIỜ làm sập hay làm chậm hàng đợi.
 *
 *  - Thời gian chờ tối đa (mặc định 1500ms) cho mỗi lần gọi.
 *  - Bộ ngắt mạch (circuit breaker): sau N lần LỖI HẠ TẦNG liên tiếp (timeout, mất kết nối, 5xx) thì ngừng gọi trong
 *    một khoảng nghỉ; hết khoảng nghỉ thử lại 1 lần (half-open). Lỗi 4xx (dữ liệu sai) KHÔNG tính là hạ tầng hỏng.
 *  - Không cấu hình AI_SERVICE_URL => `enabled=false`, mọi nơi gọi tự quay về phương án dự phòng.
 *
 * Mọi hàm ném AiUnavailableError khi AI không dùng được; người gọi bắt lỗi này và dùng dự phòng.
 */
class AiUnavailableError extends Error {
  constructor(reason) {
    super(`AI Service không khả dụng: ${reason}`);
    this.name = "AiUnavailableError";
    this.reason = reason;
  }
}

class AiRequestError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "AiRequestError";
    this.status = status;
  }
}

const MAX_ITEMS = 200; // khớp giới hạn của AI Service

class AiClient {
  constructor(opts = {}) {
    this.baseUrl = (opts.baseUrl ?? process.env.AI_SERVICE_URL ?? "").replace(/\/$/, "");
    this.token = opts.token ?? process.env.AI_SERVICE_TOKEN ?? "";
    this.timeoutMs = Number(opts.timeoutMs ?? process.env.AI_TIMEOUT_MS ?? 1500);
    this.failThreshold = Number(opts.failThreshold ?? process.env.AI_CIRCUIT_FAILS ?? 3);
    this.cooldownMs = Number(opts.cooldownMs ?? process.env.AI_CIRCUIT_COOLDOWN_MS ?? 30000);
    this.fetchImpl = opts.fetchImpl || (typeof fetch === "function" ? fetch : null);
    this.failures = 0;
    this.openUntil = 0;
    this.lastError = null;
    this.lastOkAt = null;
  }

  get enabled() {
    return !!this.baseUrl && !!this.fetchImpl;
  }

  /** closed = đang gọi bình thường · open = tạm ngưng · half-open = hết khoảng nghỉ, cho thử lại. */
  get circuitState() {
    if (this.failures < this.failThreshold) return "closed";
    return Date.now() < this.openUntil ? "open" : "half-open";
  }

  status() {
    return {
      enabled: this.enabled, baseUrl: this.baseUrl || null, circuit: this.circuitState, consecutiveFailures: this.failures,
      lastError: this.lastError, lastOkAt: this.lastOkAt, timeoutMs: this.timeoutMs,
    };
  }

  _recordFailure(reason) {
    this.failures += 1;
    this.lastError = reason;
    if (this.failures >= this.failThreshold) this.openUntil = Date.now() + this.cooldownMs;
  }

  async _request(method, path, body, { auth = true } = {}) {
    if (!this.enabled) throw new AiUnavailableError("chưa cấu hình AI_SERVICE_URL");
    if (this.circuitState === "open") throw new AiUnavailableError("ngắt mạch đang mở (AI lỗi liên tiếp)");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let res;
    try {
      res = await this.fetchImpl(this.baseUrl + path, {
        method,
        headers: { "Content-Type": "application/json", ...(auth && this.token ? { "X-AI-Token": this.token } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (e) {
      const reason = e.name === "AbortError" ? `quá ${this.timeoutMs}ms` : e.message;
      this._recordFailure(reason);
      throw new AiUnavailableError(reason);
    } finally {
      clearTimeout(timer);
    }

    if (res.status >= 500) {
      this._recordFailure(`HTTP ${res.status}`);
      throw new AiUnavailableError(`HTTP ${res.status}`);
    }
    let json = null;
    try {
      json = await res.json();
    } catch (_) {
      /* thân rỗng */
    }
    if (res.status >= 400) {
      // Lỗi do dữ liệu gửi đi (4xx) – dịch vụ vẫn sống nên không mở ngắt mạch
      this.failures = 0;
      throw new AiRequestError(res.status, (json && json.detail) || `HTTP ${res.status}`);
    }
    this.failures = 0;
    this.lastError = null;
    this.lastOkAt = new Date().toISOString();
    return json;
  }

  /** items: mảng đặc trưng (xem ai-service/README.md). Trả về mảng dự đoán cùng thứ tự. */
  async predictDuration(items) {
    const out = [];
    for (let i = 0; i < items.length; i += MAX_ITEMS) {
      const r = await this._request("POST", "/predict-duration", { items: items.slice(i, i + MAX_ITEMS) });
      out.push(...r.predictions);
    }
    return out;
  }

  triage(text) {
    return this._request("POST", "/triage", { text });
  }

  health() {
    return this._request("GET", "/health", undefined, { auth: false });
  }

  modelInfo() {
    return this._request("GET", "/model-info");
  }
}

let instance = null;
/** Client dùng chung của toàn ứng dụng (tạo lười từ biến môi trường). */
const getClient = () => (instance = instance || new AiClient());
/** Chỉ dùng trong test: thay client. */
const setClient = (c) => {
  instance = c;
};

module.exports = { AiClient, AiUnavailableError, AiRequestError, getClient, setClient };
