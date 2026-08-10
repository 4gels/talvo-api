import { Router, Request, Response } from 'express';
import { LicensesController } from '../controllers/licenses';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const licensesController = new LicensesController();

router.post('/generate', authMiddleware, (req: Request, res: Response) => 
  licensesController.generate(req, res)
);

router.get('/:license_key/validate', (req: Request, res: Response) => 
  licensesController.validate(req, res)
);

router.post('/:tenant_id/regenerate', authMiddleware, (req: Request, res: Response) => 
  licensesController.regenerate(req, res)
);

export default router;