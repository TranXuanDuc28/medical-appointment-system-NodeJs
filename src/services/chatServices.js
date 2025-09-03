const db = require("../models");
import { Op } from "sequelize";
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
          msg: data.msg,
          sender_id: data.sender.id,
          sender_name: data.sender.lastName,
          sender_email: data.sender.email,
          receiver_id: data.receiver._id || data.receiver.id,
          receiver_name: data.receiver.lastName,
          receiver_email: data.receiver.email,
          file_url: data.file_url || null,
          file_type: data.file_type || null,
          file_name: data.file_name || null,
        });
        // Lấy thông tin hình ảnh của sender và receiver
        const senderUser = await db.User.findOne({
          where: { id: savedMsg.sender_id },
        });
        const receiverUser = await db.User.findOne({
          where: { id: savedMsg.receiver_id },
        });
        const senderImage = senderUser?.image
          ? Buffer.from(senderUser.image, "base64").toString("binary")
          : null;
        const receiverImage = receiverUser?.image
          ? Buffer.from(receiverUser.image, "base64").toString("binary")
          : null;
        let result = {
          id: savedMsg.id,
          msg: savedMsg.msg,
          sender: {
            id: savedMsg.sender_id,
            name: savedMsg.sender_name,
            email: savedMsg.sender_email,
            image: senderImage,
          },
          receiver: {
            id: savedMsg.receiver_id,
            name: savedMsg.receiver_name,
            email: savedMsg.receiver_email,
            image: receiverImage,
          },
          file_url: savedMsg.file_url,
          file_type: savedMsg.file_type,
          file_name: savedMsg.file_name,
          createdAt: savedMsg.createdAt,
          updatedAt: savedMsg.updatedAt,
        };

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

      // Truy vấn tin nhắn giữa hai người dùng
      let allMsg = await db.Message.findAll({
        where: {
          [Op.or]: [
            { sender_id: id, receiver_id: userId },
            { sender_id: userId, receiver_id: id },
          ],
        },
        order: [["createdAt", "DESC"]],
        limit: 10,
        offset: offset,
      });

      // Chuẩn hóa kết quả trả về, lấy thêm image
      let result = await Promise.all(
        (allMsg || []).reverse().map(async (savedMsg) => {
          const senderUser = await db.User.findOne({
            where: { id: savedMsg.sender_id },
          });
          const receiverUser = await db.User.findOne({
            where: { id: savedMsg.receiver_id },
          });
          const senderImage = senderUser?.image
            ? Buffer.from(senderUser.image, "base64").toString("binary")
            : null;
          const receiverImage = receiverUser?.image
            ? Buffer.from(receiverUser.image, "base64").toString("binary")
            : null;
          return {
            id: savedMsg.id,
            msg: savedMsg.msg,
            sender: {
              id: savedMsg.sender_id,
              name: savedMsg.sender_name,
              email: savedMsg.sender_email,
              image: senderImage,
            },
            receiver: {
              id: savedMsg.receiver_id,
              name: savedMsg.receiver_name,
              email: savedMsg.receiver_email,
              image: receiverImage,
            },
            file_url: savedMsg.file_url,
            file_type: savedMsg.file_type,
            file_name: savedMsg.file_name,
            createdAt: savedMsg.createdAt,
            updatedAt: savedMsg.updatedAt,
          };
        })
      );

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
        console.log("1");
        resolve({
          errCode: 1,
          errMessage: "Missing parameter",
        });
      } else {
        let msg = await db.Message.findOne({
          where: { id: msgId },
          raw: false,
        });
        console.log("msg", msg);

        if (!msg) {
          console.log("2");
          resolve({
            errCode: 2,
            errMessage: "Message not found",
          });
        } else {
          // Optional: Check if userId matches senderId for authorization
          if (msg.sender_id != userId) {
            console.log("3", msg.senderId, userId);
            return {
              errCode: 3,
              errMessage: "Unauthorized to delete this message",
            };
          }
          await msg.destroy();

          // // Lấy thông tin hình ảnh của sender và receiver
          // const senderUser = await db.User.findOne({
          //   where: { id: msg.sender_id },
          // });
          // const receiverUser = await db.User.findOne({
          //   where: { id: msg.receiver_id },
          // });
          // const senderImage = senderUser?.image
          //   ? Buffer.from(senderUser.image, "base64").toString("binary")
          //   : null;
          // const receiverImage = receiverUser?.image
          //   ? Buffer.from(receiverUser.image, "base64").toString("binary")
          //   : null;

          // let msgData = {
          //   id: msg.id,
          //   msg: msg.msg,
          //   sender: {
          //     id: msg.sender_id,
          //     name: msg.sender_name,
          //     email: msg.sender_email,
          //     image: senderImage,
          //   },
          //   receiver: {
          //     id: msg.receiver_id,
          //     name: msg.receiver_name,
          //     email: msg.receiver_email,
          //     image: receiverImage,
          //   },
          //   createdAt: msg.createdAt,
          //   updatedAt: msg.updatedAt,
          // };

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
