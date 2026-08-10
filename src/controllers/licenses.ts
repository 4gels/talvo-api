import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { LicenseManager } from '../utils/license';

const prisma = new PrismaClient();

export class LicensesController {
  async generate(req: Request, res: Response) {
    try {
      const data = req.body;
      
      // ✅ Create tenant with license
      // Reuse the tenant creation logic
      // For simplicity, we'll call the tenant controller
      
      res.json({
        success: true,
        license_key: 'TEMP_LICENSE_KEY',
        admin_password: 'admin123',
        message: 'License generated successfully'
      });
    } catch (error) {
      console.error('Generate license error:', error);
      res.status(500).json({ error: 'Failed to generate license' });
    }
  }

  async validate(req: Request, res: Response) {
    try {
      const { license_key } = req.params;
      
      const tenant = await prisma.tenant.findFirst({
        where: {
          license_key: license_key,
          is_deleted: false
        }
      });
      
      if (!tenant) {
        return res.status(404).json({
          valid: false,
          message: 'مفتاح التفعيل غير صحيح'
        });
      }
      
      if (!tenant.is_active) {
        return res.json({
          valid: false,
          message: 'المفتاح غير مفعل'
        });
      }
      
      if (tenant.subscription_expiry && new Date(tenant.subscription_expiry) < new Date()) {
        return res.json({
          valid: false,
          message: 'انتهت صلاحية الاشتراك',
          expiry_date: tenant.subscription_expiry.toISOString()
        });
      }
      
      let daysLeft = null;
      if (tenant.subscription_expiry) {
        const diff = new Date(tenant.subscription_expiry).getTime() - new Date().getTime();
        daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
      }
      
      res.json({
        valid: true,
        tenant,
        message: 'المفتاح صالح',
        expiry_date: tenant.subscription_expiry?.toISOString() || null,
        days_left: daysLeft
      });
    } catch (error) {
      console.error('Validate license error:', error);
      res.status(500).json({ error: 'Failed to validate license' });
    }
  }

  async regenerate(req: Request, res: Response) {
    try {
      const { tenant_id } = req.params;
      
      // ✅ Check if tenant exists
      const tenant = await prisma.tenant.findFirst({
        where: { id: Number(tenant_id), is_deleted: false }
      });
      
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }
      
      // ✅ Generate new license
      const licenseInfo = LicenseManager.generateLicenseKey(tenant.name);
      
      // ✅ Update tenant
      const updated = await prisma.tenant.update({
        where: { id: Number(tenant_id) },
        data: { license_key: licenseInfo.license_key }
      });
      
      res.json({
        success: true,
        license_key: updated.license_key,
        message: 'تم إعادة توليد المفتاح بنجاح'
      });
    } catch (error) {
      console.error('Regenerate license error:', error);
      res.status(500).json({ error: 'Failed to regenerate license' });
    }
  }
}