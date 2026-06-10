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
  meta?: ResponseMeta 
): Response<ApiResponse<T>> => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...(meta && { meta })
  });
};


export const sendError = (
  res: Response,
  message = 'Internal server error',
  statusCode = 500,
  code = 'INTERNAL_SERVER_ERROR',
  errors?: ResponseErrorDetail[]
): Response<ApiResponse<null>> => {
  return res.status(statusCode).json({
    success: false,
    code,
    message,
    ...(errors && errors.length > 0 && { errors })
  });

};
