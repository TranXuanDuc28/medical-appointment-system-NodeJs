/**
 * Phục vụ file trong /uploads CÓ KIỂM SOÁT (trước đây là static công khai: ai biết URL cũng tải được,
 * trong khi file là tài liệu/ảnh trao đổi giữa bác sĩ và bệnh nhân).
 *
 * Được xem khi đã đăng nhập VÀ thuộc một trong hai:
 *   1. là người tải file lên (tên file có tiền tố `u<userId>-`, đặt bởi route upload), hoặc
 *   2. là người gửi/người nhận của một tin nhắn đính kèm file đó.
 * Không đủ điều kiện => 404 (không tiết lộ file có tồn tại hay không).
 */
const path = require("path");
const fs = require("fs");

/** Tên file hợp lệ: một đoạn duy nhất, chỉ chữ/số/._- (route upload đã slugify tên nên luôn đạt). */
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,200}$/;

const uploaderOf = (name) => {
  const m = /^u(\d+)-/.exec(name);
  return m ? Number(m[1]) : null;
};

/** LIKE: escape % _ \ để tên file chứa "_" không bị hiểu là ký tự đại diện. */
const escapeLike = (s) => s.replace(/[\\%_]/g, (c) => "\\" + c);

/** Mặc định tra DB: có tin nhắn đính kèm file này mà userId là người gửi hoặc người nhận? */
const defaultIsParticipant = async (userId, name) => {
  const db = require("../models/index");
  const { Op } = require("sequelize");
  const rows = await db.Message.findAll({
    where: { fileUrl: { [Op.like]: `%/uploads/${escapeLike(name)}` }, [Op.or]: [{ senderId: userId }, { receiverId: userId }] },
    attributes: ["fileUrl"], limit: 5, raw: true,
  });
  // LIKE chỉ lọc sơ bộ; kiểm lại khớp ĐUÔI chính xác
  return rows.some((r) => String(r.fileUrl).endsWith(`/uploads/${name}`));
};

/**
 * @param {{dir:string, authenticate:(req)=>Promise<object|null>, isParticipant?:(userId:number,name:string)=>Promise<boolean>}} opts
 */
const makeUploadsHandler = ({ dir, authenticate, isParticipant = defaultIsParticipant }) => {
  const root = path.resolve(dir);
  return async (req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") return res.status(405).end();

    let user = null;
    try {
      user = await authenticate(req);
    } catch (e) {
      console.error("[Uploads] Lỗi xác thực:", e.message);
      return res.status(503).json({ errCode: -1, errMessage: "Dịch vụ xác thực tạm thời không khả dụng" });
    }
    if (!user) return res.status(401).json({ errCode: -1, errMessage: "Not authenticated user" });

    let name;
    try {
      name = decodeURIComponent(req.path.replace(/^\/+/, ""));
    } catch (_) {
      return res.status(404).end();
    }
    if (!SAFE_NAME.test(name)) return res.status(404).end();

    const file = path.join(root, name);
    if (path.dirname(file) !== root || !fs.existsSync(file)) return res.status(404).end();

    const allowed = uploaderOf(name) === Number(user.id) || (await isParticipant(Number(user.id), name));
    if (!allowed) return res.status(404).end();

    // File riêng tư: không cho proxy/CDN dùng chung bộ nhớ đệm; chặn trình duyệt tự đoán kiểu nội dung
    res.set({
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "cross-origin", // frontend khác origin vẫn nhúng được (đã đăng nhập)
    });
    return res.sendFile(file, { dotfiles: "deny" }, (err) => {
      if (err && !res.headersSent) res.status(404).end();
    });
  };
};

module.exports = { makeUploadsHandler, uploaderOf, SAFE_NAME, escapeLike };
