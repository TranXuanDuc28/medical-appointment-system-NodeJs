import userServices from "../services/userServices";
import tokenService from "../services/tokenService";
import auditService from "../services/auditService";

const numEnv = (name, fallback) =>
  process.env[name] && !isNaN(+process.env[name]) ? +process.env[name] : fallback;

const cookieOptions = (maxAge) => ({
  httpOnly: true,
  maxAge,
  sameSite: process.env.COOKIE_SAMESITE || "lax",
  secure: process.env.NODE_ENV === "production",
});

const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie("jwt", accessToken, cookieOptions(numEnv("COOKIE_EXPIRES_IN", 86400000)));
  res.cookie(
    "refreshToken",
    refreshToken,
    cookieOptions(numEnv("COOKIE_REFRESH_EXPIRES_IN", 86400000 * 7))
  );
};

// Cấp access (ngắn hạn) + refresh token (lưu DB, xoay vòng), set cookie httpOnly,
// và loại các trường nội bộ khỏi dữ liệu trả về client.
const issueTokens = async (req, res, userData) => {
  const { accessToken, refreshToken } = await tokenService.issueTokenPair(userData.users, req);
  setAuthCookies(res, accessToken, refreshToken);
  userData.token = accessToken;
  userData.refreshToken = refreshToken;
  delete userData.users.tokenVersion;
};

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
    await issueTokens(req, res, userData);
    auditService.log({ req, actor: userData.users, action: "LOGIN", resource: "auth" });
  } else {
    auditService.log({
      req,
      action: "LOGIN_FAILED",
      resource: "auth",
      result: "FAILED",
      meta: { email: String(email).slice(0, 100), errCode: userData && userData.errCode },
    });
  }

  return res.status(200).json({
    errCode: userData.errCode,
    errMessage: userData.errMessage,
    users: userData.users ? userData.users : {},
    token: userData.token ? userData.token : ""
  });
};

let handleLogout = async (req, res) => {
  // Thu hồi refresh token hiện tại để phiên không thể dùng lại sau khi đăng xuất
  await tokenService.revokeRefreshToken(req.cookies && req.cookies.refreshToken);
  const opts = cookieOptions(0);
  delete opts.maxAge;
  res.clearCookie("jwt", opts);
  res.clearCookie("refreshToken", opts);
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
  if (userData && userData.errCode === 0) {
    await issueTokens(req, res, userData);
  }
  return res.status(200).json({
    errCode: userData.errCode,
    errMessage: userData.errMessage,
    users: userData.users ? userData.users : {},
    token: userData.token ? userData.token : "",
  });
};
let handleRefreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies && req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({
        errCode: -1,
        errMessage: "Không tìm thấy Refresh Token!",
      });
    }
    const result = await tokenService.rotateRefreshToken(refreshToken, req);
    if (!result.ok) {
      const opts = cookieOptions(0);
      delete opts.maxAge;
      res.clearCookie("jwt", opts);
      res.clearCookie("refreshToken", opts);
      return res.status(result.status).json({ errCode: -1, errMessage: result.message });
    }
    setAuthCookies(res, result.accessToken, result.refreshToken);
    return res.status(200).json({
      errCode: 0,
      errMessage: "Làm mới Access Token thành công!",
      token: result.accessToken,
    });
  } catch (error) {
    console.error("Lỗi khi refresh token:", error);
    return res.status(500).json({
      errCode: -1,
      errMessage: "Lỗi hệ thống khi refresh token!",
    });
  }
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
let saveFCMToken = async (req, res) => {
  try {
    let message = await userServices.saveFCMToken(req.body);
    return res.status(200).json(message);
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
  handleRefreshToken: handleRefreshToken,
  saveFCMToken: saveFCMToken,
};
