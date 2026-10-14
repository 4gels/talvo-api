import { Router, Request, Response } from 'express';
import { BranchesController } from '../controllers/branches';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const branchesController = new BranchesController();

// ═══════════════════════════════════════════════════════════════════
// ✅ Routes عامة (بدون auth - للفرع نفسه)
// ═══════════════════════════════════════════════════════════════════

// ✅ التحقق من كود الفرع (عند الدخول)
router.get('/:branch_code/validate', (req: Request, res: Response) =>
  branchesController.validate(req, res)
);

// ✅ Heartbeat (Cloudflare - fallback قديم)
router.post('/:branch_code/heartbeat', (req: Request, res: Response) =>
  branchesController.heartbeat(req, res)
);

// ═══════════════════════════════════════════════════════════════════
// ✅ ✅ ✅ Nebula Routes (بدون auth - للفرع)
// ═══════════════════════════════════════════════════════════════════

// ✅ الفرع يطلب شهادة Nebula
router.post('/:branch_code/request-nebula-cert', (req: Request, res: Response) =>
  branchesController.requestNebulaCert(req, res)
);

// ✅ نبضة Nebula من الفرع
router.post('/:branch_code/nebula-heartbeat', (req: Request, res: Response) =>
  branchesController.nebulaHeartbeat(req, res)
);

// ═══════════════════════════════════════════════════════════════════
// ✅ Routes محمية (مع auth - للمدير/Master)
// ═══════════════════════════════════════════════════════════════════

// ✅ جلب فرع بالمعرف
router.get('/:id', authMiddleware, (req: Request, res: Response) =>
  branchesController.getById(req, res)
);

// ✅ تعديل فرع
router.put('/:id', authMiddleware, (req: Request, res: Response) =>
  branchesController.update(req, res)
);

// ✅ حذف فرع
router.delete('/:id', authMiddleware, (req: Request, res: Response) =>
  branchesController.delete(req, res)
);

// ✅ تفعيل/تعطيل فرع
router.post('/:id/toggle-status', authMiddleware, (req: Request, res: Response) =>
  branchesController.toggleStatus(req, res)
);

// ✅ ✅ ✅ Master يؤكد إصدار الشهادة
router.post('/:id/confirm-nebula-cert', authMiddleware, (req: Request, res: Response) =>
  branchesController.confirmNebulaCert(req, res)
);

export default router;