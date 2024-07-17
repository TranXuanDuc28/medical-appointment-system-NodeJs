import bcrypt from 'bcryptjs';
import db from '../models/index'
import { where } from 'sequelize';
import { raw } from 'body-parser';
const salt = bcrypt.genSaltSync(10);
let handleUserLogin = (email,passWord) => {
    return new Promise(async(resolve,reject)=>{
        try {
            let userData = {}
            let isExits = await checkUserEmail(email);
            if(isExits){
                let users = await db.User.findOne({
                    attributes: ['email','roleId','firstName', 'lastName', 'passWord'],
                    where: {email: email},
                    raw: true
                });

                if(users) {
                  
                    let check = bcrypt.compareSync(passWord, users.passWord);
                    if(check){
                        userData.errCode=0;
                        userData.errMessage="Ok!";
                        delete users.passWord;
                        userData.users=users
                    }else{
                        userData.errCode=3;
                        userData.errMessage="Sai mat khau!";
                    }
                }else{
                    userData.errCode=2;
                    userData.errMessage="Khong tim thay nguoi dung!"
                }
            }else{
                userData.errCode=1;
                userData.errMessage="Email cua ban chua ton tai! Vui long thu cach khac!";
            }
            resolve(userData)
        } catch (error) {
            reject(error)
        }
    })
}
let checkUserEmail = (userEmail) => {
    return new Promise(async(resolve, reject)=>{
        try {
            let users = await db.User.findOne({
                where: {email: userEmail}
            })
            if(users){
                resolve(true)
            }else{
                resolve(false)
            }
        } catch (error) {
            reject(error)
        }
    })
}
let getAllUsers = (userId) => {
    return new Promise(async(resolve,reject)=>{
        try {
            let users = "";
            if(userId === "ALL"){
                users = await db.User.findAll({
                    attributes:{
                        exclude: ['passWord']
                    }
                });
                
            }
            if(userId && userId !== "ALL" ){
                users = await db.User.findOne({
                    where:{id: userId},
                    attributes:{
                        exclude: ['passWord']
                    }
                })
            }
            resolve(users);
        } catch (error) {
            reject(error)
        }
    })
}
let createNewUsers = (data) => {
    return new Promise(async(resolve, reject) => {
        try {
            let check = await checkUserEmail(data.email);
            if(check===true){
                resolve({
                    errCode: 1,
                    errMessage:"Email da ton tai! Vui long thu email khac!"
                })
            }else{
                let hashPasswordFromBcrypt = await hashUserPassword(data.passWord);
                await db.User.create({
                    email : data.email,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    passWord:hashPasswordFromBcrypt,
                    address: data.address,
                    phoneNumber: data.phoneNumber,
                    gender: data.gender === '1' ? true : false,
                    roleId:data.roleId,
                })
                resolve({
                    errCode: 0,
                    errMessage: "OK!"
                })
            }
            
             
        } catch (error) {
            reject(error)
        }
    }
    ) 
}
let hashUserPassword = (passWord) =>{
    return new Promise(async(resolve, reject) => {
        try {
            var hashPassword = await bcrypt.hashSync(passWord, salt);
            resolve(hashPassword)
        } catch (error) {
            reject(error)
        }
    }
    )
}
let deleteUsers  = (userId) => {
    return new Promise(async(resolve,reject)=>{
        try {
            let users = await db.User.findOne({
                where: {id: userId},
                raw: false
            })
            if(users){
                await users.destroy();
                resolve({
                    errCode: 0,
                    errMessage:"Xoa thanh cong!"
                })
            }else{
                resolve({
                    errCode: 0,
                    errMessage:"Khong tim thay email nguoi dung!"
                })
            }
        } catch (error) {
            reject(error)
        }
    })
}
let updateUserData = (data) => {
    return new Promise(async(resolve,reject)=>{
        try {
            let users = await db.User.findOne({
                where: {id: data.id},
                raw: false
            })
            if (users){
                users.email = data.email,
                users.firstName = data.firstName,
                users.lastName = data.lastName,
                users.address = data.address,
                users.phoneNumber = data.phoneNumber,
                users.gender = data.gender

                await users.save();
                resolve({
                    errCode: 0,
                    errMessage:"Cap nhap thanh cong!"
                })
            }else{
                resolve({
                    errCode: 1,
                    errMessage:"Khong tim thay email nguoi dung!"
                })
            }
        } catch (error) {
            reject(error)
        }
    })
}
let getAllCodeServices = (typeInput) => {
    return new Promise(async(resolve,reject)=>{
        try {
            let res = {};
            let allcode = await db.allCode.findAll({
                where: {type: typeInput}
            });
            res.errCode = 0;
            res.data = allcode;
            resolve(res);
        } catch (error) {
            reject(error)
        }
    })
}
module.exports = {
    handleUserLogin: handleUserLogin,
    getAllUsers: getAllUsers,
    createNewUsers: createNewUsers,
    deleteUsers: deleteUsers,
    updateUserData: updateUserData,
    getAllCodeServices: getAllCodeServices
}