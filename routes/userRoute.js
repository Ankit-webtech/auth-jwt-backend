import express from "express";
import { adminController, loginUser, logoutUser, myProfile, refreshCSRF, refreshToken, verifyOtp, verifyUser } from "../controllers/userController.js";
import { registerUser } from "../controllers/userController.js";
import {  authorizeRole, isAuth } from "../middlewares/isAuth.js";
import { verifyCSRFToken } from "../config/csrfMiddleware.js";

const Router = express.Router();

Router.post("/register", registerUser);
Router.post("/verify-email/:token", verifyUser); 
Router.post("/login", loginUser);
Router.post("/verify-otp", verifyOtp); 
Router.get("/me",isAuth , myProfile);
Router.post("/refresh", refreshToken);
Router.post("/logout",isAuth, verifyCSRFToken , logoutUser);
Router.post("/refresh-csrf" , isAuth , refreshCSRF);
Router.get("/admin", isAuth, authorizeRole("admin"), adminController);


export default Router;