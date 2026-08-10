import { Router, Request, Response } from 'express';
import { StatsController } from '../controllers/stats';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const statsController = new StatsController();

router.get('/', authMiddleware, (req: Request, res: Response) => 
  statsController.getStats(req, res)
);

export default router;