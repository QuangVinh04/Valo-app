import { NextFunction, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { attachmentService, AttachmentService } from '../services/attachment.service.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import type {
  AttachmentResponseDto,
  BulkDeleteAttachmentsRequestDto,
  BulkDeleteAttachmentsResponseDto,
} from '../types/upload.type.js';
import { sendSuccess, type ApiResponse } from '../utils/api-response.js';
import catchAsync from '../utils/catch-async.js';
import { getCursorPaginationOptions } from '../utils/pagination.util.js';

export class AttachmentController {
  constructor(private readonly attachmentService: AttachmentService) {}

  getMyAttachments = catchAsync(async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<AttachmentResponseDto[]>>,
    _next: NextFunction
  ) => {
    const pagination = getCursorPaginationOptions(req.query);

    const result = await this.attachmentService.getUserAttachments(
      req.user.userId,
      pagination
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
}

export const attachmentController = new AttachmentController(attachmentService);
