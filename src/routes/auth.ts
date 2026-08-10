import { Router, Request, Response } from 'express';
import { AuthController } from '../controllers/auth';

const router = Router();
const authController = new AuthController();

router.post('/register-system-admin', (req: Request, res: Response) => 
  authController.registerSystemAdmin(req, res)
);

router.post('/login', (req: Request, res: Response) => 
  authController.login(req, res)
);

router.get('/me', (req: Request, res: Response) => 
  authController.getMe(req, res)
);

export default router;