const chatServices = require("../services/chatServices");

// let saveMsg = async (req, res) => {
//   try {
//     let infor = await chatServices.saveMsg(req.body);
//     return res.status(200).json(infor);
//   } catch (e) {
//     return res.status(200).json({
//       errCode: -1,
//       errMessage: "Error from the server",
//     });
//   }
// };
let getMsg = async (req, res) => {
  try {
    let infor = await chatServices.getMsg(
      req.params.receiverId,
      req.user.id, // lấy từ token, không tin query.userId (tránh đọc tin nhắn của người khác)
      parseInt(req.query.offset) || 0
    );
    return res.status(200).json(infor);
  } catch (e) {
    return res.status(200).json({
      errCode: -1,
      errMessage: "Error from the server",
    });
  }
};
let delMsg = async (req, res) => {
  try {
    let infor = await chatServices.delMsg({
      msgId: req.params.id,
      userId: req.user.id,
    });
    return res.status(200).json(infor);
  } catch (e) {
    return res.status(200).json({
      errCode: -1,
      errMessage: "Error from the server",
    });
  }
};

module.exports = {
  // saveMsg: saveMsg,
  getMsg: getMsg,
  delMsg: delMsg,
};
