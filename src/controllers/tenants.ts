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

  // ═══════════════════════════════════════════════════════
  // ✅ CREATE — إنشاء مستأجر (مع Nebula + Shop)
  // ═══════════════════════════════════════════════════════
  async create(req: Request, res: Response) {
    try {
      const data = req.body;
      
      // ✅ التحقق من وجود الاسم
      const existing = await prisma.tenant.findFirst({
        where: { name: data.name, is_deleted: false }
      });
      
      if (existing) {
        return res.status(400).json({ error: 'Tenant name already exists' });
      }
      
      // ✅ توليد مفتاح التفعيل
      const licenseInfo = LicenseManager.generateLicenseKey(
        data.name,
        data.subscription_days || 365
      );
      
      const dbName = LicenseManager.createDbName(licenseInfo.license_key);
      
      // ✅ حساب تاريخ الانتهاء
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + (data.subscription_days || 365));
      
      // ✅ إنشاء المستأجر (مع كل الحقول)
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
          can_view_audit_log: data.can_view_audit_log ?? false,
          
          // ✅ حقول السيرفر (Cloudflare)
          is_primary_server: data.is_primary_server ?? false,
          primary_server_url: data.primary_server_url ?? null,
          primary_server_ip: data.primary_server_ip ?? null,
          primary_server_port: data.primary_server_port ?? 5000,
          is_online: data.is_online ?? false,
          last_heartbeat: data.last_heartbeat ? new Date(data.last_heartbeat) : null,
          
          // ✅ ✅ ✅ حقول Nebula VPN
          nebula_enabled: data.nebula_enabled ?? false,
          nebula_lighthouse_ip: data.nebula_lighthouse_ip ?? null,
          nebula_lighthouse_port: data.nebula_lighthouse_port ?? 4242,
          nebula_network: data.nebula_network ?? null,
          nebula_public_ip: data.nebula_public_ip ?? null,
          nebula_last_sync: data.nebula_last_sync ? new Date(data.nebula_last_sync) : null,
          
          // ✅ ✅ ✅ حقول المتجر
          shop_url: data.shop_url ?? null,
          shop_enabled: data.shop_enabled ?? false,
        }
      });
      
      // ✅ إنشاء مستخدم admin
      const adminPassword = 'admin123';
      const adminUsername = `admin_${tenant.id}`;
      
      const adminUser = await prisma.user.create({
        data: {
          username: adminUsername,
          email: data.email || `admin_${tenant.id}@${data.name}.com`,
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
        admin_username: adminUsername,
        message: `تم إنشاء المستأجر ${tenant.name} بنجاح`
      });
    } catch (error) {
      console.error('Create tenant error:', error);
      res.status(500).json({ error: 'Failed to create tenant' });
    }
  }

  // ═══════════════════════════════════════════════════════
  // ✅ UPDATE — تعديل مستأجر
  // ═══════════════════════════════════════════════════════
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;
      
      const tenant = await prisma.tenant.findFirst({
        where: { id: Number(id), is_deleted: false }
      });
      
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }
      
      let subscriptionExpiry = tenant.subscription_expiry;
      if (data.subscription_days) {
        const newExpiry = new Date();
        newExpiry.setDate(newExpiry.getDate() + data.subscription_days);
        subscriptionExpiry = newExpiry;
      }
      
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
          can_view_audit_log: data.can_view_audit_log ?? tenant.can_view_audit_log,
          
          // ✅ حقول السيرفر (Cloudflare)
          is_primary_server: data.is_primary_server ?? tenant.is_primary_server,
          primary_server_url: data.primary_server_url ?? tenant.primary_server_url,
          primary_server_ip: data.primary_server_ip ?? tenant.primary_server_ip,
          primary_server_port: data.primary_server_port ?? tenant.primary_server_port,
          is_online: data.is_online ?? tenant.is_online,
          last_heartbeat: data.last_heartbeat ? new Date(data.last_heartbeat) : tenant.last_heartbeat,
          
          // ✅ ✅ ✅ حقول Nebula VPN
          nebula_enabled: data.nebula_enabled ?? tenant.nebula_enabled,
          nebula_lighthouse_ip: data.nebula_lighthouse_ip ?? tenant.nebula_lighthouse_ip,
          nebula_lighthouse_port: data.nebula_lighthouse_port ?? tenant.nebula_lighthouse_port,
          nebula_network: data.nebula_network ?? tenant.nebula_network,
          nebula_public_ip: data.nebula_public_ip ?? tenant.nebula_public_ip,
          nebula_last_sync: data.nebula_last_sync ? new Date(data.nebula_last_sync) : tenant.nebula_last_sync,
          
          // ✅ ✅ ✅ حقول المتجر
          shop_url: data.shop_url ?? tenant.shop_url,
          shop_enabled: data.shop_enabled ?? tenant.shop_enabled,
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
      
      const tenant = await prisma.tenant.findFirst({
        where: { id: Number(id), is_deleted: false }
      });
      
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }
      
      if (tenant.total_users > 0 && !force) {
        return res.status(400).json({
          error: `لا يمكن حذف المستأجر لأنه يحتوي على ${tenant.total_users} مستخدمين نشطين`
        });
      }
      
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
      
      const tenant = await prisma.tenant.findFirst({
        where: { id: Number(id), is_deleted: false }
      });
      
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }
      
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

  // ═══════════════════════════════════════════════════════
  // ✅ HEARTBEAT — نبضة السيرفر الرئيسي (Cloudflare)
  // ═══════════════════════════════════════════════════════
  async heartbeat(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { is_online, primary_server_url, primary_server_ip, primary_server_port } = req.body;
      
      const tenant = await prisma.tenant.findFirst({
        where: { id: Number(id), is_deleted: false }
      });
      
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }
      
      const updated = await prisma.tenant.update({
        where: { id: Number(id) },
        data: {
          is_online: is_online ?? true,
          last_heartbeat: new Date(),
          is_primary_server: true,
          primary_server_url: primary_server_url ?? tenant.primary_server_url,
          primary_server_ip: primary_server_ip ?? tenant.primary_server_ip,
          primary_server_port: primary_server_port ?? tenant.primary_server_port,
        }
      });
      
      res.json({
        success: true,
        message: 'Heartbeat received successfully',
        tenant: {
          id: updated.id,
          name: updated.name,
          is_online: updated.is_online,
          last_heartbeat: updated.last_heartbeat,
          primary_server_url: updated.primary_server_url,
          primary_server_ip: updated.primary_server_ip,
          primary_server_port: updated.primary_server_port,
        }
      });
    } catch (error) {
      console.error('Heartbeat error:', error);
      res.status(500).json({ error: 'Failed to update heartbeat' });
    }
  }

  // ═══════════════════════════════════════════════════════
  // ✅ ✅ ✅ NEBULA — تسجيل السيرفر الرئيسي
  // ═══════════════════════════════════════════════════════
  async registerNebula(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { 
        nebula_lighthouse_ip, 
        nebula_lighthouse_port, 
        nebula_network,
        nebula_public_ip 
      } = req.body;
      
      const tenant = await prisma.tenant.findFirst({
        where: { id: Number(id), is_deleted: false }
      });
      
      if (!tenant) {
        return res.status(404).json({ success: false, error: 'Tenant not found' });
      }
      
      const updated = await prisma.tenant.update({
        where: { id: Number(id) },
        data: {
          nebula_enabled: true,
          nebula_lighthouse_ip: nebula_lighthouse_ip || `10.${tenant.id}.0.1`,
          nebula_lighthouse_port: nebula_lighthouse_port || 4242,
          nebula_network: nebula_network || `10.${tenant.id}.0.0/16`,
          nebula_public_ip: nebula_public_ip || null,
          nebula_last_sync: new Date(),
          is_primary_server: true,
          is_online: true,
          last_heartbeat: new Date(),
        }
      });
      
      console.log(`✅ Nebula registered: tenant=${tenant.name}, IP=${updated.nebula_public_ip}`);
      
      res.json({
        success: true,
        message: 'تم تسجيل Nebula بنجاح',
        tenant: {
          id: updated.id,
          name: updated.name,
          nebula_enabled: updated.nebula_enabled,
          nebula_lighthouse_ip: updated.nebula_lighthouse_ip,
          nebula_lighthouse_port: updated.nebula_lighthouse_port,
          nebula_network: updated.nebula_network,
          nebula_public_ip: updated.nebula_public_ip,
        }
      });
    } catch (error) {
      console.error('Register Nebula error:', error);
      res.status(500).json({ success: false, error: 'Failed to register Nebula' });
    }
  }

  // ═══════════════════════════════════════════════════════
  // ✅ ✅ ✅ NEBULA — نبضة دورية (لتحديث IP العام)
  // ═══════════════════════════════════════════════════════
  async nebulaHeartbeat(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { nebula_public_ip } = req.body;
      
      const tenant = await prisma.tenant.findFirst({
        where: { id: Number(id), is_deleted: false }
      });
      
      if (!tenant) {
        return res.status(404).json({ success: false, error: 'Tenant not found' });
      }
      
      const updated = await prisma.tenant.update({
        where: { id: Number(id) },
        data: {
          nebula_public_ip: nebula_public_ip || tenant.nebula_public_ip,
          nebula_last_sync: new Date(),
          is_online: true,
          last_heartbeat: new Date(),
        }
      });
      
      res.json({
        success: true,
        nebula_public_ip: updated.nebula_public_ip,
        nebula_last_sync: updated.nebula_last_sync,
      });
    } catch (error) {
      console.error('Nebula heartbeat error:', error);
      res.status(500).json({ success: false, error: 'Failed to update Nebula heartbeat' });
    }
  }

  // ═══════════════════════════════════════════════════════
  // ✅ ✅ ✅ SHOP — تفعيل/تعطيل المتجر
  // ═══════════════════════════════════════════════════════
  async toggleShop(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { shop_enabled } = req.body;
      
      const tenant = await prisma.tenant.findFirst({
        where: { id: Number(id), is_deleted: false }
      });
      
      if (!tenant) {
        return res.status(404).json({ success: false, error: 'Tenant not found' });
      }
      
      const newStatus = shop_enabled !== undefined 
        ? shop_enabled 
        : !tenant.shop_enabled;
      
      const updated = await prisma.tenant.update({
        where: { id: Number(id) },
        data: { shop_enabled: newStatus }
      });
      
      console.log(`✅ Shop ${newStatus ? 'enabled' : 'disabled'}: ${tenant.name}`);
      
      res.json({ 
        success: true, 
        message: newStatus ? 'تم تفعيل المتجر' : 'تم تعطيل المتجر',
        shop_enabled: updated.shop_enabled,
        tenant: {
          id: updated.id,
          name: updated.name,
          shop_enabled: updated.shop_enabled,
          shop_url: updated.shop_url,
        }
      });
    } catch (error) {
      console.error('Toggle shop error:', error);
      res.status(500).json({ success: false, error: 'Failed to toggle shop' });
    }
  }

  // ═══════════════════════════════════════════════════════
  // ✅ ✅ ✅ SHOP — حفظ Shop URL (من Cloudflare Service)
  // ═══════════════════════════════════════════════════════
  async saveShopUrl(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { shop_url } = req.body;
      
      if (!shop_url) {
        return res.status(400).json({ success: false, error: 'shop_url is required' });
      }
      
      const tenant = await prisma.tenant.findFirst({
        where: { id: Number(id), is_deleted: false }
      });
      
      if (!tenant) {
        return res.status(404).json({ success: false, error: 'Tenant not found' });
      }
      
      const updated = await prisma.tenant.update({
        where: { id: Number(id) },
        data: {
          shop_url: shop_url,
          shop_enabled: true,
        }
      });
      
      console.log(`✅ Shop URL saved: ${tenant.name} → ${shop_url}`);
      
      res.json({
        success: true,
        message: 'تم حفظ رابط المتجر',
        shop_url: updated.shop_url,
      });
    } catch (error) {
      console.error('Save shop URL error:', error);
      res.status(500).json({ success: false, error: 'Failed to save shop URL' });
    }
  }

  // ═══════════════════════════════════════════════════════
  // ✅ ✅ ✅ SHOP — معلومات المتجر (للموقع الموحّد - بدون auth)
  // ═══════════════════════════════════════════════════════
  async getShopInfo(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const tenant = await prisma.tenant.findFirst({
        where: { 
          id: Number(id), 
          is_deleted: false,
          is_active: true 
        }
      });
      
      if (!tenant) {
        return res.status(404).json({ success: false, error: 'Tenant not found' });
      }
      
      if (!tenant.shop_enabled) {
        return res.status(403).json({ 
          success: false,
          error: 'Shop is not enabled for this tenant' 
        });
      }
      
      if (!tenant.shop_url) {
        return res.status(503).json({ 
          success: false,
          error: 'Shop URL is not ready yet. Please try again later.' 
        });
      }
      
      res.json({
        success: true,
        shop: {
          tenant_id: tenant.id,
          tenant_name: tenant.name,
          tenant_arabic_name: tenant.arabic_name,
          shop_url: tenant.shop_url,
          shop_enabled: tenant.shop_enabled,
          currency: tenant.currency,
          timezone: tenant.timezone,
          logo_path: tenant.logo_path,
        }
      });
    } catch (error) {
      console.error('Get shop info error:', error);
      res.status(500).json({ success: false, error: 'Failed to get shop info' });
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ✅ شراء اشتراك
  // ═══════════════════════════════════════════════════════════

  async purchaseShopSubscription(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { plan, months } = req.body;

      const tenant = await prisma.tenant.findFirst({
        where: { id: Number(id), is_deleted: false }
      });

      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      const prices: any = { basic: 200, pro: 500, enterprise: 1000 };
      const monthlyPrice = prices[plan];
      if (!monthlyPrice) {
        return res.status(400).json({ error: 'Invalid plan' });
      }

      const validMonths = [1, 3, 6, 12];
      if (!validMonths.includes(Number(months))) {
        return res.status(400).json({ error: 'Invalid months' });
      }

      const totalPrice = monthlyPrice * Number(months);

      let discount = 0;
      if (Number(months) >= 12) discount = 0.20;
      else if (Number(months) >= 6) discount = 0.10;
      else if (Number(months) >= 3) discount = 0.05;

      const finalAmount = totalPrice * (1 - discount);

      const subscriptionLog = await (prisma as any).shopSubscriptionLog.create({
        data: {
          tenant_id: Number(id),
          plan,
          months: Number(months),
          amount: finalAmount,
          status: 'pending',
        }
      });

      const { createPaymentSession } = require('../utils/payment');

      const session = await createPaymentSession({
        amount: finalAmount,
        currency: 'EGP',
        reference: subscriptionLog.id,
        description: `اشتراك المتجر - ${plan} - ${months} شهر`,
        callback_url: `${process.env.TALVO_API_URL}/api/v1/shop-subscription`,
        customer_email: tenant.email || undefined,
        tenant_id: Number(id),
        plan,
        months: Number(months),
      });

      await (prisma as any).shopSubscriptionLog.update({
        where: { id: subscriptionLog.id },
        data: {
          payment_url: session.payment_url,
          payment_reference: session.provider_reference,
          payment_method: session.provider,
        }
      });

      res.json({
        success: true,
        subscription_id: subscriptionLog.id,
        payment_url: session.payment_url,
        amount: finalAmount,
        message: 'اتبع رابط الدفع',
      });

    } catch (error: any) {
      console.error('Purchase error:', error.response?.data || error.message);
      res.status(500).json({
        error: 'Failed to create subscription',
        details: error.message
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ✅ رجوع ناجح من PayPal
  // ═══════════════════════════════════════════════════════════

  async shopSubscriptionSuccess(req: Request, res: Response) {
    try {
      const { ref, token } = req.query;

      if (!ref || !token) {
        return res.status(400).send('Missing parameters');
      }

      const subscriptionLog = await (prisma as any).shopSubscriptionLog.findFirst({
        where: { id: Number(ref) }
      });

      if (!subscriptionLog) {
        return res.status(404).send('Subscription not found');
      }

      const { capturePayPalOrder } = require('../utils/payment');
      const captureResult = await capturePayPalOrder(token as string);

      if (captureResult.status !== 'COMPLETED') {
        return res.status(400).send('Payment not completed');
      }

      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + subscriptionLog.months);

      await (prisma as any).shopSubscriptionLog.update({
        where: { id: subscriptionLog.id },
        data: {
          status: 'paid',
          payment_reference: token as string,
          paid_at: new Date(),
          start_date: startDate,
          end_date: endDate,
        }
      });

      await prisma.tenant.update({
        where: { id: subscriptionLog.tenant_id },
        data: {
          shop_enabled: true,
          shop_subscription_status: 'active',
          shop_subscription_start: startDate,
          shop_subscription_end: endDate,
          shop_subscription_plan: subscriptionLog.plan,
        } as any
      });

      res.send(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>✅ تم الدفع</title>
          <style>
            body { font-family: sans-serif; background: #f5f7fa; display: flex;
                  align-items: center; justify-content: center;
                  min-height: 100vh; margin: 0; }
            .card { background: white; border-radius: 20px; padding: 60px 40px;
                    text-align: center; max-width: 500px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.1); }
            .icon { font-size: 80px; margin-bottom: 20px; }
            h1 { color: #198754; }
            .hint { background: #d1e7dd; color: #0f5132; padding: 14px 20px;
                    border-radius: 12px; margin-top: 24px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">✅</div>
            <h1>تم الدفع بنجاح!</h1>
            <p>تم تفعيل اشتراك المتجر.</p>
            <div class="hint">يمكنك إغلاق النافذة والعودة للتطبيق</div>
          </div>
        </body>
        </html>
      `);

    } catch (error: any) {
      console.error('Success handler error:', error.response?.data || error.message);
      res.status(500).send('فشل تأكيد الدفع');
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ✅ رجوع ملغي
  // ═══════════════════════════════════════════════════════════

  async shopSubscriptionCancel(req: Request, res: Response) {
    const { ref } = req.query;

    if (ref) {
      await (prisma as any).shopSubscriptionLog.update({
        where: { id: Number(ref) },
        data: { status: 'cancelled' }
      }).catch(() => {});
    }

    res.send(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>❌ إلغاء</title>
        <style>
          body { font-family: sans-serif; display: flex; align-items: center;
                justify-content: center; min-height: 100vh; margin: 0;
                background: #f5f7fa; }
          .card { background: white; border-radius: 20px; padding: 60px 40px;
                  text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.1); }
          .icon { font-size: 80px; margin-bottom: 20px; }
          h1 { color: #dc3545; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">❌</div>
          <h1>تم إلغاء الدفع</h1>
        </div>
      </body>
      </html>
    `);
  }

  // ═══════════════════════════════════════════════════════════
  // ✅ حالة الاشتراك
  // ═══════════════════════════════════════════════════════════

  async getShopSubscriptionStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const lastSub = await (prisma as any).shopSubscriptionLog.findFirst({
        where: { tenant_id: Number(id) },
        orderBy: { created_at: 'desc' }
      });

      const tenant = await prisma.tenant.findFirst({
        where: { id: Number(id) }
      });

      res.json({
        success: true,
        last_subscription: lastSub,
        tenant: tenant ? {
          shop_enabled: tenant.shop_enabled,
          shop_subscription_status: (tenant as any).shop_subscription_status,
          shop_subscription_end: (tenant as any).shop_subscription_end,
        } : null,
      });

    } catch (error) {
      res.status(500).json({ error: 'Failed' });
    }
  }
}