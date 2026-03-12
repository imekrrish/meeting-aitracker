import { prisma } from "./prisma.service";

export class DatabaseInitService {
  public async ensureSchema() {
    // MongoDB collections are created dynamically on first insert.
    // Prisma db push has already handled any index creation.
    return Promise.resolve();
  }
}

