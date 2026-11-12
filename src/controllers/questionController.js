import questionService from "../services/questionServices";
let submitAssessment = async (req, res) => {
  try {
    let infor = await questionService.submitAssessment(req.body);
    return res.status(200).json(infor);
  } catch (e) {
    console.log(e);
    return res.status(200).json({
      errCode: -1,
      errMessage: "Error from the server",
    });
  }
};
let getAllQuestions = async (req, res) => {
  try {
    let infor = await questionService.getAllQuestions();
    return res.status(200).json(infor);
  } catch (e) {
    console.log(e);
    return res.status(200).json({
      errCode: -1,
      errMessage: "Error from the server",
    });
  }
};

let getAssessmentHistoryByUserId = async (req, res) => {
  try {
    let infor = await questionService.getAssessmentHistoryById(
      req.params.userId,
      req.query.limit
    );
    return res.status(200).json(infor);
  } catch (e) {
    console.log(e);
    return res.status(200).json({
      errCode: -1,
      errMessage: "Error from the server",
    });
  }
};
let getAssessmentDetailById = async (req, res) => {
  try {
    let infor = await questionService.getAssessmentDetailById(req.params.id);
    // Kết quả khảo sát là dữ liệu sức khoẻ cá nhân: chỉ chủ sở hữu (user_id) hoặc người có quyền xem hồ sơ mọi bệnh nhân.
    // Kết quả của khách (guest_key, không gắn tài khoản) chỉ truy cập được qua API lịch sử theo guest_key.
    const data = infor && infor.data;
    if (infor && infor.errCode === 0 && data) {
      const ownerId = data.user_id !== undefined && data.user_id !== null ? String(data.user_id) : null;
      const isOwner = ownerId !== null && ownerId === String(req.user.id);
      if (!isOwner && !req.user.permissions.has("patient-record:read:any")) {
        return res.status(403).json({ errCode: -1, errMessage: "You don't have permission to access this resource..." });
      }
    }
    return res.status(200).json(infor);
  } catch (e) {
    console.log(e);
    return res.status(200).json({
      errCode: -1,
      errMessage: "Error from the server",
    });
  }
};
let createNewQuestion = async (req, res) => {
  try {
    let infor = await questionService.createNewQuestion(req.body);
    return res.status(200).json(infor);
  } catch (e) {
    console.log(e);
    return res.status(200).json({
      errCode: -1,
      errMessage: "Error from the server",
    });
  }
};
let editQuestion = async (req, res) => {
  try {
    let infor = await questionService.editQuestion(req.body);
    return res.status(200).json(infor);
  } catch (e) {
    console.log(e);
    return res.status(200).json({
      errCode: -1,
      errMessage: "Error from the server",
    });
  }
};
let getQuestionById = async (req, res) => {
  try {
    let infor = await questionService.getQuestionById(req.params.id);
    return res.status(200).json(infor);
  } catch (e) {
    console.log(e);
    return res.status(200).json({
      errCode: -1,
      errMessage: "Error from the server",
    });
  }
};
let getAllCategoryQuestions = async (req, res) => {
  try {
    let infor = await questionService.getAllCategoryQuestions();
    return res.status(200).json(infor);
  } catch (e) {
    console.log(e);
    return res.status(200).json({
      errCode: -1,
      errMessage: "Error from the server",
    });
  }
};

let getQuestionsByCategory = async (req, res) => {
  try {
    let infor = await questionService.getQuestionsByCategory(
      req.params.categoryId
    );
    return res.status(200).json(infor);
  } catch (e) {
    console.log(e);
    return res.status(200).json({
      errCode: -1,
      errMessage: "Error from the server",
    });
  }
};

let createNewCategoryQuestion = async (req, res) => {
  try {
    let infor = await questionService.createNewCategoryQuestion(req.body);
    return res.status(200).json(infor);
  } catch (e) {
    console.log(e);
    return res.status(200).json({
      errCode: -1,
      errMessage: "Error from the server",
    });
  }
};

let deleteQuestion = async (req, res) => {
  try {
    let infor = await questionService.deleteQuestion(req.params.id);
    return res.status(200).json(infor);
  } catch (e) {
    console.log(e);
    return res.status(200).json({
      errCode: -1,
      errMessage: "Error from the server",
    });
  }
};

module.exports = {
  submitAssessment,
  getAllQuestions,
  getAssessmentHistoryByUserId,
  getAssessmentDetailById,
  createNewQuestion,
  editQuestion,
  getQuestionById,
  getAllCategoryQuestions,
  getQuestionsByCategory,
  createNewCategoryQuestion,
  deleteQuestion,
};
