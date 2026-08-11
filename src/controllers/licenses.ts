import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { LicenseManager } from '../utils/license';
import { TenantsController } from './tenants';

const prisma = new PrismaClient();

export class LicensesController {
  async generate(req: Request, res: Response) {
    try {
      const data = req.body;
      
      // ✅ استخدم TenantsController لإنشاء المستأجر مع المفتاح
      const tenantsController = new TenantsController();
      
      // ✅ تعديل البيانات لتناسب create
      const tenantData = {
        name: data.name,
        arabic_name: data.arabic_name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        subscription_plan: data.subscription_plan || 'basic',
        max_users: data.max_users || 5,
        subscription_days: data.subscription_days || 365,
        is_active: true,
        can_manage_products: data.can_manage_products ?? true,
        can_manage_sales: data.can_manage_sales ?? true,
        can_manage_purchases: data.can_manage_purchases ?? true,
        can_manage_inventory: data.can_manage_inventory ?? true,
        can_manage_customers: data.can_manage_customers ?? true,
        can_manage_suppliers: data.can_manage_suppliers ?? true,
        can_manage_employees: data.can_manage_employees ?? true,
        can_manage_reports: data.can_manage_reports ?? true,
        can_manage_settings: data.can_manage_settings ?? false,
        can_manage_backup: data.can_manage_backup ?? false,
        can_export_data: data.can_export_data ?? false,
        can_import_data: data.can_import_data ?? false,
        can_manage_roles: data.can_manage_roles ?? false,
        can_view_audit_log: data.can_view_audit_log ?? false
      };
      
      // ✅ إنشاء المستأجر
      const reqWithTenant = { body: tenantData } as Request;
      const resWithTenant = {
        status: (code: number) => ({
          json: (result: any) => {
            // ✅ إعادة النتيجة مع تنسيق LicenseResponse
            res.json({
              success: true,
              license_key: result.tenant?.license_key || result.license_key,
              tenant: result.tenant,
              admin_password: result.admin_password || 'admin123',
              message: result.message || 'License generated successfully'
            });
          }
        })
      } as any;
      
      await tenantsController.create(reqWithTenant, resWithTenant);
      
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