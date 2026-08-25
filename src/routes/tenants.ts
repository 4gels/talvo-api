import { Router, Request, Response } from 'express';
import { TenantsController } from '../controllers/tenants';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const tenantsController = new TenantsController();

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

// ✅ ✅ ✅ مسار Heartbeat الجديد - لتحديث حالة السيرفر
router.post('/:id/heartbeat', authMiddleware, (req: Request, res: Response) => 
  tenantsController.heartbeat(req, res)
);

export default router;