import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/security';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ detail: 'Missing or invalid token' });
  }
  
  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  
  if (!payload) {
    return res.status(401).json({ detail: 'Invalid token' });
  }
  
  // ✅ Attach user to request
  (req as any).user = payload;
  next();
};