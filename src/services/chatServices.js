const db = require("../models");
import { Op } from "sequelize";

// Include thông tin người gửi/nhận từ bảng users (schema v2 không còn lưu name/email trong messages).
const USER_ATTRS = ["id", "lastName", "email", "image"];
const withUsers = [
  { model: db.User, as: "sender", attributes: USER_ATTRS, paranoid: false, required: false },
  { model: db.User, as: "receiver", attributes: USER_ATTRS, paranoid: false, required: false },
];

const imageOf = (u) =>
  u && u.image ? Buffer.from(u.image, "base64").toString("binary") : null;

// Chuẩn hoá về đúng shape cũ: {id,msg,sender:{id,name,email,image},receiver:{...},file_*,createdAt,updatedAt}
// senderId/receiverId lấy từ chính tin nhắn; name = lastName của user.
const toLegacy = (m, senderId, receiverId) => ({
  id: m.id,
  msg: m.body,
  sender: {
    id: senderId,
    name: m.sender ? m.sender.lastName : null,
    email: m.sender ? m.sender.email : null,
    image: imageOf(m.sender),
  },
  receiver: {
    id: receiverId,
    name: m.receiver ? m.receiver.lastName : null,
    email: m.receiver ? m.receiver.email : null,
    image: imageOf(m.receiver),
  },
  file_url: m.fileUrl,
  file_type: m.fileType,
  file_name: m.fileName,
  createdAt: m.createdAt,
  updatedAt: m.updatedAt,
});

let saveMsg = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.sender || !data.receiver) {
        resolve({
          errCode: 1,
          errMessage: "Missing parameter",
        });
      } else {
        let savedMsg = await db.Message.create({
          body: data.msg,
          senderId: data.sender.id,
          receiverId: data.receiver._id || data.receiver.id,
          fileUrl: data.file_url || null,
          fileType: data.file_type || null,
          fileName: data.file_name || null,
        });
        // Lấy thông tin người gửi/nhận (1 truy vấn, có ảnh)
        const full = await db.Message.findOne({
          where: { id: savedMsg.id },
          include: withUsers,
          raw: false,
          nest: true,
        });
        const result = toLegacy(
          {
            id: savedMsg.id,
            body: savedMsg.body,
            sender: full ? full.sender : null,
            receiver: full ? full.receiver : null,
            fileUrl: savedMsg.fileUrl,
            fileType: savedMsg.fileType,
            fileName: savedMsg.fileName,
            createdAt: savedMsg.createdAt,
            updatedAt: savedMsg.updatedAt,
          },
          savedMsg.senderId,
          savedMsg.receiverId
        );

        resolve({
          errCode: 0,
          errMesssage: "Save Message Succesfull",
          data: result,
        });
      }
    } catch (e) {
      reject(e);
    }
  });
};

let getMsg = (id, userId, offset) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Kiểm tra tham số đầu vào
      if (!id || !userId) {
        return resolve({
          errCode: 1,
          errMessage: "Missing parameter",
          data: [],
        });
      }

      // Truy vấn tin nhắn giữa hai người dùng (kèm sender/receiver, không còn N+1)
      let allMsg = await db.Message.findAll({
        where: {
          [Op.or]: [
            { senderId: id, receiverId: userId },
            { senderId: userId, receiverId: id },
          ],
        },
        include: withUsers,
        order: [
          ["createdAt", "DESC"],
          ["id", "DESC"],
        ],
        limit: 10,
        offset: offset,
        raw: false,
        nest: true,
      });

      // Chuẩn hóa kết quả trả về, lấy thêm image
      let result = (allMsg || [])
        .reverse()
        .map((m) => toLegacy(m, m.senderId, m.receiverId));

      // Trả kết quả, dù rỗng
      resolve({
        errCode: 0,
        errMessage: "Fetched messages successfully",
        data: result,
      });
    } catch (e) {
      console.error("Error in getMsg:", e);
      reject({
        errCode: -1,
        errMessage: "Internal server error",
        data: [],
      });
    }
  });
};

let delMsg = ({ msgId, userId }) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!msgId) {
                resolve({
          errCode: 1,
          errMessage: "Missing parameter",
        });
      } else {
        let msg = await db.Message.findOne({
          where: { id: msgId },
          raw: false,
        });

        if (!msg) {
          resolve({
            errCode: 2,
            errMessage: "Message not found",
          });
        } else {
          // Optional: Check if userId matches senderId for authorization
          if (msg.senderId != userId) {
            return resolve({
              errCode: 3,
              errMessage: "Unauthorized to delete this message",
            });
          }
          await msg.destroy();

          resolve({
            errMessage: "delMsg",
            errCode: 0,
            // data: msgData,
          });
        }
      }
    } catch (e) {
      reject(e);
    }
  });
};

module.exports = {
  saveMsg: saveMsg,
  getMsg: getMsg,
  delMsg: delMsg,
};
