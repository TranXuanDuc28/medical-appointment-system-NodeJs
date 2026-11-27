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
import { cacheMiddleware, invalidateCache } from "../utils/redis";
import rbacController from "../controllers/rbacController";
import queueController from "../controllers/queueController";
import aiController from "../controllers/aiController";
import { selfOrPermission, doctorSelf } from "../middleware/ownership";
import { medicalRecordPolicy, appointmentReadPolicy } from "../middleware/policies";
import { P } from "../config/permissions";
import { authLimiter, bookingLimiter, aiLimiter } from "../middleware/rateLimit";
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
const ALLOWED_UPLOAD_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "video/mp4",
];
const upload = multer({
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024, files: 1 }, // tối đa 20MB / 1 file
  fileFilter: (req, file, cb) => {
    if (ALLOWED_UPLOAD_TYPES.includes(file.mimetype)) return cb(null, true);
    cb(new Error("Định dạng file không được hỗ trợ"));
  },
});

// khoi tao router
let router = express.Router();

// tao ham initWebRoutes
let initWebRoutes = (app) => {
  // CRUD demo (EJS) - tạo/xoá user không cần đăng nhập => chỉ bật khi chạy development
  router.get("/", homeController.getHomePage);
  router.get("/about", homeController.getAboutPage);
  if (process.env.NODE_ENV === "development") {
    router.get("/crud", homeController.getCRUD);
    router.post("/post_crud", homeController.postCRUD);
    router.get("/get_crud", homeController.displayGetCRUD);
    router.get("/edit_crud", homeController.getEditCRUD);
    router.post("/put_crud", homeController.putCRUD);
    router.get("/delete_crud", homeController.getdeleteCRUD);
  }
  // API routes (quyền truy cập được áp dụng tập trung bởi middleware accessControl
  // dựa trên config/accessRules.js; ở đây chỉ thêm kiểm tra sở hữu dữ liệu)
  // AI: gợi ý chuyên khoa (công khai, có giới hạn tần suất) + giám sát/đối sánh (ai-metrics:read)
  router.post("/api/ai/triage", aiLimiter, aiController.triage);
  router.get("/api/ai/status", aiController.status);
  router.get("/api/ai/metrics", aiController.metrics);
  // Hàng đợi khám bệnh (quyền kiểm bởi accessControl theo accessRules + kiểm tra chủ vé/bác sĩ trong queueService)
  router.post("/api/queue/check-in", queueController.checkIn);
  router.post("/api/queue/walk-in", queueController.walkIn);
  router.post("/api/queue/doctor/call-next", queueController.callNext);
  router.get("/api/queue/doctor/board", queueController.doctorBoard);
  router.post("/api/queue/tickets/:id/call", queueController.call);
  router.post("/api/queue/tickets/:id/start", queueController.start);
  router.post("/api/queue/tickets/:id/finish", queueController.finish);
  router.post("/api/queue/tickets/:id/no-show", queueController.noShow);
  router.post("/api/queue/tickets/:id/postpone", queueController.postpone);
  router.post("/api/queue/tickets/:id/emergency", queueController.emergency);
  router.post("/api/queue/tickets/:id/cancel", queueController.cancel);
  router.get("/api/queue/my-tickets", queueController.myTickets);
  router.get("/api/queue/rooms/:roomId/display", queueController.roomDisplay);
  router.get("/api/queue/rooms", queueController.listRooms);
  router.post("/api/queue/rooms", queueController.createRoom);
  router.put("/api/queue/rooms/:id", queueController.updateRoom);
  router.put("/api/queue/assign-room", queueController.assignRoom);
  // RBAC & audit (quyền kiểm bởi accessControl theo accessRules)
  router.get("/api/rbac/me", rbacController.me);
  router.get("/api/rbac/roles", rbacController.listRoles);
  router.post("/api/rbac/roles", rbacController.createRole);
  router.get("/api/rbac/permissions", rbacController.listPermissions);
  router.put("/api/rbac/roles/:code/permissions", rbacController.setRolePermissions);
  router.delete("/api/rbac/roles/:code", rbacController.deleteRole);
  router.put("/api/rbac/users/:id/role", rbacController.assignRole);
  router.put("/api/rbac/users/:id/active", rbacController.setActive);
  router.get("/api/rbac/audit-logs", rbacController.auditLogs);
  router.post("/api/register", authLimiter, userController.handleRegister);
  router.post("/api/login", authLimiter, userController.handleLogin);
  router.post("/api/logout", userController.handleLogout);
  router.post("/api/refresh-token", authLimiter, userController.handleRefreshToken);
  router.post(
    "/api/save-fcm-token",
    selfOrPermission((req) => req.body && req.body.userId, P.USER_UPDATE),
    userController.saveFCMToken
  );
  router.get(
    "/api/get_all_users",
    selfOrPermission((req) => req.query.id, P.USER_READ_ANY),
    userController.handleGetAllUsers
  );
  router.post("/api/create_new_users", rbacController.guardRoleChange, userController.handleCreateNewUsers);
  router.delete("/api/delete_users", userController.handleDeleteUsers);
  router.put("/api/edit_users", rbacController.guardRoleChange, userController.handleEditUsers);
  router.get("/api/allcode", userController.getAllCode);
  router.get("/api/top-doctor-home", cacheMiddleware(300), doctorController.getTopDoctorHome);
  router.get("/api/get_all_doctor", cacheMiddleware(300), doctorController.getAllDoctor);
  router.post("/api/save_detail_doctor", doctorSelf((req) => req.body && req.body.doctorId), (req, res, next) => {
    invalidateCache(["/api/top-doctor-home", "/api/get_all_doctor", "/api/get_detail_doctor_by_id", "/api/get-extra-doctor-by-id", "/api/get-profile-doctor-by-id"]);
    next();
  }, doctorController.postInforDoctor);
  router.get(
    "/api/get_detail_doctor_by_id",
    cacheMiddleware(300),
    doctorController.getDetailDoctorById
  );
  router.post(
    "/api/bulk_create_schedule",
    doctorSelf((req) => req.body && req.body.doctorId),
    (req, res, next) => {
      invalidateCache(["/api/get_schedule_doctor_by_date"]);
      next();
    },
    doctorController.getBulkCreateSchedule
  );
  router.get(
    "/api/get_schedule_doctor_by_date",
    cacheMiddleware(60),
    doctorController.getScheduleDoctorByDate
  );
  router.get(
    "/api/get-extra-doctor-by-id",
    cacheMiddleware(300),
    doctorController.getExtraDoctorInforById
  );
  router.get(
    "/api/get-profile-doctor-by-id",
    cacheMiddleware(300),
    doctorController.getProfileDoctorById
  );
  router.post(
    "/api/patient-book-appointment",
    bookingLimiter,
    patientController.postBookAppointment
  );
  router.post(
    "/api/verify-book-appointment",
    bookingLimiter,
    patientController.postVerifyBookAppointment
  );
  router.post("/api/cancel-appointment", patientController.postCancelAppointment);
  // HandBook routes
  router.post("/api/create-new-handbook", (req, res, next) => {
    invalidateCache(["/api/get-handbook", "/api/get-detail-handbook-by-id", "/api/get-related-handbooks"]);
    next();
  }, handbookController.createHandBook);
  router.get("/api/get-handbook", cacheMiddleware(600), handbookController.getAllHandBook);
  router.get(
    "/api/get-detail-handbook-by-id",
    cacheMiddleware(600),
    handbookController.getDetailHandBookById
  );
  router.get(
    "/api/get-related-handbooks",
    cacheMiddleware(600),
    handbookController.getRelatedHandBooks
  );
  // Specialty routes
  router.post("/api/create-new-specialty", (req, res, next) => {
    invalidateCache(["/api/get-specialty", "/api/get-detail-specialty-by-id"]);
    next();
  }, specialtyController.createSpecialty);
  router.get("/api/get-specialty", cacheMiddleware(600), specialtyController.getAllSpecialty);
  router.get(
    "/api/get-detail-specialty-by-id",
    cacheMiddleware(600),
    specialtyController.getDetailSpecialtyById
  );
  // Clinic routes
  router.post("/api/create-new-clinic", (req, res, next) => {
    invalidateCache(["/api/get-clinic", "/api/get-detail-clinic-by-id"]);
    next();
  }, clinicController.createClinic);
  router.get("/api/get-clinic", cacheMiddleware(600), clinicController.getAllClinic);
  router.get(
    "/api/get-detail-clinic-by-id",
    cacheMiddleware(600),
    clinicController.getDetailClinicById
  );
  // Patient routes
  router.get(
    "/api/get-list-patient-for-doctor",
    doctorController.getListPatientForDoctor
  );
  router.post(
    "/api/send-remedy",
    doctorSelf((req) => req.body && req.body.doctorId),
    doctorController.sendRemedy
  );
  router.post(
    "/api/update-medical-appointment-status",
    doctorSelf((req) => req.body && req.body.doctorId),
    doctorController.postMedicalAppointmentStatus
  );
  // Add the Casso payment transaction API endpoint
  router.get("/api/check-paid", doctorController.getListGDPR);
  // Medicine routes
  router.get("/api/get-medicines", medicineController.getAllMedicine);

  // PayOS & Casso webhook: cập nhật trạng thái booking khi nhận được giao dịch thanh toán
  router.post("/api/payos/webhook", doctorController.handlePayOSWebhook);
  router.post("/api/payos/create-payment-link", doctorController.createPayOSPaymentLink);
  router.post("/api/casso/webhook", doctorController.postConfirmPayment);
  router.post("/api/send-payment", doctorController.sendPayment);
  // router.post("/api/save-msg", chatController.saveMsg);
  router.get("/api/get-msg/:receiverId", chatController.getMsg);
  router.post("/api/del-msg/:id", chatController.delMsg);

  // API upload file (đã đăng nhập; lỗi multer -> 400 thay vì 500 có stack trace)
  const uploadSingle = (req, res, next) =>
    upload.single("file")(req, res, (err) => {
      if (err) {
        return res.status(400).json({ errCode: 1, errMessage: err.message });
      }
      next();
    });
  router.post("/api/upload-file", uploadSingle, (req, res) => {
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

  router.post("/api/login-patient-chat", authLimiter, userController.handlePatientChatLogin);

  // Package routes
  router.get("/api/packages/all", cacheMiddleware(300), packageController.getAllPackages);
  router.get("/api/packages/featured", cacheMiddleware(300), packageController.getFeaturedPackages);
  router.get(
    "/api/packages/filter-options",
    cacheMiddleware(600),
    packageController.getFilterOptions
  );
  router.get("/api/packages/search", cacheMiddleware(60), packageController.searchPackages);
  router.get("/api/packages/booking-slots", packageController.getPackageBookingSlots);
  router.get("/api/packages/:id", cacheMiddleware(300), packageController.getPackageById);
  router.post("/api/packages/create", (req, res, next) => {
    invalidateCache(["/api/packages/all", "/api/packages/featured", "/api/packages/filter-options"]);
    next();
  }, packageController.createPackage);
  router.put("/api/packages/update/:id", (req, res, next) => {
    invalidateCache(["/api/packages/all", "/api/packages/featured", `/api/packages/${req.params.id}`]);
    next();
  }, packageController.updatePackage);
  router.delete("/api/packages/delete/:id", (req, res, next) => {
    invalidateCache(["/api/packages/all", "/api/packages/featured", `/api/packages/${req.params.id}`]);
    next();
  }, packageController.deletePackage);

  // Facility routes
  router.get("/api/facilities/all", cacheMiddleware(300), facilityController.getAllFacilities);
  router.get(
    "/api/facilities/featured",
    cacheMiddleware(300),
    facilityController.getFeaturedFacilities
  );
  router.get(
    "/api/facilities/filter-options",
    cacheMiddleware(600),
    facilityController.getFilterOptions
  );
  router.get("/api/facilities/search", cacheMiddleware(60), facilityController.searchFacilities);
  router.get("/api/facilities/:id", cacheMiddleware(300), facilityController.getFacilityById);
  router.post("/api/facilities/create", (req, res, next) => {
    invalidateCache(["/api/facilities/all", "/api/facilities/featured", "/api/facilities/filter-options"]);
    next();
  }, facilityController.createFacility);
  router.put("/api/facilities/update/:id", (req, res, next) => {
    invalidateCache(["/api/facilities/all", "/api/facilities/featured", `/api/facilities/${req.params.id}`]);
    next();
  }, facilityController.updateFacility);
  router.delete(
    "/api/facilities/delete/:id",
    (req, res, next) => {
      invalidateCache(["/api/facilities/all", "/api/facilities/featured", `/api/facilities/${req.params.id}`]);
      next();
    },
    facilityController.deleteFacility
  );
  // Appointment history routes
  router.get(
    "/api/get-patient-appointments",
    appointmentReadPolicy((req) => req.query.patientId),
    patientController.getPatientAppointments
  );
  router.get(
    "/api/get-patient-history",
    medicalRecordPolicy((req) => req.query.patientId),
    patientController.getPatientHistory
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
    medicalRecordPolicy((req) => req.params.userId),
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
