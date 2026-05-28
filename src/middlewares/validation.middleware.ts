import { NextFunction, Request, Response } from 'express';

import { ZodSchema } from 'zod';


export const validateRequest = (schema: ZodSchema<unknown>) => {
  return (
    req: Request, 
    res: Response, 
    next: NextFunction
  ): void => {

    const validationResult = schema.parse(req.body);

    req.body = validationResult; // Gán dữ liệu đã được xác thực vào req.body
    
    next();

  };
};