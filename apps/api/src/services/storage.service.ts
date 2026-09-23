import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { env } from '../config/env';

export class StorageService {
  private hasCloudinaryConfig: boolean;

  constructor() {
    this.hasCloudinaryConfig = Boolean(
      env.CLOUDINARY_CLOUD_NAME &&
        env.CLOUDINARY_API_KEY &&
        env.CLOUDINARY_API_SECRET &&
        env.CLOUDINARY_CLOUD_NAME !== 'demo'
    );

    if (this.hasCloudinaryConfig) {
      cloudinary.config({
        cloud_name: env.CLOUDINARY_CLOUD_NAME,
        api_key: env.CLOUDINARY_API_KEY,
        api_secret: env.CLOUDINARY_API_SECRET,
      });
    }
  }

  async uploadImage(
    fileBuffer: Buffer,
    folder: string = 'restaurants',
    originalFilename?: string
  ): Promise<string> {
    if (this.hasCloudinaryConfig) {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: `feastflow/${folder}`,
            resource_type: 'image',
          },
          (error, result) => {
            if (error || !result) {
              reject(error || new Error('Failed to upload image to Cloudinary'));
            } else {
              resolve(result.secure_url);
            }
          }
        );
        uploadStream.end(fileBuffer);
      });
    }

    // Local file fallback for development/testing
    const uploadsDir = path.resolve(process.cwd(), 'public/uploads', folder);
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const ext = originalFilename ? path.extname(originalFilename) : '.jpg';
    const filename = `${crypto.randomBytes(16).toString('hex')}${ext}`;
    const filePath = path.join(uploadsDir, filename);

    await fs.promises.writeFile(filePath, fileBuffer);

    return `/uploads/${folder}/${filename}`;
  }
}

export const storageService = new StorageService();
