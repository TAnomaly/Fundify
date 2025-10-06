import { Request } from 'express';

export interface ApiError extends Error {
  statusCode?: number;
}

export interface JwtPayload {
  userId: string;
  email: string;
  username: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}
