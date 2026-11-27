const { verifyToken } = require("./JWTaction");
const { RULES, PUBLIC, AUTH } = require("../config/accessRules");
const authContext = require("../services/authContext");

const compiled = RULES.map(([method, path, access]) => ({
  method,
  path,
  access,
  regex: new RegExp("^" + path.replace(/:[A-Za-z]+/g, "[^/]+") + "/?$"),
}));

const findRule = (method, path) =>
  compiled.find((r) => r.method === method && r.regex.test(path));

const pathOf = (req) => (req.originalUrl || req.url || "").split("?")[0];

const extractToken = (req) => {
  const header = req.headers && req.headers["authorization"];
  if (header && header.startsWith("Bearer ")) return header.slice(7);
  return req.cookies && req.cookies.jwt ? req.cookies.jwt : null;
};

/**
 * Xác thực token rồi đối chiếu với TRẠNG THÁI HIỆN TẠI trong DB:
 *  - tài khoản còn tồn tại và đang hoạt động
 *  - tokenVersion khớp (đổi vai trò/khoá tài khoản/đăng xuất mọi nơi => token cũ vô hiệu ngay)
 *  - vai trò & quyền lấy từ DB (không tin roleId trong token)
 * Trả về {id,email,roleId,permissions:Set} hoặc null. Ném lỗi nếu hạ tầng (DB) lỗi.
 */
const resolveToken = async (token) => {
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || !decoded.id || decoded.tv === undefined) return null; // token kiểu cũ -> buộc refresh
  const state = await authContext.getUserState(decoded.id);
  if (!state || !state.isActive || state.tokenVersion !== Number(decoded.tv)) return null;
  const permissions = await authContext.getRolePermissions(state.roleId);
  return { id: state.id, email: state.email, roleId: state.roleId, permissions };
};

const authenticate = (req) => resolveToken(extractToken(req));

/**
 * Middleware default-deny: gắn trước toàn bộ route.
 * - Route không khai báo trong accessRules -> 403
 * - PUBLIC -> cho qua (vẫn gắn req.user nếu token hợp lệ)
 * - AUTH   -> cần đăng nhập
 * - mảng permission -> cần ÍT NHẤT MỘT quyền trong mảng
 */
const accessControl = async (req, res, next) => {
  if (req.method === "OPTIONS") return next();
  const path = pathOf(req);
  if (!path.startsWith("/api/")) return next();

  const rule = findRule(req.method, path);
  if (!rule) {
    return res.status(403).json({
      errCode: -1,
      errMessage: "Route chưa được khai báo quyền truy cập",
    });
  }

  let user = null;
  try {
    user = await authenticate(req);
  } catch (e) {
    console.error("[Auth] Lỗi xác thực:", e.message);
    if (rule.access === PUBLIC) return next();
    return res.status(503).json({ errCode: -1, errMessage: "Dịch vụ xác thực tạm thời không khả dụng" });
  }

  if (rule.access === PUBLIC) {
    if (user) req.user = user;
    return next();
  }
  if (!user) {
    return res.status(401).json({ errCode: -1, errMessage: "Not authenticated user" });
  }
  if (Array.isArray(rule.access) && !rule.access.some((p) => user.permissions.has(p))) {
    return res.status(403).json({
      errCode: -1,
      errMessage: "You don't have permission to access this resource...",
    });
  }
  req.user = user;
  return next();
};

module.exports = { accessControl, authenticate, resolveToken, findRule, extractToken, AUTH };
