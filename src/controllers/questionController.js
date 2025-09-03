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
