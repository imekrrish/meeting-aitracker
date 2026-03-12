import cors from "cors";
import express from "express";
import path from "path";
import { env } from "./config/env";
import { errorMiddleware } from "./middleware/error.middleware";
import { notFoundMiddleware } from "./middleware/not-found.middleware";
import { authRouter } from "./routes/auth.routes";
import { healthRouter } from "./routes/health.routes";
import { historyRouter } from "./routes/history.routes";
import { transcriptRouter } from "./routes/transcript.routes";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.CLIENT_ORIGIN
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use("/generated", express.static(path.resolve(env.generatedDir)));

  app.use("/api/auth", authRouter);
  app.use("/api/health", healthRouter);
  app.use("/api/transcripts", transcriptRouter);
  app.use("/api/history", historyRouter);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}

