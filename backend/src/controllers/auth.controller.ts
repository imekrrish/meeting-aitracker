import type { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service";
import { registerSchema, loginSchema, verifyOtpSchema, resendOtpSchema } from "../validators/auth.validator";

const authService = new AuthService();

export class AuthController {
    public async register(req: Request, res: Response, next: NextFunction) {
        try {
            const validated = registerSchema.parse(req.body);
            const result = await authService.register(validated);
            res.status(201).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    public async verifyOtp(req: Request, res: Response, next: NextFunction) {
        try {
            const validated = verifyOtpSchema.parse(req.body);
            const result = await authService.verifyOtp(validated);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    public async login(req: Request, res: Response, next: NextFunction) {
        try {
            const validated = loginSchema.parse(req.body);
            const result = await authService.login(validated);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    public async resendOtp(req: Request, res: Response, next: NextFunction) {
        try {
            const validated = resendOtpSchema.parse(req.body);
            const result = await authService.resendOtp(validated);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }
}
