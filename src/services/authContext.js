/**
 * Nơi duy nhất cung cấp "trạng thái tài khoản" và "quyền của vai trò" cho tầng xác thực.
 * Tách riêng để unit test có thể thay bằng dữ liệu giả (không cần DB).
 */
let overrides = null;

const impl = () => overrides || require("./rbacService");

const getUserState = (id) => impl().getUserState(id);
const getRolePermissions = (roleCode) => impl().getRolePermissions(roleCode);

/** Chỉ dùng trong test. */
const setProviders = (p) => {
  overrides = p;
};

module.exports = { getUserState, getRolePermissions, setProviders };
