"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Role extends Model {
    static associate(models) {
      Role.belongsToMany(models.Group, {
        through: "Group_Role",
        foreignKey: "roleId",
      });
    }
  }
  Role.init(
    {
      url: DataTypes.STRING,
      description: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Role",
      tableName: "Role",
    }
  );
  return Role;
};
