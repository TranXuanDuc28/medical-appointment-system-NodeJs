"use strict";
/**
 * Các model RBAC / audit / refresh token trong MỘT file. models/index.js chỉ nạp
 * `module.exports = (sequelize, DataTypes) => Model` nên file này export 1 model chính
 * (RbacRole) và đăng ký thêm các model còn lại qua sequelize.define.
 */
module.exports = (sequelize, DataTypes) => {
  const RbacRole = sequelize.define(
    "RbacRole",
    {
      code: { type: DataTypes.STRING(32), primaryKey: true },
      name: DataTypes.STRING(64),
      description: DataTypes.STRING(255),
      isSystem: DataTypes.BOOLEAN,
    },
    { tableName: "rbac_roles" }
  );

  sequelize.define(
    "RbacPermission",
    {
      code: { type: DataTypes.STRING(64), primaryKey: true },
      group: DataTypes.STRING(32),
      description: DataTypes.STRING(255),
    },
    { tableName: "rbac_permissions" }
  );

  sequelize.define(
    "RbacRolePermission",
    {
      roleCode: { type: DataTypes.STRING(32), primaryKey: true },
      permissionCode: { type: DataTypes.STRING(64), primaryKey: true },
    },
    { tableName: "rbac_role_permissions", updatedAt: false }
  );

  sequelize.define(
    "AccessAuditLog",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      userId: DataTypes.INTEGER,
      roleCode: DataTypes.STRING(32),
      action: DataTypes.STRING(64),
      resource: DataTypes.STRING(64),
      resourceId: DataTypes.STRING(64),
      result: DataTypes.STRING(16),
      ip: DataTypes.STRING(64),
      meta: DataTypes.TEXT,
    },
    { tableName: "access_audit_logs", updatedAt: false }
  );

  sequelize.define(
    "RefreshToken",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      userId: DataTypes.INTEGER,
      tokenHash: DataTypes.STRING(64),
      expiresAt: DataTypes.DATE,
      revokedAt: DataTypes.DATE,
      replacedByHash: DataTypes.STRING(64),
      ip: DataTypes.STRING(64),
      userAgent: DataTypes.STRING(255),
    },
    { tableName: "refresh_tokens", updatedAt: false }
  );

  return RbacRole;
};
