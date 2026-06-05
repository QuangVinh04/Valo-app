import type { Response } from 'express';


export interface ResponseMeta {
  page?: number;
  limit?: number;
  totalItems?: number;
  totalPages?: number;
  nextCursor?: string | null;
  hasNextPage?: boolean;
}

export interface ResponseErrorDetail {
  field?: string;    
  message: string;   
}


export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  code?: number;
  errors?: ResponseErrorDetail[] | null; // Danh sách lỗi chi tiết (nếu có)
  meta?: ResponseMeta | null; // Thông tin phân trang (nếu có)
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200,
  meta: ResponseMeta | null = null 
): Response<ApiResponse<T>> => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta,
  });
};


export const sendError = (
  res: Response,
  message = 'Internal Server Error',
  statusCode = 500,
  code = 9009,
  errors: ResponseErrorDetail[] | null = null
): Response<ApiResponse<null>> => {
  return res.status(statusCode).json({
    success: false,
    message,
    data: null,
    code,
    errors,
  });
};
