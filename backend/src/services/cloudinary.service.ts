import { v2 as cloudinary } from "cloudinary";
import path from "path";
import { env } from "../config/env";

export type CloudinaryAsset = {
  secureUrl: string;
  publicId: string;
};

export class CloudinaryService {
  private readonly configured = Boolean(
    env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET
  );

  constructor() {
    if (this.configured) {
      cloudinary.config({
        cloud_name: env.CLOUDINARY_CLOUD_NAME,
        api_key: env.CLOUDINARY_API_KEY,
        api_secret: env.CLOUDINARY_API_SECRET
      });
    }
  }

  public isConfigured() {
    return this.configured;
  }

  public async uploadArtifact(filePath: string, params: { folder: string; publicId: string }): Promise<CloudinaryAsset> {
    if (!this.configured) {
      throw new Error("Cloudinary is not configured.");
    }

    const uploaded = await cloudinary.uploader.upload(filePath, {
      folder: params.folder,
      public_id: params.publicId,
      resource_type: "raw",
      use_filename: true,
      unique_filename: false,
      overwrite: true
    });

    return {
      secureUrl: uploaded.secure_url,
      publicId: uploaded.public_id
    };
  }

  public buildArtifactPublicId(historyId: string, filePath: string) {
    const extension = path.extname(filePath).replace(".", "");
    const baseName = path.basename(filePath, path.extname(filePath));
    return `${historyId}-${baseName}.${extension}`;
  }
}
