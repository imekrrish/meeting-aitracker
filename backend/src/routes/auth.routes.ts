import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const controller = new AuthController();
export const authRouter = Router();

authRouter.get("/microsoft/login", (req, res, next) => controller.microsoftLogin(req, res, next));
authRouter.get("/callback", (req, res, next) => controller.microsoftCallback(req, res, next));
authRouter.get("/microsoft/callback", (req, res, next) => controller.microsoftCallback(req, res, next));
authRouter.get("/session", authMiddleware, (req, res, next) => controller.session(req, res, next));
authRouter.post("/logout", (req, res) => controller.logout(req, res));
authRouter.post("/register", (req, res, next) => controller.register(req, res, next));
authRouter.post("/verify-otp", (req, res, next) => controller.verifyOtp(req, res, next));
authRouter.post("/login", (req, res, next) => controller.login(req, res, next));
authRouter.post("/resend-otp", (req, res, next) => controller.resendOtp(req, res, next));
