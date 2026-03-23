import fs from "fs/promises";
import { createApp } from "./app";
import { env } from "./config/env";
import { transcriptSubscriptionService } from "./services/singletons";
import { DatabaseInitService } from "./services/storage/database-init.service";

async function bootstrap() {
  await fs.mkdir(env.generatedDir, { recursive: true });
  await new DatabaseInitService().ensureSchema();
  const app = createApp();

  setInterval(() => {
    void transcriptSubscriptionService.renewExpiringSubscriptions();
  }, 1000 * 60 * 30);

  app.listen(env.PORT, () => {
    console.log(`Meeting Tracker AI backend running on http://localhost:${env.PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start backend:", error);
  process.exit(1);
});
