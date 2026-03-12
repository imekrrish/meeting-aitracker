import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __meetingTrackerPrisma__: PrismaClient | undefined;
}

export const prisma =
  global.__meetingTrackerPrisma__ ??
  new PrismaClient({
    log: ["error", "warn"]
  });

if (process.env.NODE_ENV !== "production") {
  global.__meetingTrackerPrisma__ = prisma;
}

