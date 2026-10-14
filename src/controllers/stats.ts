import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class StatsController {
  async getStats(req: Request, res: Response) {
    try {
      // ✅ جلب كل المستأجرين
      const tenants = await prisma.tenant.findMany({
        where: { is_deleted: false }
      });
      
      const totalTenants = tenants.length;
      const activeTenants = tenants.filter(t => t.is_active).length;
      const inactiveTenants = totalTenants - activeTenants;
      const expiredTenants = tenants.filter(
        t => t.subscription_expiry && new Date(t.subscription_expiry) < new Date()
      ).length;
      
      // ✅ إجمالي المستخدمين
      const totalUsers = await prisma.user.count({
        where: { is_deleted: false }
      });
      
      // ✅ توزيع الخطط
      const planDistribution = {
        basic: tenants.filter(t => t.subscription_plan === 'basic').length,
        pro: tenants.filter(t => t.subscription_plan === 'pro').length,
        enterprise: tenants.filter(t => t.subscription_plan === 'enterprise').length
      };
      
      // ✅ إحصائيات السيرفر (Cloudflare)
      const totalServers = tenants.filter(t => t.is_primary_server).length;
      const onlineServers = tenants.filter(t => t.is_primary_server && t.is_online).length;
      const offlineServers = totalServers - onlineServers;
      
      // ═══════════════════════════════════════════════════════
      // ✅ ✅ ✅ إحصائيات Nebula VPN
      // ═══════════════════════════════════════════════════════
      const nebulaEnabledTenants = tenants.filter(t => t.nebula_enabled).length;
      
      // ✅ متصل الآن (آخر مزامنة أقل من 10 دقائق)
      const nebulaOnlineTenants = tenants.filter(
        t => t.nebula_enabled && 
             t.nebula_last_sync && 
             (new Date().getTime() - new Date(t.nebula_last_sync).getTime()) < 10 * 60 * 1000
      ).length;
      
      const nebulaOfflineTenants = nebulaEnabledTenants - nebulaOnlineTenants;
      
      // ═══════════════════════════════════════════════════════
      // ✅ ✅ ✅ إحصائيات المتجر الإلكتروني
      // ═══════════════════════════════════════════════════════
      const shopEnabledTenants = tenants.filter(t => t.shop_enabled).length;
      const shopReadyTenants = tenants.filter(
        t => t.shop_enabled && t.shop_url
      ).length;
      const shopPendingTenants = shopEnabledTenants - shopReadyTenants;
      
      // ═══════════════════════════════════════════════════════
      // ✅ ✅ ✅ إحصائيات الفروع
      // ═══════════════════════════════════════════════════════
      const totalBranches = await prisma.branch.count({
        where: { is_deleted: false }
      });
      
      const onlineBranches = await prisma.branch.count({
        where: { 
          is_deleted: false, 
          is_online: true, 
          is_active: true 
        }
      });
      
      const activeBranches = await prisma.branch.count({
        where: { 
          is_deleted: false, 
          is_active: true 
        }
      });
      
      // ✅ فروع Nebula (حصلت على شهادة)
      const nebulaBranches = await prisma.branch.count({
        where: { 
          is_deleted: false, 
          nebula_cert_issued: true 
        }
      });
      
      // ✅ فروع في انتظار الشهادة
      const pendingNebulaBranches = await prisma.branch.count({
        where: { 
          is_deleted: false, 
          is_active: true,
          nebula_cert_issued: false 
        }
      });
      
      // ═══════════════════════════════════════════════════════
      // ✅ الرد الكامل
      // ═══════════════════════════════════════════════════════
      res.json({
        // ✅ المستأجرين
        total_tenants: totalTenants,
        active_tenants: activeTenants,
        inactive_tenants: inactiveTenants,
        expired_tenants: expiredTenants,
        total_users: totalUsers,
        
        // ✅ الاشتراكات
        plan_distribution: planDistribution,
        
        // ✅ السيرفر (Cloudflare - legacy)
        total_servers: totalServers,
        online_servers: onlineServers,
        offline_servers: offlineServers,
        
        // ✅ ✅ ✅ Nebula VPN
        nebula_enabled_tenants: nebulaEnabledTenants,
        nebula_online_tenants: nebulaOnlineTenants,
        nebula_offline_tenants: nebulaOfflineTenants,
        nebula_branches_total: nebulaBranches,
        nebula_branches_pending: pendingNebulaBranches,
        
        // ✅ ✅ ✅ المتجر الإلكتروني
        shop_enabled_tenants: shopEnabledTenants,
        shop_ready_tenants: shopReadyTenants,
        shop_pending_tenants: shopPendingTenants,
        
        // ✅ ✅ ✅ الفروع
        total_branches: totalBranches,
        online_branches: onlineBranches,
        offline_branches: totalBranches - onlineBranches,
        active_branches: activeBranches,
        inactive_branches: totalBranches - activeBranches,
        
        // ✅ الحقول القديمة (للتوافق)
        total_storage_mb: 0,
        total_sales: 0,
        total_profit: 0,
        total_invoices: 0,
      });
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({ error: 'Failed to get stats' });
    }
  }
}