// src/utils/response.ts
import { Response } from 'express';

export function successResponse<T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200
): void {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

export function createdResponse<T>(res: Response, data: T, message = 'Created'): void {
  successResponse(res, data, message, 201);
}

export function errorResponse(res: Response, message: string, statusCode = 500): void {
  res.status(statusCode).json({
    success: false,
    message,
  });
}
