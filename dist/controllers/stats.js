"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatsController = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class StatsController {
    async getStats(req, res) {
        try {
            // ✅ Get all tenants
            const tenants = await prisma.tenant.findMany({
                where: { is_deleted: false }
            });
            const totalTenants = tenants.length;
            const activeTenants = tenants.filter(t => t.is_active).length;
            const inactiveTenants = totalTenants - activeTenants;
            const expiredTenants = tenants.filter(t => t.subscription_expiry && new Date(t.subscription_expiry) < new Date()).length;
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
                plan_distribution: planDistribution
            });
        }
        catch (error) {
            console.error('Get stats error:', error);
            res.status(500).json({ error: 'Failed to get stats' });
        }
    }
}
exports.StatsController = StatsController;
//# sourceMappingURL=stats.js.map