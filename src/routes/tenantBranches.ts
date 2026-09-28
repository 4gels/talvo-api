import { Router, Request, Response } from 'express';
import { BranchesController } from '../controllers/branches';
import { authMiddleware } from '../middleware/auth';

// ✅ mergeParams: true عشان نوصل لـ :tenantId من المسار الأب
const router = Router({ mergeParams: true });
const branchesController = new BranchesController();

// ✅ GET /api/v1/tenants/:tenantId/branches
router.get('/', authMiddleware, (req: Request, res: Response) =>
  branchesController.getByTenant(req, res)
);

// ✅ POST /api/v1/tenants/:tenantId/branches
router.post('/', authMiddleware, (req: Request, res: Response) =>
  branchesController.create(req, res)
);

export default router;