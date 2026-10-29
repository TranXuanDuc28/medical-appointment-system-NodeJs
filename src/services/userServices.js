import bcrypt from "bcryptjs";
import db from "../models/index";
import { where } from "sequelize";
import { raw } from "body-parser";
import user from "../models/user";
const salt = bcrypt.genSaltSync(10);
let handleUserRegister = (
  email,
  password,
  firstName,
  lastName,
  phoneNumber
) => {
  return new Promise(async (resolve, reject) => {
    try {
      let userData = {};
      let isExits = await checkUserEmail(email);
      if (isExits) {
        userData.errCode = 1;
        userData.errMessage = "Email này đã được đăng ký!";
      } else {
        let hashPasswordFromBcrypt = await hashUserPassword(password);
        await db.User.create({
          email: email,
          firstName: firstName,
          lastName: lastName,
          password: hashPasswordFromBcrypt,
          phoneNumber: phoneNumber,
          roleId: "R3",
        });
        userData.errCode = 0;
        userData.errMessage = "Đăng ký thành công!";
      }
      resolve(userData);
    } catch (error) {
      reject(error);
    }
  });
};
let handleUserLogin = (email, password) => {
  return new Promise(async (resolve, reject) => {
    try {
      let userData = {};
      let isExits = await checkUserEmail(email);
      if (isExits) {
        let users = await db.User.findOne({
          attributes: [
            "id",
            "email",
            "roleId",
            "firstName",
            "lastName",
            "password",
            "image",
            "groupId",
          ],
          where: { email: email },
          include: [
            {
              model: db.AllCode,
              as: "roleData",
              attributes: ["valueEn", "valueVi"],
            },
            {
              model: db.AllCode,
              as: "positionData",
              attributes: ["valueEn", "valueVi"],
            },
            {
              model: db.Group,
              attributes: ["id", "name", "description"],
              include: [
                {
                  model: db.Role,
                  attributes: ["id", "url", "description"],
                  through: { attributes: [] },
                },
              ],
            },
          ],
          raw: false,
          nest: true,
        });

        if (users) {
          let check = bcrypt.compareSync(password, users.password);
          if (check) {
            userData.errCode = 0;
            userData.errMessage = "Ok!";
            delete users.password;
            //Nếu users là object (findOne), chuyển image sang binary string
            if (users.image) {
              users.image = Buffer.from(users.image, "base64").toString(
                "binary"
              );
            }
            userData.users = users;
          } else {
            userData.errCode = 3;
            userData.errMessage = "Sai mật khẩu!";
          }
        } else {
          userData.errCode = 2;
          userData.errMessage = "Không tìm thấy người dùng!";
        }
      } else {
        userData.errCode = 1;
        userData.errMessage =
          "Email của bạn chưa tồn tại! Vui lòng đăng ký tài khoản!";
      }
      resolve(userData);
    } catch (error) {
      reject(error);
    }
  });
};
let handlePatientChatLogin = (email, password) => {
  return new Promise(async (resolve, reject) => {
    try {
      let userData = {};
      let isExits = await checkUserEmail(email);
      if (isExits) {
        let users = await db.User.findOne({
          attributes: [
            "id",
            "email",
            "roleId",
            "firstName",
            "lastName",
            "password",
          ],
          where: { email: email },
          include: [
            {
              model: db.Group,
              attributes: ["id", "name", "description"],
              include: [
                {
                  model: db.Role,
                  attributes: ["id", "url", "description"],
                  through: { attributes: [] },
                },
              ],
            },
          ],
          raw: false,
          nest: true,
        });
        if (users) {
          let check = bcrypt.compareSync(password, users.password);
          if (check) {
            if (users.roleId !== "R3") {
              userData.errCode = 4;
              userData.errMessage =
                "Chỉ tài khoản bệnh nhân mới được đăng nhập chat!";
            } else {
              userData.errCode = 0;
              userData.errMessage = "Ok!";
              let userPlain = users.get({ plain: true });
              delete userPlain.password;
              userData.users = userPlain;
            }
          } else {
            userData.errCode = 3;
            userData.errMessage = "Sai mật khẩu!";
          }
        } else {
          userData.errCode = 2;
          userData.errMessage = "Không tìm thấy người dùng!";
        }
      } else {
        userData.errCode = 1;
        userData.errMessage = "Email chưa tồn tại!";
      }
      resolve(userData);
    } catch (error) {
      reject(error);
    }
  });
};
let checkUserEmail = (userEmail) => {
  return new Promise(async (resolve, reject) => {
    try {
      let users = await db.User.findOne({
        where: { email: userEmail },
      });
      if (users) {
        resolve(true);
      } else {
        resolve(false);
      }
    } catch (error) {
      reject(error);
    }
  });
};
let getAllUsers = (userId) => {
  return new Promise(async (resolve, reject) => {
    try {
      let users = "";
      if (userId === "ALL") {
        users = await db.User.findAll({
          attributes: {
            exclude: ["passWord"],
          },
        });
      }
      if (userId && userId !== "ALL") {
        users = await db.User.findOne({
          where: { id: userId },
          attributes: {
            exclude: ["passWord"],
          },
        });
      }
      resolve(users);
    } catch (error) {
      reject(error);
    }
  });
};
let createNewUsers = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.email || !data.password || !data.firstName || !data.lastName) {
        resolve({
          errCode: 2,
          errMessage: "Vui lòng nhập đầy đủ các trường thông tin bắt buộc (Email, Mật khẩu, Họ, Tên)!",
        });
        return;
      }
      let check = await checkUserEmail(data.email);
      if (check === true) {
        resolve({
          errCode: 1,
          errMessage: "Email đã tồn tại! Vui lòng thử email khác!",
        });
      } else {
        let hashPasswordFromBcrypt = await hashUserPassword(data.password);
        await db.User.create({
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          password: hashPasswordFromBcrypt,
          address: data.address,
          phoneNumber: data.phoneNumber,
          gender: data.gender,
          roleId: data.roleId,
          positionId: data.positionId,
          image: data.avatar,
        });
        resolve({
          errCode: 0,
          errMessage: "OK!",
        });
      }
    } catch (error) {
      reject(error);
    }
  });
};
let hashUserPassword = (password) => {
  return new Promise(async (resolve, reject) => {
    try {
      var hashPassword = await bcrypt.hashSync(password, salt);
      resolve(hashPassword);
    } catch (error) {
      reject(error);
    }
  });
};
let deleteUsers = (userId) => {
  return new Promise(async (resolve, reject) => {
    try {
      let users = await db.User.findOne({
        where: { id: userId },
        raw: false,
      });
      if (users) {
        await users.destroy();
        resolve({
          errCode: 0,
          errMessage: "Xoa thanh cong!",
        });
      } else {
        resolve({
          errCode: 0,
          errMessage: "Khong tim thay email nguoi dung!",
        });
      }
    } catch (error) {
      reject(error);
    }
  });
};
let updateUserData = (data) => {
  console.log(data);
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.id || !data.roleId || !data.gender) {
        resolve({
          errCode: 2,
          errMessage: "Khong co tham so truyen vao!",
        });
      }
      let users = await db.User.findOne({
        where: { id: data.id },
        raw: false,
      });
      if (users) {
        (users.email = data.email),
          (users.firstName = data.firstName),
          (users.lastName = data.lastName),
          (users.address = data.address),
          (users.phoneNumber = data.phoneNumber),
          (users.gender = data.gender),
          (users.roleId = data.roleId);
        users.positionId = data.positionId;
        if (data.avatar) {
          users.image = data.avatar;
        }

        await users.save();
        resolve({
          errCode: 0,
          errMessage: "Cập nhập thành công!",
        });
      } else {
        resolve({
          errCode: 1,
          errMessage: "Không tìm thấy email người dùng!",
        });
      }
    } catch (error) {
      reject(error);
    }
  });
};
let getAllCodeServices = (typeInput) => {
  return new Promise(async (resolve, reject) => {
    try {
      let res = {};
      let allcode = await db.AllCode.findAll({
        where: { type: typeInput },
      });
      res.errCode = 0;
      res.data = allcode;
      resolve(res);
    } catch (error) {
      reject(error);
    }
  });
};
let getUserByEmail = (email) => {
  return new Promise(async (resolve, reject) => {
    try {
      let user = await db.User.findOne({
        where: { email: email },
        include: [
          {
            model: db.Group,
            include: [
              {
                model: db.Role,
                attributes: ["url", "description"],
                through: { attributes: [] },
              },
            ],
          },
        ],
        raw: false,
        nest: true,
      });
      if (user) {
        let plainUser = user.get({ plain: true });
        delete plainUser.password;
        resolve({
          errCode: 0,
          users: plainUser,
        });
      } else {
        resolve({
          errCode: 1,
          errMessage: "Không tìm thấy người dùng!",
        });
      }
    } catch (e) {
      reject(e);
    }
  });
};
let saveFCMToken = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.userId || !data.fcmToken) {
        resolve({
          errCode: 1,
          errMessage: "Missing required parameters!",
        });
      } else {
        let user = await db.User.findOne({
          where: { id: data.userId },
          raw: false,
        });
        if (user) {
          user.fcmToken = data.fcmToken;
          await user.save();
          resolve({
            errCode: 0,
            errMessage: "Save FCM Token succeed!",
          });
        } else {
          resolve({
            errCode: 2,
            errMessage: "User not found!",
          });
        }
      }
    } catch (e) {
      reject(e);
    }
  });
};
module.exports = {
  handleUserRegister: handleUserRegister,
  handleUserLogin: handleUserLogin,
  handlePatientChatLogin: handlePatientChatLogin,
  getAllUsers: getAllUsers,
  createNewUsers: createNewUsers,
  deleteUsers: deleteUsers,
  updateUserData: updateUserData,
  getAllCodeServices: getAllCodeServices,
  getUserByEmail: getUserByEmail,
  saveFCMToken: saveFCMToken,
};
