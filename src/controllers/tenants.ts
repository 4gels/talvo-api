import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { LicenseManager } from '../utils/license';
import { hashPassword } from '../utils/security';

const prisma = new PrismaClient();

export class TenantsController {
  async getAll(req: Request, res: Response) {
    try {
      const { skip = 0, limit = 100 } = req.query;
      
      const tenants = await prisma.tenant.findMany({
        where: { is_deleted: false },
        skip: Number(skip),
        take: Number(limit),
        orderBy: { created_at: 'desc' }
      });
      
      res.json(tenants);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tenants' });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const tenant = await prisma.tenant.findFirst({
        where: { id: Number(id), is_deleted: false }
      });
      
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }
      
      res.json(tenant);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tenant' });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const data = req.body;
      
      // ✅ Check if tenant name exists
      const existing = await prisma.tenant.findFirst({
        where: { name: data.name, is_deleted: false }
      });
      
      if (existing) {
        return res.status(400).json({ error: 'Tenant name already exists' });
      }
      
      // ✅ Generate license key
      const licenseInfo = LicenseManager.generateLicenseKey(
        data.name,
        data.subscription_days || 365
      );
      
      const dbName = LicenseManager.createDbName(licenseInfo.license_key);
      
      // ✅ Calculate expiry date
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + (data.subscription_days || 365));
      
      // ✅ Create tenant
      const tenant = await prisma.tenant.create({
        data: {
          name: data.name,
          arabic_name: data.arabic_name,
          license_key: licenseInfo.license_key,
          db_name: dbName,
          phone: data.phone,
          email: data.email,
          address: data.address,
          tax_number: data.tax_number,
          commercial_register: data.commercial_register,
          currency: data.currency || 'EGP',
          timezone: data.timezone || 'Africa/Cairo',
          is_active: data.is_active ?? true,
          max_users: data.max_users || 5,
          max_storage_mb: data.max_storage_mb || 100,
          subscription_plan: data.subscription_plan || 'basic',
          subscription_expiry: expiryDate,
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
        }
      });
      
      // ✅ Create admin user
      const adminPassword = 'admin123';
      const adminUser = await prisma.user.create({
        data: {
          username: 'admin',
          email: data.email || `admin@${data.name}.com`,
          full_name: 'مدير النظام',
          password_hash: hashPassword(adminPassword),
          is_admin: true,
          is_system_admin_flag: false,
          is_active: true,
          tenant_id: tenant.id
        }
      });
      
      res.status(201).json({
        success: true,
        tenant,
        license_key: tenant.license_key,
        admin_password: adminPassword,
        message: `تم إنشاء المستأجر ${tenant.name} بنجاح`
      });
    } catch (error) {
      console.error('Create tenant error:', error);
      res.status(500).json({ error: 'Failed to create tenant' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;
      
      // ✅ Check if tenant exists
      const tenant = await prisma.tenant.findFirst({
        where: { id: Number(id), is_deleted: false }
      });
      
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }
      
      // ✅ Update subscription expiry if days provided
      let subscriptionExpiry = tenant.subscription_expiry;
      if (data.subscription_days) {
        const newExpiry = new Date();
        newExpiry.setDate(newExpiry.getDate() + data.subscription_days);
        subscriptionExpiry = newExpiry;
      }
      
      // ✅ Update tenant
      const updated = await prisma.tenant.update({
        where: { id: Number(id) },
        data: {
          name: data.name ?? tenant.name,
          arabic_name: data.arabic_name ?? tenant.arabic_name,
          phone: data.phone ?? tenant.phone,
          email: data.email ?? tenant.email,
          address: data.address ?? tenant.address,
          tax_number: data.tax_number ?? tenant.tax_number,
          commercial_register: data.commercial_register ?? tenant.commercial_register,
          currency: data.currency ?? tenant.currency,
          timezone: data.timezone ?? tenant.timezone,
          is_active: data.is_active ?? tenant.is_active,
          max_users: data.max_users ?? tenant.max_users,
          max_storage_mb: data.max_storage_mb ?? tenant.max_storage_mb,
          subscription_plan: data.subscription_plan ?? tenant.subscription_plan,
          subscription_expiry: subscriptionExpiry,
          can_manage_products: data.can_manage_products ?? tenant.can_manage_products,
          can_manage_sales: data.can_manage_sales ?? tenant.can_manage_sales,
          can_manage_purchases: data.can_manage_purchases ?? tenant.can_manage_purchases,
          can_manage_inventory: data.can_manage_inventory ?? tenant.can_manage_inventory,
          can_manage_customers: data.can_manage_customers ?? tenant.can_manage_customers,
          can_manage_suppliers: data.can_manage_suppliers ?? tenant.can_manage_suppliers,
          can_manage_employees: data.can_manage_employees ?? tenant.can_manage_employees,
          can_manage_reports: data.can_manage_reports ?? tenant.can_manage_reports,
          can_manage_settings: data.can_manage_settings ?? tenant.can_manage_settings,
          can_manage_backup: data.can_manage_backup ?? tenant.can_manage_backup,
          can_export_data: data.can_export_data ?? tenant.can_export_data,
          can_import_data: data.can_import_data ?? tenant.can_import_data,
          can_manage_roles: data.can_manage_roles ?? tenant.can_manage_roles,
          can_view_audit_log: data.can_view_audit_log ?? tenant.can_view_audit_log
        }
      });
      
      res.json({
        success: true,
        tenant: updated,
        message: `تم تحديث المستأجر ${updated.name} بنجاح`
      });
    } catch (error) {
      console.error('Update tenant error:', error);
      res.status(500).json({ error: 'Failed to update tenant' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { force } = req.query;
      
      // ✅ Check if tenant exists
      const tenant = await prisma.tenant.findFirst({
        where: { id: Number(id), is_deleted: false }
      });
      
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }
      
      // ✅ Check if tenant has users
      if (tenant.total_users > 0 && !force) {
        return res.status(400).json({
          error: `لا يمكن حذف المستأجر لأنه يحتوي على ${tenant.total_users} مستخدمين نشطين`
        });
      }
      
      // ✅ Soft delete
      await prisma.tenant.update({
        where: { id: Number(id) },
        data: { is_deleted: true }
      });
      
      res.json({
        success: true,
        message: `تم حذف المستأجر ${tenant.name} بنجاح`
      });
    } catch (error) {
      console.error('Delete tenant error:', error);
      res.status(500).json({ error: 'Failed to delete tenant' });
    }
  }

  async toggleStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      // ✅ Check if tenant exists
      const tenant = await prisma.tenant.findFirst({
        where: { id: Number(id), is_deleted: false }
      });
      
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }
      
      // ✅ Toggle status
      const updated = await prisma.tenant.update({
        where: { id: Number(id) },
        data: { is_active: !tenant.is_active }
      });
      
      const status = updated.is_active ? 'نشط' : 'غير نشط';
      
      res.json({
        success: true,
        message: `تم تغيير حالة المستأجر إلى ${status}`
      });
    } catch (error) {
      console.error('Toggle status error:', error);
      res.status(500).json({ error: 'Failed to toggle status' });
    }
  }
}