import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

export class BranchesController {
  
  /**
   * ✅ توليد كود فرع فريد
   * الشكل: BR-XX-XXXXXXXX
   */
  private generateBranchCode(tenantId: number): string {
    const tenantPart = String(tenantId).padStart(2, '0');
    const uniquePart = randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase();
    return `BR-${tenantPart}-${uniquePart}`;
  }

  /**
   * ✅ إنشاء فرع جديد
   * POST /api/v1/tenants/:tenantId/branches
   */
  async create(req: Request, res: Response) {
    try {
      const { tenantId } = req.params;
      const { branch_name, arabic_name } = req.body;

      // ✅ التحقق من المستأجر
      const tenant = await prisma.tenant.findFirst({
        where: { id: Number(tenantId), is_deleted: false }
      });

      if (!tenant) {
        return res.status(404).json({ 
          success: false,
          error: 'Tenant not found' 
        });
      }

      // ✅ التحقق من اسم الفرع
      if (!branch_name || !branch_name.trim()) {
        return res.status(400).json({ 
          success: false,
          error: 'Branch name is required' 
        });
      }

      // ✅ توليد كود فريد (مع إعادة المحاولة)
      let branch_code = '';
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        branch_code = this.generateBranchCode(Number(tenantId));
        const existing = await prisma.branch.findUnique({
          where: { branch_code }
        });
        if (!existing) break;
        attempts++;
      }

      if (attempts >= maxAttempts) {
        return res.status(500).json({ 
          success: false,
          error: 'Failed to generate unique branch code' 
        });
      }

      // ✅ إنشاء الفرع
      const branch = await prisma.branch.create({
        data: {
          tenant_id: Number(tenantId),
          branch_code,
          branch_name: branch_name.trim(),
          arabic_name: (arabic_name || branch_name).trim(),
          is_active: true,
          is_online: false
        }
      });

      res.status(201).json({
        success: true,
        branch,
        message: `تم إنشاء الفرع ${branch.branch_name} بنجاح`
      });

    } catch (error) {
      console.error('Create branch error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to create branch' 
      });
    }
  }

  /**
   * ✅ جلب فروع مستأجر
   * GET /api/v1/tenants/:tenantId/branches
   */
  async getByTenant(req: Request, res: Response) {
    try {
      const { tenantId } = req.params;

      const branches = await prisma.branch.findMany({
        where: {
          tenant_id: Number(tenantId),
          is_deleted: false
        },
        orderBy: { created_at: 'desc' }
      });

      res.json({
        success: true,
        branches,
        count: branches.length
      });

    } catch (error) {
      console.error('Get branches error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch branches' 
      });
    }
  }

  /**
   * ✅ التحقق من كود فرع (للفرع عند الدخول)
   * GET /api/v1/branches/:branch_code/validate
   */
  async validate(req: Request, res: Response) {
    try {
      const { branch_code } = req.params;

      // ✅ البحث عن الفرع
      const branch = await prisma.branch.findFirst({
        where: {
          branch_code,
          is_active: true,
          is_deleted: false
        },
        include: {
          tenant: true
        }
      });

      if (!branch) {
        return res.status(404).json({
          valid: false,
          message: 'كود الفرع غير صحيح أو معطل'
        });
      }

      // ✅ التحقق من المستأجر
      if (!branch.tenant || branch.tenant.is_deleted || !branch.tenant.is_active) {
        return res.status(403).json({
          valid: false,
          message: 'الشركة غير نشطة'
        });
      }

      // ✅ التحقق من الاشتراك
      if (branch.tenant.subscription_expiry && 
          new Date(branch.tenant.subscription_expiry) < new Date()) {
        return res.status(403).json({
          valid: false,
          message: 'انتهت صلاحية الاشتراك'
        });
      }

      // ✅ تحديث آخر ظهور
      await prisma.branch.update({
        where: { id: branch.id },
        data: {
          last_seen: new Date(),
          is_online: true
        }
      });

      // ✅ الرد
      res.json({
        valid: true,
        branch: {
          id: branch.id,
          branch_code: branch.branch_code,
          branch_name: branch.branch_name,
          arabic_name: branch.arabic_name,
          tenant_id: branch.tenant_id,
          is_active: branch.is_active,
          is_online: true
        },
        tenant: {
          id: branch.tenant.id,
          name: branch.tenant.name,
          arabic_name: branch.tenant.arabic_name,
          license_key: branch.tenant.license_key,
          db_name: branch.tenant.db_name,
          is_active: branch.tenant.is_active,
          is_primary_server: branch.tenant.is_primary_server,
          primary_server_url: branch.tenant.primary_server_url,
          primary_server_ip: branch.tenant.primary_server_ip,
          primary_server_port: branch.tenant.primary_server_port,
          is_online: branch.tenant.is_online,
          subscription_plan: branch.tenant.subscription_plan,
          max_users: branch.tenant.max_users
        }
      });

    } catch (error) {
      console.error('Validate branch error:', error);
      res.status(500).json({ 
        valid: false,
        error: 'Failed to validate branch' 
      });
    }
  }

  /**
   * ✅ جلب فرع بالمعرف
   * GET /api/v1/branches/:id
   */
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const branch = await prisma.branch.findFirst({
        where: { id: Number(id), is_deleted: false },
        include: { tenant: true }
      });

      if (!branch) {
        return res.status(404).json({ 
          success: false,
          error: 'Branch not found' 
        });
      }

      res.json({
        success: true,
        branch
      });

    } catch (error) {
      console.error('Get branch error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch branch' 
      });
    }
  }

  /**
   * ✅ تعديل فرع
   * PUT /api/v1/branches/:id
   */
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { branch_name, arabic_name, is_active, device_name } = req.body;

      const branch = await prisma.branch.findFirst({
        where: { id: Number(id), is_deleted: false }
      });

      if (!branch) {
        return res.status(404).json({ 
          success: false,
          error: 'Branch not found' 
        });
      }

      const updated = await prisma.branch.update({
        where: { id: Number(id) },
        data: {
          branch_name: branch_name ?? branch.branch_name,
          arabic_name: arabic_name ?? branch.arabic_name,
          is_active: is_active ?? branch.is_active,
          device_name: device_name ?? branch.device_name
        }
      });

      res.json({
        success: true,
        branch: updated,
        message: 'تم تحديث الفرع بنجاح'
      });

    } catch (error) {
      console.error('Update branch error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to update branch' 
      });
    }
  }

  /**
   * ✅ حذف فرع
   * DELETE /api/v1/branches/:id
   */
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const branch = await prisma.branch.findFirst({
        where: { id: Number(id), is_deleted: false }
      });

      if (!branch) {
        return res.status(404).json({ 
          success: false,
          error: 'Branch not found' 
        });
      }

      // ✅ Soft delete
      await prisma.branch.update({
        where: { id: Number(id) },
        data: {
          is_deleted: true,
          is_active: false,
          is_online: false
        }
      });

      res.json({
        success: true,
        message: `تم حذف الفرع ${branch.branch_name} بنجاح`
      });

    } catch (error) {
      console.error('Delete branch error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to delete branch' 
      });
    }
  }

  /**
   * ✅ تفعيل/تعطيل فرع
   * POST /api/v1/branches/:id/toggle-status
   */
  async toggleStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const branch = await prisma.branch.findFirst({
        where: { id: Number(id), is_deleted: false }
      });

      if (!branch) {
        return res.status(404).json({ 
          success: false,
          error: 'Branch not found' 
        });
      }

      const updated = await prisma.branch.update({
        where: { id: Number(id) },
        data: { is_active: !branch.is_active }
      });

      const status = updated.is_active ? 'مفعل' : 'معطل';

      res.json({
        success: true,
        branch: updated,
        message: `تم ${status} الفرع بنجاح`
      });

    } catch (error) {
      console.error('Toggle branch status error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to toggle branch status' 
      });
    }
  }

  /**
   * ✅ Heartbeat للفرع
   * POST /api/v1/branches/:branch_code/heartbeat
   */
  async heartbeat(req: Request, res: Response) {
    try {
      const { branch_code } = req.params;

      const branch = await prisma.branch.findFirst({
        where: { branch_code, is_deleted: false }
      });

      if (!branch) {
        return res.status(404).json({ 
          success: false,
          error: 'Branch not found' 
        });
      }

      await prisma.branch.update({
        where: { id: branch.id },
        data: {
          last_seen: new Date(),
          is_online: true
        }
      });

      res.json({
        success: true,
        message: 'Heartbeat received'
      });

    } catch (error) {
      console.error('Branch heartbeat error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to update heartbeat' 
      });
    }
  }
}