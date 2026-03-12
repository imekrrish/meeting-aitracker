import fs from "fs/promises";
import path from "path";
import { env } from "../../config/env";

export class ArtifactService {
  public async ensureHistoryDir(historyId: string): Promise<string> {
    const targetDir = path.join(env.generatedDir, historyId);
    await fs.mkdir(targetDir, { recursive: true });
    return targetDir;
  }

  public toPublicUrl(filePath: string): string {
    const relative = path.relative(env.generatedDir, filePath).replace(/\\/g, "/");
    return `/generated/${relative}`;
  }
}

