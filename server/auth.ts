
  import jwt from 'jsonwebtoken';
  import bcrypt from 'bcryptjs';
  import { NextFunction, Request, Response } from 'express';

  const JWT_SECRET = process.env.JWT_SECRET || 'medlink-super-secret-key-development-only';

  export const hashPassword = async (password: string) => {
    return bcrypt.hash(password, 10);
  };

  export const comparePassword = async (password: string, hash: string) => {
    return bcrypt.compare(password, hash);
  };

  export const generateToken = (userId: number, role: string) => {
    return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '24h' });
  };

  export interface AuthRequest extends Request {
    user?: {
      userId: number;
      role: string;
    };
  }

  export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number, role: string };
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  };
  