import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { HttpError } from "../utils/http-error";
import { prisma } from "./storage/prisma.service";
import { EmailService } from "./email.service";

export class AuthService {
    private readonly emailService = new EmailService();

    private generateOtp(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    private signToken(userId: string, email: string, name: string): string {
        return jwt.sign({ userId, email, name }, env.JWT_SECRET, { expiresIn: "7d" });
    }

    public async register(params: { name: string; email: string; password: string }) {
        const existing = await prisma.user.findUnique({ where: { email: params.email } });
        if (existing) {
            throw new HttpError(409, "An account with this email already exists.");
        }

        const passwordHash = await bcrypt.hash(params.password, 12);
        const user = await prisma.user.create({
            data: {
                name: params.name,
                email: params.email,
                passwordHash,
                isVerified: false
            }
        });

        // Generate and store OTP
        const code = this.generateOtp();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
        await prisma.otpToken.create({
            data: { email: params.email, code, expiresAt }
        });

        // Send OTP email
        await this.sendOtpEmail(params.email, params.name, code);

        return { userId: user.id, email: user.email, message: "OTP sent to your email." };
    }

    public async verifyOtp(params: { email: string; code: string }) {
        const otpRecord = await prisma.otpToken.findFirst({
            where: { email: params.email, code: params.code },
            orderBy: { createdAt: "desc" }
        });

        if (!otpRecord) {
            throw new HttpError(400, "Invalid OTP code.");
        }

        if (otpRecord.expiresAt < new Date()) {
            throw new HttpError(400, "OTP has expired. Please request a new one.");
        }

        // Mark user as verified
        const user = await prisma.user.update({
            where: { email: params.email },
            data: { isVerified: true }
        });

        // Clean up used OTPs for this email
        await prisma.otpToken.deleteMany({ where: { email: params.email } });

        const token = this.signToken(user.id, user.email, user.name);
        return { token, user: { id: user.id, name: user.name, email: user.email } };
    }

    public async login(params: { email: string; password: string }) {
        const user = await prisma.user.findUnique({ where: { email: params.email } });
        if (!user) {
            throw new HttpError(401, "Invalid email or password.");
        }

        const passwordValid = await bcrypt.compare(params.password, user.passwordHash);
        if (!passwordValid) {
            throw new HttpError(401, "Invalid email or password.");
        }

        if (!user.isVerified) {
            // Automatically queue up a new verification email
            await this.resendOtp({ email: params.email }).catch(() => {});
            return {
                requiresVerification: true,
                email: user.email,
                message: "Please verify your email to continue. We just sent you a new code."
            };
        }

        const token = this.signToken(user.id, user.email, user.name);
        return { token, user: { id: user.id, name: user.name, email: user.email } };
    }

    public async resendOtp(params: { email: string }) {
        const user = await prisma.user.findUnique({ where: { email: params.email } });
        if (!user) {
            throw new HttpError(404, "No account found with this email.");
        }

        if (user.isVerified) {
            throw new HttpError(400, "Email is already verified.");
        }

        // Invalidate existing OTPs
        await prisma.otpToken.deleteMany({ where: { email: params.email } });

        const code = this.generateOtp();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        await prisma.otpToken.create({
            data: { email: params.email, code, expiresAt }
        });

        await this.sendOtpEmail(params.email, user.name, code);

        return { message: "New OTP sent to your email." };
    }

    private async sendOtpEmail(to: string, name: string, code: string) {
        const { Resend } = await import("resend");
        const resend = new Resend(env.RESEND_API_KEY);

        await resend.emails.send({
            from: env.MAIL_FROM,
            to,
            subject: "Meeting Tracker AI — Your Verification Code",
            html: `
        <div style="font-family: Arial, sans-serif; background: #f6f8fc; padding: 24px; color: #162033;">
          <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 18px; padding: 32px; border: 1px solid #dbe3f4; text-align: center;">
            <p style="margin: 0 0 12px; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: #4f6ea8;">Meeting Tracker AI</p>
            <h1 style="margin: 0 0 12px; font-size: 28px; color: #102445;">Verify Your Email</h1>
            <p style="margin: 0 0 24px; font-size: 15px; color: #46536c;">Hi ${name}, use the code below to complete your registration:</p>
            <div style="background: #f1f5ff; border-radius: 14px; padding: 24px; margin-bottom: 24px;">
              <p style="margin: 0; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #173670;">${code}</p>
            </div>
            <p style="margin: 0; font-size: 14px; color: #5b6983;">This code expires in <strong>5 minutes</strong>.</p>
          </div>
        </div>
      `
        });
    }
}
