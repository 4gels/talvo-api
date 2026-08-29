
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SECRET_KEY = process.env.SECRET_KEY || 'talvo-admin-secret-key-2026-super-secure';

export class AuthController {
  // ✅ أضف هذه الدالة الجديدة
  async registerSystemAdmin(req: Request, res: Response) {
    try {
      const { username, email, password, full_name } = req.body;

      // ✅ التحقق من وجود المستخدم
      const existing = await prisma.user.findFirst({
        where: {
          OR: [
            { username },
            { email }
          ]
        }
      });

      if (existing) {
        return res.status(400).json({ 
          success: false,
          message: 'اسم المستخدم أو البريد الإلكتروني موجود بالفعل' 
        });
      }

      // ✅ تشفير كلمة المرور
      const hashedPassword = await bcrypt.hash(password, 10);

      // ✅ إنشاء المستخدم
      const user = await prisma.user.create({
        data: {
          username,
          email,
          full_name,
          password_hash: hashedPassword,
          is_admin: true,
          is_system_admin_flag: true,
          is_active: true
        }
      });

      res.json({
        success: true,
        message: 'تم إنشاء مدير النظام بنجاح',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          full_name: user.full_name
        }
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ 
        success: false,
        message: 'فشل إنشاء المستخدم' 
      });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { username, password } = req.body;

      const user = await prisma.user.findFirst({
        where: {
          username,
          is_system_admin_flag: true,
          tenant_id: null,
          is_deleted: false
        }
      });

      if (!user) {
        return res.status(401).json({ detail: 'Invalid credentials' });
      }

      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ detail: 'Invalid credentials' });
      }

      // ✅ Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { last_login: new Date() }
      });

      // ✅ Create JWT
      const token = jwt.sign(
        { sub: user.username, id: user.id },
        SECRET_KEY,
        { expiresIn: '7d' }
      );

      res.json({
        access_token: token,
        token_type: 'bearer',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          is_active: user.is_active,
          is_admin: user.is_admin,
          is_system_admin: user.is_system_admin_flag,
          created_at: user.created_at,
          last_login: user.last_login
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getMe(req: Request, res: Response) {
    try {
      // ✅ Get user from token (implement middleware)
      res.json({ message: 'Get current user' });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}