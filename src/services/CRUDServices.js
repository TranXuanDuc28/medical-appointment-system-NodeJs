import bcrypt from 'bcryptjs';
import db from '../models/index'
import { where } from 'sequelize';
const salt = bcrypt.genSaltSync(10);

let createNewUser = async(data) => {
    return new Promise(async(resolve, reject) => {
        try {
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
            resolve("Them du lieu thanh cong!")
             
        } catch (error) {
            reject(error)
        }
    }
    ) 
}
let hashUserPassword = (passWord) =>{
    return new Promise(async(resolve, reject) => {
        try {
            var hashPassword = bcrypt.hashSync(passWord, salt);
            resolve(hashPassword)
        } catch (error) {
            reject(error)
        }
    }
    )
}
let getAllUser = () => {
    return new Promise(async(resolve,reject) => {
        try {
            let users = db.User.findAll({
                raw: true
            }
            );
            resolve(users)
        } catch (error) {
            reject(error)
        }
    }
    )
}
let getUserInfoById = (userId) => {
    return new Promise(async(resolve,reject) =>{
        try {
            let user = await db.User.findOne({
                where: { id: userId },
                raw: true
            })
            if(user){
                resolve(user)
            }else{
                resolve({})
            }
        } catch (error) {
            reject(error)
        }
    })
}  
let updateUserData = (data) => {
    return new Promise(async(resolve,reject)=>{
        try {
            let user = await db.User.findOne({
                where: {id: data.id}
            })
            if (user){
                user.email = data.email,
                user.firstName = data.firstName,
                user.lastName = data.lastName,
                user.address = data.address,
                user.phoneNumber = data.phoneNumber,
                user.gender = data.gender

                await user.save();
                let allUsers = await db.User.findAll();
                resolve(allUsers);
            }else{
                resolve();
            }
        } catch (error) {
            reject(error)
        }
    })
}
let getDeleteUserById = (userId) => {
    return new Promise(async(resolve,reject)=>{
        try {
            let user = await db.User.findOne({
                where: {id: userId}
            })
            if(user){
                await  user.destroy();
                let allUsers = await db.User.findAll();
                resolve(allUsers);
            }
        } catch (error) {
            reject(error)
        }
    })
}
module.exports = {
    createNewUser: createNewUser,
    getAllUser: getAllUser,
    getUserInfoById: getUserInfoById,
    updateUserData: updateUserData,
    getDeleteUserById: getDeleteUserById
}