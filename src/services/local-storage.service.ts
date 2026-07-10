import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import type { Request } from 'express';
import env from '../config/env.js';
import { ErrorCode } from '../constants/error-code.js';
import { UPLOAD_CONFIG } from '../constants/upload.constant.js';
import type { FileUploadDto } from '../types/upload.type.js';
import AppError from '../utils/app-error.js';

const maxFileBytes = UPLOAD_CONFIG.MAX_FILE_SIZE;
const localFileRoutePrefix = '/api/v1/attachments/files/';

type LocalFilePathUploadInput = {
  sourcePath: string;
  originalName: string;
  mime?: string;
  size: number;
};

export class LocalStorageService {
  async uploadFileFromPath(req: Request, input: LocalFilePathUploadInput): Promise<FileUploadDto> {
    if (input.size > maxFileBytes) {
      throw new AppError(ErrorCode.FILE_TOO_LARGE);
    }

    const fileName = `${randomUUID()}${this.getSafeExtension(input.originalName)}`;
    const destination = this.getFilePath(fileName);

    await fs.mkdir(this.getStorageDir(), { recursive: true });
    await fs.rename(input.sourcePath, destination);

    return {
      data: this.buildFileUrl(req, fileName),
      name: input.originalName,
      type: 'url',
      mime: input.mime,
      size: input.size,
    };
  }

  getFilePath(fileName: string): string {
    return path.join(this.getStorageDir(), path.basename(fileName));
  }

  async readFileFromUrl(url: string): Promise<Buffer | null> {
    const fileName = this.getFileNameFromUrl(url);
    if (!fileName) return null;

    return fs.readFile(this.getFilePath(fileName));
  }

  async deleteFileFromUrl(url?: string | null): Promise<void> {
    if (!url) return;

    const fileName = this.getFileNameFromUrl(url);
    if (!fileName) return;

    await fs.unlink(this.getFilePath(fileName)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    });
  }

  buildFileUrl(req: Request, fileName: string): string {
    return `${req.protocol}://${req.get('host')}${localFileRoutePrefix}${encodeURIComponent(fileName)}`;
  }

  private getFileNameFromUrl(url: string): string | null {
    try {
      const parsedUrl = new URL(url, 'http://local');
      const index = parsedUrl.pathname.indexOf(localFileRoutePrefix);

      if (index < 0) return null;

      const fileName = decodeURIComponent(parsedUrl.pathname.slice(index + localFileRoutePrefix.length));
      return fileName ? path.basename(fileName) : null;
    } catch {
      return null;
    }
  }

  private getStorageDir(): string {
    return env.LOCAL_FILE_STORAGE_DIR || path.join(process.cwd(), 'data', 'uploads');
  }

  private getSafeExtension(name: string): string {
    const extension = path.extname(name).toLowerCase();

    return /^[a-z0-9.]{1,16}$/.test(extension) ? extension : '';
  }
}

export const localStorageService = new LocalStorageService();
