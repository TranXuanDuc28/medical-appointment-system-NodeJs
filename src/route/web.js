// import
import express from "express";
import homeController from "../controllers/homeController";
import userController from "../controllers/userController";
import doctorController from "../controllers/doctorControllers";
import patientController from "../controllers/patientController";
import specialtyController from "../controllers/specialtyController";
import clinicController from "../controllers/clinicController";

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
  // Add the Casso payment transaction API endpoint
  
  router.get("/api/check-paid", doctorController.getListGDPR);
  return app.use("/", router);
};

//exports vao module
module.exports = initWebRoutes;
