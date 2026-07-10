import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { ErrorCode } from '../constants/error-code.js';
import { UPLOAD_CONFIG } from '../constants/upload.constant.js';
import AppError from '../utils/app-error.js';

const chunkUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: UPLOAD_CONFIG.MAX_CHUNK_SIZE,
    files: 1,
  },
});

export const uploadChunkFile = (req: Request, res: Response, next: NextFunction) => {
  chunkUpload.single('file')(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      next(new AppError(ErrorCode.BAD_REQUEST, error.message));
      return;
    }

    next(error);
  });
};
