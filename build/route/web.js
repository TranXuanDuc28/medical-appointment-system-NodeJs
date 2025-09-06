"use strict";

var _express = _interopRequireDefault(require("express"));
var _homeController = _interopRequireDefault(require("../controllers/homeController"));
var _userController = _interopRequireDefault(require("../controllers/userController"));
var _doctorControllers = _interopRequireDefault(require("../controllers/doctorControllers"));
var _patientController = _interopRequireDefault(require("../controllers/patientController"));
var _specialtyController = _interopRequireDefault(require("../controllers/specialtyController"));
var _clinicController = _interopRequireDefault(require("../controllers/clinicController"));
var _medicineController = _interopRequireDefault(require("../controllers/medicineController"));
var _chatController = _interopRequireDefault(require("../controllers/chatController"));
var _packageController = _interopRequireDefault(require("../controllers/packageController"));
var _facilityController = _interopRequireDefault(require("../controllers/facilityController"));
var _handbookController = _interopRequireDefault(require("../controllers/handbookController"));
var _questionController = _interopRequireDefault(require("../controllers/questionController"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { "default": e }; }
// import

var multer = require("multer");
var path = require("path");
var slugify = require("slugify");

// Cấu hình lưu file upload
var storage = multer.diskStorage({
  destination: function destination(req, file, cb) {
    cb(null, path.join(__dirname, "../public/uploads"));
  },
  filename: function filename(req, file, cb) {
    var uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    // Loại bỏ ký tự đặc biệt khỏi tên file khi lưu
    var safeName = slugify(file.originalname, {
      lower: false,
      strict: true,
      locale: "vi"
    });
    cb(null, uniqueSuffix + "-" + safeName);
  }
});
var upload = multer({
  storage: storage
});

// khoi tao router
var router = _express["default"].Router();

// tao ham initWebRoutes
var initWebRoutes = function initWebRoutes(app) {
  // crud routes
  router.get("/", _homeController["default"].getHomePage);
  router.get("/about", _homeController["default"].getAboutPage);
  router.get("/crud", _homeController["default"].getCRUD);
  router.post("/post_crud", _homeController["default"].postCRUD);
  router.get("/get_crud", _homeController["default"].displayGetCRUD);
  router.get("/edit_crud", _homeController["default"].getEditCRUD);
  router.post("/put_crud", _homeController["default"].putCRUD);
  router.get("/delete_crud", _homeController["default"].getdeleteCRUD);
  // API routes
  router.post("/api/register", _userController["default"].handleRegister);
  router.post("/api/login", _userController["default"].handleLogin);
  router.get("/api/get_all_users", _userController["default"].handleGetAllUsers);
  router.post("/api/create_new_users", _userController["default"].handleCreateNewUsers);
  router["delete"]("/api/delete_users", _userController["default"].handleDeleteUsers);
  router.put("/api/edit_users", _userController["default"].handleEditUsers);
  router.get("/api/allcode", _userController["default"].getAllCode);
  router.get("/api/top-doctor-home", _doctorControllers["default"].getTopDoctorHome);
  router.get("/api/get_all_doctor", _doctorControllers["default"].getAllDoctor);
  router.post("/api/save_detail_doctor", _doctorControllers["default"].postInforDoctor);
  router.get("/api/get_detail_doctor_by_id", _doctorControllers["default"].getDetailDoctorById);
  router.post("/api/bulk_create_schedule", _doctorControllers["default"].getBulkCreateSchedule);
  router.get("/api/get_schedule_doctor_by_date", _doctorControllers["default"].getScheduleDoctorByDate);
  router.get("/api/get-extra-doctor-by-id", _doctorControllers["default"].getExtraDoctorInforById);
  router.get("/api/get-profile-doctor-by-id", _doctorControllers["default"].getProfileDoctorById);
  router.post("/api/patient-book-appointment", _patientController["default"].postBookAppointment);
  router.post("/api/verify-book-appointment", _patientController["default"].postVerifyBookAppointment);
  // HandBook routes
  router.post("/api/create-new-handbook", _handbookController["default"].createHandBook);
  router.get("/api/get-handbook", _handbookController["default"].getAllHandBook);
  router.get("/api/get-detail-handbook-by-id", _handbookController["default"].getDetailHandBookById);
  router.get("/api/get-related-handbooks", _handbookController["default"].getRelatedHandBooks);
  // Specialty routes
  router.post("/api/create-new-specialty", _specialtyController["default"].createSpecialty);
  router.get("/api/get-specialty", _specialtyController["default"].getAllSpecialty);
  router.get("/api/get-detail-specialty-by-id", _specialtyController["default"].getDetailSpecialtyById);
  // Clinic routes
  router.post("/api/create-new-clinic", _clinicController["default"].createClinic);
  router.get("/api/get-clinic", _clinicController["default"].getAllClinic);
  router.get("/api/get-detail-clinic-by-id", _clinicController["default"].getDetailClinicById);
  // Patient routes
  router.get("/api/get-list-patient-for-doctor", _doctorControllers["default"].getListPatientForDoctor);
  router.post("/api/send-remedy", _doctorControllers["default"].sendRemedy);
  router.post("/api/update-medical-appointment-status", _doctorControllers["default"].postMedicalAppointmentStatus);
  // Add the Casso payment transaction API endpoint

  router.get("/api/check-paid", _doctorControllers["default"].getListGDPR);
  // Medicine routes
  router.get("/api/get-medicines", _medicineController["default"].getAllMedicine);

  // Casso webhook: cập nhật trạng thái booking khi nhận được giao dịch thanh toán
  router.post("/api/casso/webhook", _doctorControllers["default"].postConfirmPayment);
  router.post("/api/send-payment", _doctorControllers["default"].sendPayment);
  // router.post("/api/save-msg", chatController.saveMsg);
  router.get("/api/get-msg/:receiverId", _chatController["default"].getMsg);
  router.post("/api/del-msg/:id", _chatController["default"].delMsg);

  // API upload file
  router.post("/api/upload-file", upload.single("file"), function (req, res) {
    if (!req.file) {
      return res.status(400).json({
        errCode: 1,
        errMessage: "No file uploaded"
      });
    }
    var fileUrl = "".concat(req.protocol, "://").concat(req.get("host"), "/uploads/").concat(req.file.filename);
    // Chuyển encoding tên file về UTF-8
    var originalName = Buffer.from(req.file.originalname, "latin1").toString("utf8");
    res.status(200).json({
      errCode: 0,
      file_url: fileUrl,
      file_type: req.file.mimetype,
      file_name: originalName // dùng tên đã chuyển encoding
    });
  });
  router.post("/api/login-patient-chat", _userController["default"].handlePatientChatLogin);

  // Package routes
  router.get("/api/packages/all", _packageController["default"].getAllPackages);
  router.get("/api/packages/featured", _packageController["default"].getFeaturedPackages);
  router.get("/api/packages/filter-options", _packageController["default"].getFilterOptions);
  router.get("/api/packages/search", _packageController["default"].searchPackages);
  router.get("/api/packages/:id", _packageController["default"].getPackageById);
  router.post("/api/packages/create", _packageController["default"].createPackage);
  router.put("/api/packages/update/:id", _packageController["default"].updatePackage);
  router["delete"]("/api/packages/delete/:id", _packageController["default"].deletePackage);

  // Facility routes
  router.get("/api/facilities/all", _facilityController["default"].getAllFacilities);
  router.get("/api/facilities/featured", _facilityController["default"].getFeaturedFacilities);
  router.get("/api/facilities/filter-options", _facilityController["default"].getFilterOptions);
  router.get("/api/facilities/search", _facilityController["default"].searchFacilities);
  router.get("/api/facilities/:id", _facilityController["default"].getFacilityById);
  router.post("/api/facilities/create", _facilityController["default"].createFacility);
  router.put("/api/facilities/update/:id", _facilityController["default"].updateFacility);
  router["delete"]("/api/facilities/delete/:id", _facilityController["default"].deleteFacility);
  // Appointment history routes
  router.get("/api/get-patient-appointments", _patientController["default"].getPatientAppointments);

  // Health assessment routes
  router.get("/api/get_all_questions", _questionController["default"].getAllQuestions);
  router.post("/api/submit-assessment", _questionController["default"].submitAssessment);
  router.get("/api/assessment-detail-by-id/:id", _questionController["default"].getAssessmentDetailById);
  router.get("/api/assessment-history-by-userid/:userId", _questionController["default"].getAssessmentHistoryByUserId);
  router.post("/api/create-new-question", _questionController["default"].createNewQuestion);
  router.put("/api/edit-question", _questionController["default"].editQuestion);
  router.get("/api/questions/:id", _questionController["default"].getQuestionById);

  // Thêm các route mới cho category_question và quản lý câu hỏi theo category
  router.get("/api/category-questions", _questionController["default"].getAllCategoryQuestions);
  router.post("/api/category-questions", _questionController["default"].createNewCategoryQuestion);
  router.get("/api/category-questions/:categoryId/questions", _questionController["default"].getQuestionsByCategory);
  router["delete"]("/api/questions/:id", _questionController["default"].deleteQuestion);
  return app.use("/", router);
};

//exports vao module
module.exports = initWebRoutes;