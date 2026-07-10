import { NextFunction, Response } from 'express';
import path from 'path';
import { StatusCodes } from 'http-status-codes';
import { attachmentService, AttachmentService } from '../services/attachment.service.js';
import { chunkedUploadService, ChunkedUploadService } from '../services/chunked-upload.service.js';
import { localStorageService, LocalStorageService } from '../services/local-storage.service.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import type {
  AttachmentResponseDto,
  BulkDeleteAttachmentsRequestDto,
  BulkDeleteAttachmentsResponseDto,
  ChunkUploadSessionDto,
  ChunkUploadStatusDto,
  FileUploadDto,
  InitializeChunkUploadRequestDto,
  UploadedFileDeleteRequestDto,
  UploadedFileDeleteResponseDto,
} from '../types/upload.type.js';
import { sendSuccess, type ApiResponse } from '../utils/api-response.js';
import catchAsync from '../utils/catch-async.js';
import { getCursorPaginationOptions } from '../utils/pagination.util.js';

export class AttachmentController {
  constructor(
    private readonly attachmentService: AttachmentService,
    private readonly localStorage: LocalStorageService,
    private readonly chunkedUpload: ChunkedUploadService
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

  initializeUpload = catchAsync(async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<ChunkUploadSessionDto>>,
    _next: NextFunction
  ) => {
    const payload = req.body as InitializeChunkUploadRequestDto;
    const result = await this.chunkedUpload.initializeUpload(req.user.userId, payload);

    return sendSuccess(
      res,
      result,
      'Upload initialized',
      StatusCodes.CREATED
    );
  });

  uploadChunk = catchAsync(async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<ChunkUploadStatusDto>>,
    _next: NextFunction
  ) => {
    const uploadId = getRouteParam(req.params.uploadId);
    const chunkIndex = Number(getRouteParam(req.params.chunkIndex));
    const result = await this.chunkedUpload.uploadChunk({
      userId: req.user.userId,
      uploadId,
      chunkIndex,
      file: req.file,
    });

    return sendSuccess(
      res,
      result,
      'Chunk uploaded',
      StatusCodes.OK
    );
  });

  getUploadStatus = catchAsync(async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<ChunkUploadStatusDto>>,
    _next: NextFunction
  ) => {
    const result = await this.chunkedUpload.getUploadStatus(
      req.user.userId,
      getRouteParam(req.params.uploadId)
    );

    return sendSuccess(
      res,
      result,
      'Upload status found',
      StatusCodes.OK
    );
  });

  completeUpload = catchAsync(async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<FileUploadDto>>,
    _next: NextFunction
  ) => {
    const result = await this.chunkedUpload.completeUpload(
      req,
      req.user.userId,
      getRouteParam(req.params.uploadId)
    );

    return sendSuccess(
      res,
      result,
      'Upload completed',
      StatusCodes.CREATED
    );
  });

  cancelUpload = catchAsync(async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<{ cancelled: boolean }>>,
    _next: NextFunction
  ) => {
    await this.chunkedUpload.cancelUpload(req.user.userId, getRouteParam(req.params.uploadId));

    return sendSuccess(
      res,
      { cancelled: true },
      'Upload cancelled',
      StatusCodes.OK
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

function getRouteParam(value: string | string[] | undefined): string {
  return path.basename(Array.isArray(value) ? value[0] : value ?? '');
}

export const attachmentController = new AttachmentController(
  attachmentService,
  localStorageService,
  chunkedUploadService
);
