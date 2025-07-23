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
      req.query.userId,
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
    let infor = await chatServices.delMsg(req.params.id);
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
