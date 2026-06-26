import { NextFunction, Request, Response } from 'express';

import { ZodSchema } from 'zod';


export const validateRequest = (schema: ZodSchema<unknown>) => {
  return (
    req: Request, 
    res: Response, 
    next: NextFunction
  ): void => {
    req.body = schema.parse(req.body); // Gán dữ liệu đã được xác thực vào req.body

    next();
  };
};