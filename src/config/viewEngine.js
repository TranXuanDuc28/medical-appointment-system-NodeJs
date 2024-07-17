// import
import express from "express";

//khoi tao configViewEngine
let configViewEngine = (app) =>{
    app.use(express.static("./src/public"));
    app.set("view engine", "ejs");
    app.set("views", "./src/views")
}

//exports vao module
module.exports = configViewEngine