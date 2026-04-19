import userServices from "../services/userServices";
import JWTaction from "../middleware/JWTaction";

let handleRegister = async (req, res) => {
// ... existing code
  let email = req.body.email;
  let password = req.body.password;
  let firstName = req.body.firstName;
  let lastName = req.body.lastName;
  let phoneNumber = req.body.phoneNumber;
  if (!email || !password || !firstName || !lastName || !phoneNumber) {
    return res.status(500).json({
      errCode: 1,
      errMessage: "Chua co tham so dau vao!",
    });
  }
  let userData = await userServices.handleUserRegister(
    email,
    password,
    firstName,
    lastName,
    phoneNumber
  );
  return res.status(200).json({
    errCode: userData.errCode,
    errMessage: userData.errMessage,
    users: userData.users ? userData.users : {},
  });
};
let handleLogin = async (req, res) => {
  let email = req.body.email;
  let password = req.body.password;
  if (!email || !password) {
    return res.status(500).json({
      errCode: 1,
      errMessage: "Chua co tham so dau vao!",
    });
  }
  let userData = await userServices.handleUserLogin(email, password);
  
  if (userData && userData.errCode === 0) {
    let payload = {
      email: userData.users.email,
      roles: userData.users.Group && userData.users.Group.Roles ? userData.users.Group.Roles : [],
    };
    let token = JWTaction.createJWT(payload);
    res.cookie("jwt", token, { httpOnly: true, maxAge: +process.env.COOKIE_EXPIRES_IN });
    
    userData.token = token;
  }

  return res.status(200).json({
    errCode: userData.errCode,
    errMessage: userData.errMessage,
    users: userData.users ? userData.users : {},
    token: userData.token ? userData.token : ""
  });
};

let handleLogout = (req, res) => {
  res.clearCookie("jwt");
  return res.status(200).json({
    errCode: 0,
    message: "Clear cookie success!"
  });
};
let handlePatientChatLogin = async (req, res) => {
  let email = req.body.email;
  let password = req.body.password;
  if (!email || !password) {
    return res.status(500).json({
      errCode: 1,
      errMessage: "Chua co tham so dau vao!",
    });
  }
  let userData = await userServices.handlePatientChatLogin(email, password);
  return res.status(200).json({
    errCode: userData.errCode,
    errMessage: userData.errMessage,
    users: userData.users ? userData.users : {},
  });
};
let handleGetAllUsers = async (req, res) => {
  let id = req.query.id;
  if (!id) {
    return res.status(200).json({
      errCode: 1,
      errMessage: "Chua co tham so dau vao",
      users: [],
    });
  }
  let users = await userServices.getAllUsers(id);
  return res.status(200).json({
    errCode: 0,
    errMessage: "Ok!",
    users: users,
  });
};
let handleCreateNewUsers = async (req, res) => {
  let message = await userServices.createNewUsers(req.body);
  return res.status(200).json(message);
};
let handleDeleteUsers = async (req, res) => {
  let userId = req.body.id;
  if (userId) {
    let message = await userServices.deleteUsers(userId);
    return res.status(200).json(message);
  } else {
    return res.status(200).json({
      errCode: 1,
      errMessage: "Chua co tham so dau vao!",
    });
  }
};
let handleEditUsers = async (req, res) => {
  let data = req.body;
  if (data) {
    let message = await userServices.updateUserData(data);
    return res.status(200).json(message);
  }
};
let getAllCode = async (req, res) => {
  let typeInput = req.query.type;
  try {
    if (typeInput) {
      let message = await userServices.getAllCodeServices(typeInput);

      return res.status(200).json(message);
    } else {
      return res.status(200).json({
        errCode: 1,
        errMessage: "Chua co tham so dau vao!",
      });
    }
  } catch (error) {
    return res.status(200).json({
      errCode: -1,
      errMessage: "Lỗi từ server!",
    });
  }
};
module.exports = {
  handleRegister: handleRegister,
  handleLogin: handleLogin,
  handleGetAllUsers: handleGetAllUsers,
  handleCreateNewUsers: handleCreateNewUsers,
  handleDeleteUsers: handleDeleteUsers,
  handleEditUsers: handleEditUsers,
  getAllCode: getAllCode,
  handlePatientChatLogin: handlePatientChatLogin,
  handleLogout: handleLogout,
};
