const triageService = require("../services/ai/triageService");
const aiPredictions = require("../services/ai/aiPredictions");
const { getClient, AiRequestError } = require("../services/ai/aiClient");

/** POST /api/ai/triage {text} – gợi ý chuyên khoa từ triệu chứng (công khai, có giới hạn tần suất). Không bao giờ chặn việc đặt lịch. */
const triage = async (req, res) => {
  try {
    const text = req.body && req.body.text;
    if (typeof text !== "string" || text.trim().length < 3 || text.length > 1000) {
      return res.status(400).json({ errCode: 1, errMessage: "Mô tả triệu chứng phải dài 3–1000 ký tự" });
    }
    const data = await triageService.triage(text.trim());
    return res.status(200).json({ errCode: 0, errMessage: "OK", data });
  } catch (e) {
    if (e instanceof AiRequestError) return res.status(400).json({ errCode: 1, errMessage: String(e.message) });
    console.error("[AI triage]", e);
    return res.status(500).json({ errCode: -1, errMessage: "Lỗi từ server!" });
  }
};

/** GET /api/ai/status – tình trạng AI Service và bộ ngắt mạch (quyền ai-metrics:read). */
const status = async (req, res) => {
  const client = getClient();
  const info = client.status();
  let health = null;
  if (client.enabled) {
    try {
      health = await client.health();
    } catch (e) {
      health = { status: "unreachable", reason: e.reason || e.message };
    }
  }
  return res.status(200).json({ errCode: 0, errMessage: "OK", data: { ...info, health } });
};

/** GET /api/ai/metrics?days=30 – đối sánh AI với baseline trên các ca đã khám xong. */
const metrics = async (req, res) => {
  try {
    return res.status(200).json({ errCode: 0, errMessage: "OK", data: await aiPredictions.getMetrics({ days: req.query.days }) });
  } catch (e) {
    console.error("[AI metrics]", e);
    return res.status(500).json({ errCode: -1, errMessage: "Lỗi từ server!" });
  }
};

module.exports = { triage, status, metrics };
