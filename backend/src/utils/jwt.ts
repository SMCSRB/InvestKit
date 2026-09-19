import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface TokenPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export const generateToken = (userId: string, email: string): string => {
  return jwt.sign(
    { userId, email },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
};

export const verifyToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.verify(token, env.jwtSecret) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};

export const decodeToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.decode(token) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};
