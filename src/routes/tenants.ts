import { Router, Request, Response } from 'express';
import { TenantsController } from '../controllers/tenants';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const tenantsController = new TenantsController();

// ═══════════════════════════════════════════════════════
// ✅ المستأجرين (مع auth)
// ═══════════════════════════════════════════════════════
router.get('/', authMiddleware, (req: Request, res: Response) => 
  tenantsController.getAll(req, res)
);

router.post('/', authMiddleware, (req: Request, res: Response) => 
  tenantsController.create(req, res)
);

router.get('/:id', authMiddleware, (req: Request, res: Response) => 
  tenantsController.getById(req, res)
);

router.put('/:id', authMiddleware, (req: Request, res: Response) => 
  tenantsController.update(req, res)
);

router.delete('/:id', authMiddleware, (req: Request, res: Response) => 
  tenantsController.delete(req, res)
);

router.post('/:id/toggle-status', authMiddleware, (req: Request, res: Response) => 
  tenantsController.toggleStatus(req, res)
);

// ═══════════════════════════════════════════════════════
// ✅ Heartbeat (Cloudflare - السيرفر الرئيسي)
// ═══════════════════════════════════════════════════════
router.post('/:id/heartbeat', authMiddleware, (req: Request, res: Response) => 
  tenantsController.heartbeat(req, res)
);

// ═══════════════════════════════════════════════════════
// ✅ ✅ ✅ Nebula VPN Routes
// ═══════════════════════════════════════════════════════

// ✅ تسجيل Nebula (من Master عند أول تشغيل)
router.post('/:id/register-nebula', authMiddleware, (req: Request, res: Response) => 
  tenantsController.registerNebula(req, res)
);

// ✅ نبضة Nebula (لتحديث IP العام)
router.post('/:id/nebula-heartbeat', authMiddleware, (req: Request, res: Response) => 
  tenantsController.nebulaHeartbeat(req, res)
);

// ═══════════════════════════════════════════════════════
// ✅ ✅ ✅ Shop Routes
// ═══════════════════════════════════════════════════════

// ✅ تفعيل/تعطيل المتجر
router.post('/:id/toggle-shop', authMiddleware, (req: Request, res: Response) => 
  tenantsController.toggleShop(req, res)
);

// ✅ حفظ Shop URL (من Cloudflare Service)
router.post('/:id/save-shop-url', authMiddleware, (req: Request, res: Response) => 
  tenantsController.saveShopUrl(req, res)
);

// ✅ معلومات المتجر (عام - بدون auth - يستعلم من الموقع الموحّد)
router.get('/:id/shop-info', (req: Request, res: Response) => 
  tenantsController.getShopInfo(req, res)
);
router.post('/:id/shop-subscription/purchase', authMiddleware, (req, res) =>
  tenantsController.purchaseShopSubscription(req, res)
);

router.get('/:id/shop-subscription/status', authMiddleware, (req, res) =>
  tenantsController.getShopSubscriptionStatus(req, res)
);
// ═══════════════════════════════════════════════════════
// ✅ ✅ ✅ Routes الفروع (Nested)
// ═══════════════════════════════════════════════════════
import tenantBranchesRoutes from './tenantBranches';
router.use('/:tenantId/branches', tenantBranchesRoutes);

export default router;