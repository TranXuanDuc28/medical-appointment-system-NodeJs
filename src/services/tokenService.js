/**
 * Cấp / xoay vòng / thu hồi refresh token (A11).
 * - Refresh token là JWT (có jti ngẫu nhiên) nhưng còn được lưu hash trong DB để thu hồi được.
 * - Mỗi lần refresh: token cũ bị thu hồi, cấp token mới (rotation).
 * - Dùng lại token đã thu hồi (reuse) => coi như bị đánh cắp: thu hồi toàn bộ phiên của user.
 */
const crypto = require("crypto");
const db = require("../models/index");
const JWT = require("../middleware/JWTaction");
const rbac = require("./rbacService");

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
const RT = () => db.sequelize.models.RefreshToken;

const buildTokenPayload = (user) => ({
  id: user.id,
  email: user.email,
  roleId: user.roleId,
  tv: Number(user.tokenVersion || 0),
});

/** Cấp cặp access + refresh token và lưu refresh token. */
const issueTokenPair = async (user, req) => {
  const payload = buildTokenPayload(user);
  const accessToken = JWT.createJWT(payload);
  const refreshToken = JWT.createRefreshToken({ ...payload, jti: crypto.randomUUID() });
  const decoded = JWT.verifyRefreshToken(refreshToken);
  await RT().create({
    userId: user.id,
    tokenHash: sha256(refreshToken),
    expiresAt: new Date(decoded.exp * 1000),
    ip: req ? (req.ip || null) : null,
    userAgent: req && req.headers ? String(req.headers["user-agent"] || "").slice(0, 255) : null,
  });
  return { accessToken, refreshToken };
};

/**
 * Xoay vòng refresh token.
 * @returns {{ok:true, accessToken, refreshToken, user} | {ok:false, status, message}}
 */
const rotateRefreshToken = async (refreshToken, req) => {
  const decoded = refreshToken ? JWT.verifyRefreshToken(refreshToken) : null;
  if (!decoded || !decoded.id) return { ok: false, status: 401, message: "Refresh Token hết hạn hoặc không hợp lệ!" };

  const hash = sha256(refreshToken);
  const row = await RT().findOne({ where: { tokenHash: hash }, raw: true });
  if (!row) return { ok: false, status: 401, message: "Refresh Token không hợp lệ!" };

  if (row.revokedAt) {
    // Token đã dùng/thu hồi mà vẫn được gửi lại -> nghi bị đánh cắp
    await rbac.revokeAllRefreshTokens(row.userId);
    console.warn(`[Auth] Phát hiện dùng lại refresh token của user ${row.userId}, đã thu hồi mọi phiên`);
    return { ok: false, status: 401, message: "Phiên đăng nhập không còn hợp lệ, vui lòng đăng nhập lại!" };
  }

  rbac.invalidateUser(row.userId); // luôn đọc trạng thái mới nhất khi refresh
  const state = await rbac.getUserState(row.userId);
  if (!state || !state.isActive) return { ok: false, status: 401, message: "Tài khoản không khả dụng!" };
  if (Number(decoded.tv || 0) !== state.tokenVersion) {
    return { ok: false, status: 401, message: "Phiên đăng nhập đã bị thu hồi, vui lòng đăng nhập lại!" };
  }

  const pair = await issueTokenPair(state, req);
  await RT().update({ revokedAt: new Date(), replacedByHash: sha256(pair.refreshToken) }, { where: { id: row.id } });
  return { ok: true, ...pair, user: state };
};

/** Đăng xuất: thu hồi refresh token hiện tại (nếu có). */
const revokeRefreshToken = async (refreshToken) => {
  if (!refreshToken) return;
  try {
    await RT().update({ revokedAt: new Date() }, { where: { tokenHash: sha256(refreshToken), revokedAt: null } });
  } catch (e) {
    console.error("[Auth] revokeRefreshToken:", e.message);
  }
};

/** Dọn token hết hạn > 30 ngày (gọi định kỳ). */
const purgeExpired = async () => {
  const { Op } = require("sequelize");
  return RT().destroy({ where: { expiresAt: { [Op.lt]: new Date(Date.now() - 30 * 24 * 3600 * 1000) } } });
};

module.exports = { issueTokenPair, rotateRefreshToken, revokeRefreshToken, purgeExpired, sha256, buildTokenPayload };
