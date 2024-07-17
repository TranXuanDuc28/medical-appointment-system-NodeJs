import db from '../models/index'
import user from '../models/user';
import CRUDServices from '../services/CRUDServices'
let getHomePage = async (req, res) =>{
    try {
        let data = await db.User.findAll();
        return res.render("homePage.ejs",
            {
                data: JSON.stringify(data)
            }
        );
    } catch (e) {
        console.log(e)
        
    }
    
}
let getAboutPage= (req, res) =>{
    return res.render("about/about.ejs");
}
let getCRUD= (req, res) =>{
    return res.render("crud.ejs");
}
let postCRUD = async(req, res) =>{
    let message = await CRUDServices.createNewUser(req.body)
    return res.send("Gui du lieu thanh cong!");
}
let displayGetCRUD = async(req, res) => {
    let data = await CRUDServices.getAllUser();
    return res.render('displayCRUD.ejs',{
        dataTable: data
    })
} 
let getEditCRUD = async(req, res) => {
    let userId = req.query.id;
    if(userId){
        let userData =  await CRUDServices.getUserInfoById(userId);
        return res.render('editCRUD.ejs', {
            user: userData
        });
    }else{
        return res.send('Users not found!');
    }
}
let putCRUD = async(req,res) =>{
    let data = req.body;
    let allUsers = await CRUDServices.updateUserData(data)
    return res.render('displayCRUD.ejs',{
        dataTable: allUsers
    })
}
let getdeleteCRUD = async(req, res)=>{
    let userId = req.query.id;
    if(userId){
        let allUsers = await CRUDServices.getDeleteUserById(userId);
        return res.render('displayCRUD.ejs',{
            dataTable: allUsers
        })
    }else{
        return res.send("Khong tim thay!")
    }
}
module.exports = {
    getHomePage : getHomePage,
    getAboutPage: getAboutPage,
    getCRUD: getCRUD,
    postCRUD: postCRUD,
    displayGetCRUD: displayGetCRUD,
    getEditCRUD: getEditCRUD,
    putCRUD: putCRUD,
    getdeleteCRUD: getdeleteCRUD
}