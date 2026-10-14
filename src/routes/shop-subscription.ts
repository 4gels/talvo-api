import { Router } from 'express';
import { TenantsController } from '../controllers/tenants';

const router = Router();
const tenantsController = new TenantsController();

// ✅ رجوع ناجح من PayPal
router.get('/success', (req, res) =>
  tenantsController.shopSubscriptionSuccess(req, res)
);

// ✅ رجوع ملغي
router.get('/cancel', (req, res) =>
  tenantsController.shopSubscriptionCancel(req, res)
);

// ✅ ✅ ✅ Webhook من PayPal
router.post('/webhook', (req, res) =>
  tenantsController.shopSubscriptionWebhook(req, res)
);

export default router;