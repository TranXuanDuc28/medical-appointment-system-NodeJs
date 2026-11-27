import bcrypt from "bcryptjs";
import db from "../models/index";
import deviceTokenService from "./deviceTokenService";
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
            "isActive",
            "tokenVersion",
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
          ],
          raw: false,
          nest: true,
        });

        if (users) {
          // Tài khoản tạo tự động khi đặt lịch (khách) chưa có mật khẩu -> không đăng nhập được
          let check = users.password
            ? bcrypt.compareSync(password, users.password)
            : false;
          if (check && users.isActive === false) {
            userData.errCode = 5;
            userData.errMessage = "Tài khoản đã bị khoá, vui lòng liên hệ quản trị viên!";
          } else if (check) {
            userData.errCode = 0;
            userData.errMessage = "Ok!";
            // Chuyển sang object thường rồi mới xoá password
            // (trước đây `delete users.password` trên instance Sequelize không có tác dụng
            // nên hash mật khẩu bị trả về cho client)
            const plainUser = users.get({ plain: true });
            delete plainUser.password;
            if (plainUser.image) {
              plainUser.image = Buffer.from(plainUser.image, "base64").toString(
                "binary"
              );
            }
            userData.users = plainUser;
            db.User.update({ lastLoginAt: new Date() }, { where: { id: plainUser.id } }).catch(() => {});
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
            "isActive",
            "tokenVersion",
          ],
          where: { email: email },
          include: [
          ],
          raw: false,
          nest: true,
        });
        if (users) {
          let check = users.password
            ? bcrypt.compareSync(password, users.password)
            : false;
          if (check && users.isActive === false) {
            userData.errCode = 5;
            userData.errMessage = "Tài khoản đã bị khoá, vui lòng liên hệ quản trị viên!";
          } else if (check) {
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
        paranoid: false, // tài khoản đã xoá mềm vẫn chiếm email (UNIQUE ở DB)
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
      // Tên cột đúng là "password" (trước đây ghi "passWord" nên hash mật khẩu
      // của toàn bộ user bị trả ra API)
      if (userId === "ALL") {
        users = await db.User.findAll({
          attributes: {
            exclude: ["password"],
          },
        });
      }
      if (userId && userId !== "ALL") {
        users = await db.User.findOne({
          where: { id: userId },
          attributes: {
            exclude: ["password"],
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
          gender: data.gender || null, // chuỗi rỗng sẽ vi phạm FK reference_codes
          roleId: data.roleId || "R3",
          positionId: data.positionId || null,
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
        return resolve({
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
          (users.gender = data.gender || null),
          (users.roleId = data.roleId);
        users.positionId = data.positionId || null;
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
        attributes: ["id", "keyMap", "type", "valueEn", "valueVi", "createdAt", "updatedAt"],
        order: [["sortOrder", "ASC"], ["id", "ASC"]],
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
          attributes: ["id"],
          raw: true,
        });
        if (user) {
          await deviceTokenService.saveToken(user.id, data.fcmToken, data.platform || "web");
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
