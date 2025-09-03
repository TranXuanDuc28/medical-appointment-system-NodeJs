// import
import express from "express";
import homeController from "../controllers/homeController";
import userController from "../controllers/userController";
import doctorController from "../controllers/doctorControllers";
import patientController from "../controllers/patientController";
import specialtyController from "../controllers/specialtyController";
import clinicController from "../controllers/clinicController";
import medicineController from "../controllers/medicineController";
import chatController from "../controllers/chatController";
import packageController from "../controllers/packageController";
import facilityController from "../controllers/facilityController";
import handbookController from "../controllers/handbookController";
import questionController from "../controllers/questionController";
const multer = require("multer");
const path = require("path");
const slugify = require("slugify");

// Cấu hình lưu file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../public/uploads"));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    // Loại bỏ ký tự đặc biệt khỏi tên file khi lưu
    const safeName = slugify(file.originalname, {
      lower: false,
      strict: true,
      locale: "vi",
    });
    cb(null, uniqueSuffix + "-" + safeName);
  },
});
const upload = multer({ storage: storage });

// khoi tao router
let router = express.Router();

// tao ham initWebRoutes
let initWebRoutes = (app) => {
  // crud routes
  router.get("/", homeController.getHomePage);
  router.get("/about", homeController.getAboutPage);
  router.get("/crud", homeController.getCRUD);
  router.post("/post_crud", homeController.postCRUD);
  router.get("/get_crud", homeController.displayGetCRUD);
  router.get("/edit_crud", homeController.getEditCRUD);
  router.post("/put_crud", homeController.putCRUD);
  router.get("/delete_crud", homeController.getdeleteCRUD);
  // API routes
  router.post("/api/register", userController.handleRegister);
  router.post("/api/login", userController.handleLogin);
  router.get("/api/get_all_users", userController.handleGetAllUsers);
  router.post("/api/create_new_users", userController.handleCreateNewUsers);
  router.delete("/api/delete_users", userController.handleDeleteUsers);
  router.put("/api/edit_users", userController.handleEditUsers);
  router.get("/api/allcode", userController.getAllCode);
  router.get("/api/top-doctor-home", doctorController.getTopDoctorHome);
  router.get("/api/get_all_doctor", doctorController.getAllDoctor);
  router.post("/api/save_detail_doctor", doctorController.postInforDoctor);
  router.get(
    "/api/get_detail_doctor_by_id",
    doctorController.getDetailDoctorById
  );
  router.post(
    "/api/bulk_create_schedule",
    doctorController.getBulkCreateSchedule
  );
  router.get(
    "/api/get_schedule_doctor_by_date",
    doctorController.getScheduleDoctorByDate
  );
  router.get(
    "/api/get-extra-doctor-by-id",
    doctorController.getExtraDoctorInforById
  );
  router.get(
    "/api/get-profile-doctor-by-id",
    doctorController.getProfileDoctorById
  );
  router.post(
    "/api/patient-book-appointment",
    patientController.postBookAppointment
  );
  router.post(
    "/api/verify-book-appointment",
    patientController.postVerifyBookAppointment
  );
  // HandBook routes
  router.post("/api/create-new-handbook", handbookController.createHandBook);
  router.get("/api/get-handbook", handbookController.getAllHandBook);
  router.get(
    "/api/get-detail-handbook-by-id",
    handbookController.getDetailHandBookById
  );
  router.get(
    "/api/get-related-handbooks",
    handbookController.getRelatedHandBooks
  );
  // Specialty routes
  router.post("/api/create-new-specialty", specialtyController.createSpecialty);
  router.get("/api/get-specialty", specialtyController.getAllSpecialty);
  router.get(
    "/api/get-detail-specialty-by-id",
    specialtyController.getDetailSpecialtyById
  );
  // Clinic routes
  router.post("/api/create-new-clinic", clinicController.createClinic);
  router.get("/api/get-clinic", clinicController.getAllClinic);
  router.get(
    "/api/get-detail-clinic-by-id",
    clinicController.getDetailClinicById
  );
  // Patient routes
  router.get(
    "/api/get-list-patient-for-doctor",
    doctorController.getListPatientForDoctor
  );
  router.post("/api/send-remedy", doctorController.sendRemedy);
  router.post(
    "/api/update-medical-appointment-status",
    doctorController.postMedicalAppointmentStatus
  );
  // Add the Casso payment transaction API endpoint

  router.get("/api/check-paid", doctorController.getListGDPR);
  // Medicine routes
  router.get("/api/get-medicines", medicineController.getAllMedicine);

  // Casso webhook: cập nhật trạng thái booking khi nhận được giao dịch thanh toán
  router.post("/api/casso/webhook", doctorController.postConfirmPayment);
  router.post("/api/send-payment", doctorController.sendPayment);
  // router.post("/api/save-msg", chatController.saveMsg);
  router.get("/api/get-msg/:receiverId", chatController.getMsg);
  router.post("/api/del-msg/:id", chatController.delMsg);

  // API upload file
  router.post("/api/upload-file", upload.single("file"), (req, res) => {
    if (!req.file) {
      return res
        .status(400)
        .json({ errCode: 1, errMessage: "No file uploaded" });
    }
    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${
      req.file.filename
    }`;
    // Chuyển encoding tên file về UTF-8
    const originalName = Buffer.from(req.file.originalname, "latin1").toString(
      "utf8"
    );
    res.status(200).json({
      errCode: 0,
      file_url: fileUrl,
      file_type: req.file.mimetype,
      file_name: originalName, // dùng tên đã chuyển encoding
    });
  });

  router.post("/api/login-patient-chat", userController.handlePatientChatLogin);

  // Package routes
  router.get("/api/packages/all", packageController.getAllPackages);
  router.get("/api/packages/featured", packageController.getFeaturedPackages);
  router.get(
    "/api/packages/filter-options",
    packageController.getFilterOptions
  );
  router.get("/api/packages/search", packageController.searchPackages);
  router.get("/api/packages/:id", packageController.getPackageById);
  router.post("/api/packages/create", packageController.createPackage);
  router.put("/api/packages/update/:id", packageController.updatePackage);
  router.delete("/api/packages/delete/:id", packageController.deletePackage);

  // Facility routes
  router.get("/api/facilities/all", facilityController.getAllFacilities);
  router.get(
    "/api/facilities/featured",
    facilityController.getFeaturedFacilities
  );
  router.get(
    "/api/facilities/filter-options",
    facilityController.getFilterOptions
  );
  router.get("/api/facilities/search", facilityController.searchFacilities);
  router.get("/api/facilities/:id", facilityController.getFacilityById);
  router.post("/api/facilities/create", facilityController.createFacility);
  router.put("/api/facilities/update/:id", facilityController.updateFacility);
  router.delete(
    "/api/facilities/delete/:id",
    facilityController.deleteFacility
  );
  // Appointment history routes
  router.get(
    "/api/get-patient-appointments",
    patientController.getPatientAppointments
  );

  // Health assessment routes
  router.get("/api/get_all_questions", questionController.getAllQuestions);
  router.post("/api/submit-assessment", questionController.submitAssessment);
  router.get(
    "/api/assessment-detail-by-id/:id",
    questionController.getAssessmentDetailById
  );
  router.get(
    "/api/assessment-history-by-userid/:userId",
    questionController.getAssessmentHistoryByUserId
  );
  router.post("/api/create-new-question", questionController.createNewQuestion);
  router.put("/api/edit-question", questionController.editQuestion);
  router.get("/api/questions/:id", questionController.getQuestionById);

  // Thêm các route mới cho category_question và quản lý câu hỏi theo category
  router.get(
    "/api/category-questions",
    questionController.getAllCategoryQuestions
  );
  router.post(
    "/api/category-questions",
    questionController.createNewCategoryQuestion
  );
  router.get(
    "/api/category-questions/:categoryId/questions",
    questionController.getQuestionsByCategory
  );
  router.delete("/api/questions/:id", questionController.deleteQuestion);

  return app.use("/", router);
};

//exports vao module
module.exports = initWebRoutes;
