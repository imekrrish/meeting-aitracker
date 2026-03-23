import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  FRONTEND_URL: z.string().default("http://localhost:5173"),
  CLIENT_ORIGIN: z.string().optional(),
  CLIENT_ID: z.string().min(1).optional(),
  CLIENT_SECRET: z.string().min(1).optional(),
  TENANT_ID: z.string().min(1).optional(),
  REDIRECT_URI: z.string().default("http://localhost:3000/auth/callback"),
  MICROSOFT_LOGIN_SCOPES: z.string().default("User.Read offline_access"),
  MICROSOFT_AUTOMATION_SCOPES: z
    .string()
    .default("User.Read offline_access OnlineMeetings.Read OnlineMeetingTranscript.Read.All"),
  MICROSOFT_WEBHOOK_URL: z.string().optional(),
  MICROSOFT_SUBSCRIPTION_SECRET: z.string().min(1).optional(),
  MICROSOFT_SUBSCRIPTION_RENEW_WINDOW_MINUTES: z.coerce.number().default(240),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASS: z.string().min(1).optional(),
  MAIL_FROM: z.string().min(1).optional(),
  DATABASE_URL: z.string().min(1).optional(),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().default(2),
  JWT_SECRET: z.string().min(1).optional(),
  CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
  CLOUDINARY_API_KEY: z.string().min(1).optional(),
  CLOUDINARY_API_SECRET: z.string().min(1).optional()
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => issue.path.join(".") + ": " + issue.message);
  throw new Error(`Invalid environment configuration:\n${issues.join("\n")}`);
}

export const env = {
  ...parsed.data,
  CLIENT_ORIGIN: parsed.data.CLIENT_ORIGIN ?? parsed.data.FRONTEND_URL,
  appRoot: path.resolve(__dirname, "..", ".."),
  generatedDir: path.resolve(__dirname, "..", "..", "generated")
};

