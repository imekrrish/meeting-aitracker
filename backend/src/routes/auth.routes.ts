import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";

const controller = new AuthController();
export const authRouter = Router();

authRouter.post("/register", (req, res, next) => controller.register(req, res, next));
authRouter.post("/verify-otp", (req, res, next) => controller.verifyOtp(req, res, next));
authRouter.post("/login", (req, res, next) => controller.login(req, res, next));
authRouter.post("/resend-otp", (req, res, next) => controller.resendOtp(req, res, next));
