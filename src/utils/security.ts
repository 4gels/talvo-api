import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.SECRET_KEY || 'talvo-admin-secret-key-2026';

export const hashPassword = (password: string): string => {
  return bcrypt.hashSync(password, 10);
};

export const verifyPassword = (password: string, hash: string): boolean => {
  return bcrypt.compareSync(password, hash);
};

export const generateToken = (payload: any): string => {
  return jwt.sign(payload, SECRET_KEY, { expiresIn: '7d' });
};

export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, SECRET_KEY);
  } catch {
    return null;
  }
};