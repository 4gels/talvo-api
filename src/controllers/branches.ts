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

      // ✅ ✅ ✅ حساب nebula_device_id و nebula_vpn_ip
      // الجهاز الرئيسي = 1، الفروع تبدأ من 2
      const existingBranches = await prisma.branch.count({
        where: { 
          tenant_id: Number(tenantId),
          is_deleted: false
        }
      });
      const nebula_device_id = existingBranches + 2;
      const nebula_vpn_ip = `10.${tenantId}.0.${nebula_device_id}`;

      // ✅ إنشاء الفرع (مع حقول Nebula)
      const branch = await prisma.branch.create({
        data: {
          tenant_id: Number(tenantId),
          branch_code,
          branch_name: branch_name.trim(),
          arabic_name: (arabic_name || branch_name).trim(),
          is_active: true,
          is_online: false,
          
          // ✅ ✅ ✅ حقول Nebula
          nebula_device_id,
          nebula_vpn_ip,
          nebula_cert_issued: false,
        }
      });

      console.log(`✅ Branch created: ${branch.branch_name}`);
      console.log(`   Code: ${branch.branch_code}`);
      console.log(`   Nebula IP: ${branch.nebula_vpn_ip}`);
      console.log(`   Device ID: ${branch.nebula_device_id}`);

      res.status(201).json({
        success: true,
        branch,
        nebula: {
          device_id: nebula_device_id,
          vpn_ip: nebula_vpn_ip,
          lighthouse_ip: tenant.nebula_lighthouse_ip || `10.${tenantId}.0.1`,
          network: tenant.nebula_network || `10.${tenantId}.0.0/16`,
        },
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

      // ✅ ✅ ✅ الرد الكامل (مع حقول Nebula)
      res.json({
        valid: true,
        branch: {
          id: branch.id,
          branch_code: branch.branch_code,
          branch_name: branch.branch_name,
          arabic_name: branch.arabic_name,
          tenant_id: branch.tenant_id,
          is_active: branch.is_active,
          is_online: true,
          
          // ✅ حقول Nebula للفرع
          nebula_device_id: branch.nebula_device_id,
          nebula_vpn_ip: branch.nebula_vpn_ip,
          nebula_cert_issued: branch.nebula_cert_issued,
        },
        tenant: {
          id: branch.tenant.id,
          name: branch.tenant.name,
          arabic_name: branch.tenant.arabic_name,
          license_key: branch.tenant.license_key,
          db_name: branch.tenant.db_name,
          is_active: branch.tenant.is_active,
          subscription_plan: branch.tenant.subscription_plan,
          max_users: branch.tenant.max_users,
          
          // ✅ ✅ ✅ حقول Nebula للـ Master
          nebula_enabled: branch.tenant.nebula_enabled,
          nebula_lighthouse_ip: branch.tenant.nebula_lighthouse_ip,
          nebula_lighthouse_port: branch.tenant.nebula_lighthouse_port,
          nebula_network: branch.tenant.nebula_network,
          nebula_public_ip: branch.tenant.nebula_public_ip,
          
          // ✅ ✅ ✅ حقول Cloudflare (fallback)
          is_primary_server: branch.tenant.is_primary_server,
          primary_server_url: branch.tenant.primary_server_url,
          primary_server_ip: branch.tenant.primary_server_ip,
          primary_server_port: branch.tenant.primary_server_port,
          is_online: branch.tenant.is_online,
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
   * ✅ Heartbeat للفرع (Cloudflare - fallback)
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

  /**
   * ✅ ✅ ✅ الفرع يطلب شهادة Nebula
   * POST /api/v1/branches/:branch_code/request-nebula-cert
   */
  async requestNebulaCert(req: Request, res: Response) {
    try {
      const { branch_code } = req.params;
      
      const branch = await prisma.branch.findFirst({
        where: { 
          branch_code, 
          is_deleted: false, 
          is_active: true 
        },
        include: { tenant: true }
      });
      
      if (!branch) {
        return res.status(404).json({ 
          success: false,
          error: 'Branch not found or inactive' 
        });
      }
      
      if (!branch.tenant) {
        return res.status(404).json({ 
          success: false,
          error: 'Tenant not found' 
        });
      }
      
      // ✅ التحقق من تفعيل Nebula
      if (!branch.tenant.nebula_enabled) {
        return res.status(400).json({ 
          success: false,
          error: 'Nebula is not enabled for this tenant' 
        });
      }
      
      res.json({
        success: true,
        branch: {
          id: branch.id,
          tenant_id: branch.tenant_id,
          branch_code: branch.branch_code,
          branch_name: branch.branch_name,
          arabic_name: branch.arabic_name,
          nebula_device_id: branch.nebula_device_id,
          nebula_vpn_ip: branch.nebula_vpn_ip,
          nebula_cert_issued: branch.nebula_cert_issued,
        },
        tenant: {
          id: branch.tenant.id,
          name: branch.tenant.name,
          nebula_enabled: branch.tenant.nebula_enabled,
          nebula_lighthouse_ip: branch.tenant.nebula_lighthouse_ip,
          nebula_lighthouse_port: branch.tenant.nebula_lighthouse_port,
          nebula_network: branch.tenant.nebula_network,
        }
      });
    } catch (error) {
      console.error('Request Nebula cert error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to request cert' 
      });
    }
  }

  /**
   * ✅ ✅ ✅ Master يؤكد إصدار الشهادة
   * POST /api/v1/branches/:id/confirm-nebula-cert
   */
  async confirmNebulaCert(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { nebula_device_id, nebula_vpn_ip } = req.body;
      
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
          nebula_device_id: nebula_device_id || branch.nebula_device_id,
          nebula_vpn_ip: nebula_vpn_ip || branch.nebula_vpn_ip,
          nebula_cert_issued: true,
          nebula_cert_issued_at: new Date(),
        }
      });
      
      console.log(`✅ Nebula cert confirmed: ${branch.branch_name}`);
      
      res.json({
        success: true,
        message: 'تم تسجيل الشهادة بنجاح',
        branch: updated
      });
    } catch (error) {
      console.error('Confirm Nebula cert error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to confirm cert' 
      });
    }
  }

  /**
   * ✅ ✅ ✅ نبضة Nebula للفرع
   * POST /api/v1/branches/:branch_code/nebula-heartbeat
   */
  async nebulaHeartbeat(req: Request, res: Response) {
    try {
      const { branch_code } = req.params;
      const { device_name, device_ip } = req.body;
      
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
          is_online: true,
          device_name: device_name || branch.device_name,
          device_ip: device_ip || branch.device_ip,
        }
      });
      
      res.json({
        success: true,
        message: 'Nebula heartbeat received',
        branch: {
          id: branch.id,
          branch_code: branch.branch_code,
          is_online: true,
          last_seen: new Date(),
        }
      });
    } catch (error) {
      console.error('Nebula heartbeat error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to update heartbeat' 
      });
    }
  }
}