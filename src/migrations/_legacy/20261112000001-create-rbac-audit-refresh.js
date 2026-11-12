"use strict";

/**
 * A9–A11: RBAC cấp quyền hạn, audit log, refresh token, cột bảo mật cho Users.
 * Không đụng tới các bảng Group/Role/Group_Role cũ (đã deprecated, xoá thủ công sau khi xác nhận).
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = Sequelize.literal("CURRENT_TIMESTAMP");

    await queryInterface.createTable("rbac_roles", {
      code: { type: Sequelize.STRING(32), primaryKey: true, allowNull: false },
      name: { type: Sequelize.STRING(64), allowNull: false },
      description: { type: Sequelize.STRING(255) },
      isSystem: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    });

    await queryInterface.createTable("rbac_permissions", {
      code: { type: Sequelize.STRING(64), primaryKey: true, allowNull: false },
      group: { type: Sequelize.STRING(32), allowNull: false },
      description: { type: Sequelize.STRING(255) },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    });

    await queryInterface.createTable("rbac_role_permissions", {
      roleCode: {
        type: Sequelize.STRING(32),
        primaryKey: true,
        allowNull: false,
        references: { model: "rbac_roles", key: "code" },
        onDelete: "CASCADE",
      },
      permissionCode: {
        type: Sequelize.STRING(64),
        primaryKey: true,
        allowNull: false,
        references: { model: "rbac_permissions", key: "code" },
        onDelete: "CASCADE",
      },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    });

    await queryInterface.createTable("access_audit_logs", {
      id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true, allowNull: false },
      userId: { type: Sequelize.INTEGER, allowNull: true },
      roleCode: { type: Sequelize.STRING(32), allowNull: true },
      action: { type: Sequelize.STRING(64), allowNull: false },
      resource: { type: Sequelize.STRING(64), allowNull: true },
      resourceId: { type: Sequelize.STRING(64), allowNull: true },
      result: { type: Sequelize.STRING(16), allowNull: false, defaultValue: "ALLOWED" }, // ALLOWED | DENIED | FAILED
      ip: { type: Sequelize.STRING(64), allowNull: true },
      meta: { type: Sequelize.TEXT, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    });
    await queryInterface.addIndex("access_audit_logs", ["userId", "createdAt"]);
    await queryInterface.addIndex("access_audit_logs", ["action", "createdAt"]);
    await queryInterface.addIndex("access_audit_logs", ["resource", "resourceId"]);

    await queryInterface.createTable("refresh_tokens", {
      id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true, allowNull: false },
      userId: { type: Sequelize.INTEGER, allowNull: false },
      tokenHash: { type: Sequelize.STRING(64), allowNull: false, unique: true }, // sha256 của refresh token
      expiresAt: { type: Sequelize.DATE, allowNull: false },
      revokedAt: { type: Sequelize.DATE, allowNull: true },
      replacedByHash: { type: Sequelize.STRING(64), allowNull: true },
      ip: { type: Sequelize.STRING(64), allowNull: true },
      userAgent: { type: Sequelize.STRING(255), allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    });
    await queryInterface.addIndex("refresh_tokens", ["userId"]);

    await queryInterface.addColumn("Users", "isActive", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
    await queryInterface.addColumn("Users", "tokenVersion", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("Users", "tokenVersion");
    await queryInterface.removeColumn("Users", "isActive");
    await queryInterface.dropTable("refresh_tokens");
    await queryInterface.dropTable("access_audit_logs");
    await queryInterface.dropTable("rbac_role_permissions");
    await queryInterface.dropTable("rbac_permissions");
    await queryInterface.dropTable("rbac_roles");
  },
};
