/**
 * Kiểm tra quyền sở hữu dữ liệu dựa trên PERMISSION (không còn so sánh roleId cứng).
 */
const { P } = require("../config/permissions");

const forbidden = (res) =>
  res.status(403).json({
    errCode: -1,
    errMessage: "You don't have permission to access this resource...",
  });

const has = (user, perm) => !!(user && user.permissions && user.permissions.has(perm));

/** Cho qua nếu là chính chủ (extract(req) == user.id) hoặc có ít nhất một permission ngoại lệ. */
const selfOrPermission = (extract, ...perms) => (req, res, next) => {
  const user = req.user;
  if (!user) return res.status(401).json({ errCode: -1, errMessage: "Not authenticated user" });
  if (perms.some((p) => has(user, p))) return next();
  const target = extract(req);
  if (target !== undefined && target !== null && String(target) === String(user.id)) return next();
  return forbidden(res);
};

/**
 * Người có `doctor-data:manage:any` (admin) thao tác thay mọi bác sĩ;
 * bác sĩ thường chỉ được thao tác với doctorId của chính mình.
 */
const doctorSelf = (extract) => (req, res, next) => {
  const user = req.user;
  if (!user) return res.status(401).json({ errCode: -1, errMessage: "Not authenticated user" });
  if (has(user, P.DOCTOR_DATA_ANY)) return next();
  if (String(extract(req)) !== String(user.id)) return forbidden(res);
  return next();
};

module.exports = { selfOrPermission, doctorSelf, has, forbidden };
