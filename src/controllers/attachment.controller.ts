import { NextFunction, Response } from 'express';
import path from 'path';
import { StatusCodes } from 'http-status-codes';
import { attachmentService, AttachmentService } from '../services/attachment.service.js';
import { localStorageService, LocalStorageService } from '../services/local-storage.service.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import type {
  AttachmentResponseDto,
  BulkDeleteAttachmentsRequestDto,
  BulkDeleteAttachmentsResponseDto,
  FileUploadDto,
  LocalFileUploadRequestDto,
  UploadedFileDeleteRequestDto,
  UploadedFileDeleteResponseDto,
} from '../types/upload.type.js';
import { sendSuccess, type ApiResponse } from '../utils/api-response.js';
import catchAsync from '../utils/catch-async.js';
import { getCursorPaginationOptions } from '../utils/pagination.util.js';

export class AttachmentController {
  constructor(
    private readonly attachmentService: AttachmentService,
    private readonly localStorage: LocalStorageService
  ) {}

  getMyAttachments = catchAsync(async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<AttachmentResponseDto[]>>,
    _next: NextFunction
  ) => {
    const pagination = getCursorPaginationOptions(req.query);
    const search = typeof req.query.search === 'string' && req.query.search.trim()
      ? req.query.search.trim()
      : undefined;

    const result = await this.attachmentService.getUserAttachments(
      req.user.userId,
      pagination,
      { search }
    );

    return sendSuccess(
      res,
      result.data,
      'Attachments found',
      StatusCodes.OK,
      result.meta
    );
  });

  deleteMyAttachments = catchAsync(async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<BulkDeleteAttachmentsResponseDto>>,
    _next: NextFunction
  ) => {
    const payload = req.body as BulkDeleteAttachmentsRequestDto;
    const result = await this.attachmentService.deleteUserAttachments(
      req.user.userId,
      payload.ids
    );

    return sendSuccess(
      res,
      result,
      'Attachments deleted successfully',
      StatusCodes.OK
    );
  });

  uploadLocalAttachment = catchAsync(async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<FileUploadDto>>,
    _next: NextFunction
  ) => {
    const payload = req.body as LocalFileUploadRequestDto;
    const result = await this.attachmentService.uploadLocalFile(req, payload);

    return sendSuccess(
      res,
      result,
      'File uploaded locally',
      StatusCodes.CREATED
    );
  });

  deleteUploadedAttachment = catchAsync(async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<UploadedFileDeleteResponseDto>>,
    _next: NextFunction
  ) => {
    const payload = req.body as UploadedFileDeleteRequestDto;
    const result = await this.attachmentService.deleteTemporaryUpload(
      req.user.userId,
      payload.url
    );

    return sendSuccess(
      res,
      result,
      result.deleted ? 'Uploaded file deleted' : 'Uploaded file is already attached',
      StatusCodes.OK
    );
  });

  downloadLocalAttachment = catchAsync(async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction
  ) => {
    const fileNameParam = req.params.fileName;
    const fileName = path.basename(Array.isArray(fileNameParam) ? fileNameParam[0] : fileNameParam);
    await this.attachmentService.assertLocalFileAccess(req.user.userId, fileName);

    return res.sendFile(this.localStorage.getFilePath(fileName));
  });
}

export const attachmentController = new AttachmentController(
  attachmentService,
  localStorageService
);
