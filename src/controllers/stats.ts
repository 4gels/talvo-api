import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class StatsController {
  async getStats(req: Request, res: Response) {
    try {
      // ✅ Get all tenants
      const tenants = await prisma.tenant.findMany({
        where: { is_deleted: false }
      });
      
      const totalTenants = tenants.length;
      const activeTenants = tenants.filter(t => t.is_active).length;
      const inactiveTenants = totalTenants - activeTenants;
      const expiredTenants = tenants.filter(
        t => t.subscription_expiry && new Date(t.subscription_expiry) < new Date()
      ).length;
      
      // ✅ Get total users
      const totalUsers = await prisma.user.count({
        where: { is_deleted: false }
      });
      
      // ✅ Plan distribution
      const planDistribution = {
        basic: tenants.filter(t => t.subscription_plan === 'basic').length,
        pro: tenants.filter(t => t.subscription_plan === 'pro').length,
        enterprise: tenants.filter(t => t.subscription_plan === 'enterprise').length
      };
      
      // ✅✅✅ إحصائيات السيرفر
      const totalServers = tenants.filter(t => t.is_primary_server).length;
      const onlineServers = tenants.filter(t => t.is_primary_server && t.is_online).length;
      const offlineServers = totalServers - onlineServers;
      
      // ✅✅✅ إحصائيات الفروع (جديدة)
      const totalBranches = await prisma.branch.count({
        where: { is_deleted: false }
      });
      
      const onlineBranches = await prisma.branch.count({
        where: { is_deleted: false, is_online: true, is_active: true }
      });
      
      const activeBranches = await prisma.branch.count({
        where: { is_deleted: false, is_active: true }
      });
      
      res.json({
        total_tenants: totalTenants,
        active_tenants: activeTenants,
        inactive_tenants: inactiveTenants,
        expired_tenants: expiredTenants,
        total_users: totalUsers,
        total_storage_mb: 0,
        total_sales: 0,
        total_profit: 0,
        total_invoices: 0,
        plan_distribution: planDistribution,
        
        // ✅✅✅ إحصائيات السيرفر
        total_servers: totalServers,
        online_servers: onlineServers,
        offline_servers: offlineServers,
        
        // ✅✅✅ إحصائيات الفروع
        total_branches: totalBranches,
        online_branches: onlineBranches,
        offline_branches: totalBranches - onlineBranches,
        active_branches: activeBranches,
        inactive_branches: totalBranches - activeBranches,
      });
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({ error: 'Failed to get stats' });
    }
  }
}