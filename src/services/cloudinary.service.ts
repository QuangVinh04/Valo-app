import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import env from '../config/env.js';
import { UPLOAD_CONFIG } from '../constants/upload.constant.js';
import logger from '../utils/logger.util.js';

type CloudinaryResourceType = 'image' | 'raw';

const allowedCloudinaryResourceTypes = new Set(['image', 'raw']);
const maxFileBytes = UPLOAD_CONFIG.MAX_FILE_SIZE;

export class CloudinaryService {
  constructor() {
    if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
      cloudinary.config({
        cloud_name: env.CLOUDINARY_CLOUD_NAME,
        api_key: env.CLOUDINARY_API_KEY,
        api_secret: env.CLOUDINARY_API_SECRET,
      });
    }
  }

  async deleteAsset(url?: string | null): Promise<void> {
    const asset = this.parseAsset(url);
    if (!asset) return;

    try {
      await cloudinary.uploader.destroy(asset.publicId, {
        resource_type: asset.resourceType,
      });
    } catch (error) {
      logger.warn('Cloudinary asset delete failed', {
        error: error instanceof Error ? error.message : error,
        publicId: asset.publicId,
        resourceType: asset.resourceType,
      });
    }
  }

  async uploadFile(input: {
    filePath: string;
    fileName: string;
    userId: string;
    uploadId: string;
  }): Promise<{
    fileUrl: string;
    publicId: string;
  }> {
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
      throw new Error('Cloudinary is not configured');
    }

    const extension = path.extname(input.fileName);
    const publicId = `valo/attachments/${input.userId}/${input.uploadId}${extension}`;
    const result = await cloudinary.uploader.upload(input.filePath, {
      public_id: publicId,
      resource_type: 'auto',
      overwrite: false,
    });

    return {
      fileUrl: result.secure_url,
      publicId: result.public_id,
    };
  }

  async fetchFileBuffer(url: string): Promise<Buffer> {
    const response = await this.fetchFile(url);
    if (!response.ok) {
      throw new Error(`HTTP status ${response.status}`);
    }

    return this.readResponseBuffer(response);
  }

  private async fetchFile(url: string): Promise<Response> {
    const parsedUrl = this.parseAllowedUrl(url);
    const response = await fetch(parsedUrl.toString());
    if (response.ok) {
      return response;
    }

    const signedUrl = this.generateSignedUrl(parsedUrl);
    if (!signedUrl) {
      return response;
    }

    return fetch(signedUrl);
  }

  private parseAsset(url?: string | null): {
    publicId: string;
    resourceType: CloudinaryResourceType;
  } | null {
    if (!url) return null;

    try {
      const parsedUrl = new URL(url);
      const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
      const [cloudName, resourceType, deliveryType] = pathParts;

      if (
        parsedUrl.hostname !== 'res.cloudinary.com'
        || cloudName !== env.CLOUDINARY_CLOUD_NAME
        || !this.isResourceType(resourceType)
        || deliveryType !== 'upload'
      ) {
        return null;
      }

      const uploadIndex = pathParts.indexOf('upload');
      const publicPathParts = pathParts.slice(uploadIndex + 1);
      if (publicPathParts[0]?.startsWith('v')) {
        publicPathParts.shift();
      }

      const publicPath = publicPathParts.join('/');
      if (!publicPath) return null;

      return {
        resourceType,
        publicId: resourceType === 'image'
          ? publicPath.replace(/\.[^/.]+$/, '')
          : publicPath,
      };
    } catch {
      return null;
    }
  }

  private parseAllowedUrl(url: string): URL {
    try {
      const parsedUrl = new URL(url);
      const cloudName = env.CLOUDINARY_CLOUD_NAME;
      const pathParts = parsedUrl.pathname.split('/').filter(Boolean);

      if (parsedUrl.protocol !== 'https:') {
        throw new Error('Only HTTPS Cloudinary URLs are allowed');
      }

      if (parsedUrl.hostname !== 'res.cloudinary.com') {
        throw new Error('Only Cloudinary delivery URLs are allowed');
      }

      if (!cloudName || pathParts[0] !== cloudName) {
        throw new Error('Cloudinary cloud does not match server configuration');
      }

      if (!allowedCloudinaryResourceTypes.has(pathParts[1]) || pathParts[2] !== 'upload') {
        throw new Error('Unsupported Cloudinary delivery URL');
      }

      return parsedUrl;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Invalid Cloudinary URL', { cause: error });
    }
  }

  private generateSignedUrl(parsedUrl: URL): string | null {
    const pathname = parsedUrl.pathname.replace('/image/upload/', '/raw/upload/');
    const urlParts = pathname.split('/upload/');
    if (urlParts.length < 2) return null;

    const publicId = urlParts[1].replace(/^v\d+\//, '');

    return cloudinary.url(publicId, {
      resource_type: 'raw',
      type: 'upload',
      sign_url: true,
      secure: true,
    });
  }

  private async readResponseBuffer(response: Response): Promise<Buffer> {
    const contentLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(contentLength)) {
      this.assertFileSize(contentLength);
    }

    if (!response.body) {
      throw new Error('Response body is unreadable');
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let receivedBytes = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;

        receivedBytes += value.byteLength;
        if (receivedBytes > maxFileBytes) {
          await reader.cancel();
          throw new Error(`File exceeds ${this.formatBytes(maxFileBytes)}`);
        }

        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    return Buffer.concat(
      chunks.map((chunk) => Buffer.from(chunk)),
      receivedBytes
    );
  }

  private assertFileSize(size?: number): void {
    if (typeof size === 'number' && size > maxFileBytes) {
      throw new Error(`File exceeds ${this.formatBytes(maxFileBytes)}`);
    }
  }

  private formatBytes(bytes: number): string {
    return `${Math.floor(bytes / 1024 / 1024)}MB`;
  }

  private isResourceType(value: string | undefined): value is CloudinaryResourceType {
    return value === 'image' || value === 'raw';
  }
}

export const cloudinaryService = new CloudinaryService();
