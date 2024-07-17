// import
import express from "express";
import homeController from "../controllers/homeController";
import userController from "../controllers/userController";
// khoi tao router
let router = express.Router();

// tao ham initWebRoutes
let initWebRoutes = (app) => {
    router.get('/', homeController.getHomePage);
    router.get('/about', homeController.getAboutPage)
    router.get('/crud', homeController.getCRUD)
    router.post('/post_crud', homeController.postCRUD)
    router.get('/get_crud', homeController.displayGetCRUD)
    router.get('/edit_crud', homeController.getEditCRUD)
    router.post('/put_crud', homeController.putCRUD)
    router.get('/delete_crud', homeController.getdeleteCRUD)
    router.post('/api/login', userController.handleLogin)
    router.get('/api/get_all_users', userController.handleGetAllUsers)
    router.post('/api/create_new_users', userController.handleCreateNewUsers)
    router.delete('/api/delete_users', userController.handleDeleteUsers)
    router.put('/api/edit_users', userController.handleEditUsers)
    router.get('/api/allcode', userController.getAllCode)
    return app.use("/", router);
}

//exports vao module
module.exports = initWebRoutes;