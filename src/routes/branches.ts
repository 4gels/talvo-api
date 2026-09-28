import { Router, Request, Response } from 'express';
import { BranchesController } from '../controllers/branches';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const branchesController = new BranchesController();

// =============================================
// ✅ Routes عامة (للتحقق من الكود - بدون auth)
// =============================================

// ✅ التحقق من كود فرع (يستخدمه الفرع عند الدخول)
router.get('/:branch_code/validate', (req: Request, res: Response) =>
  branchesController.validate(req, res)
);

// ✅ Heartbeat من الفرع
router.post('/:branch_code/heartbeat', (req: Request, res: Response) =>
  branchesController.heartbeat(req, res)
);

// =============================================
// ✅ Routes محمية (للمدير)
// =============================================

router.get('/:id', authMiddleware, (req: Request, res: Response) =>
  branchesController.getById(req, res)
);

router.put('/:id', authMiddleware, (req: Request, res: Response) =>
  branchesController.update(req, res)
);

router.delete('/:id', authMiddleware, (req: Request, res: Response) =>
  branchesController.delete(req, res)
);

router.post('/:id/toggle-status', authMiddleware, (req: Request, res: Response) =>
  branchesController.toggleStatus(req, res)
);

export default router;