"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const licenses_1 = require("../controllers/licenses");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const licensesController = new licenses_1.LicensesController();
router.post('/generate', auth_1.authMiddleware, (req, res) => licensesController.generate(req, res));
router.get('/:license_key/validate', (req, res) => licensesController.validate(req, res));
router.post('/:tenant_id/regenerate', auth_1.authMiddleware, (req, res) => licensesController.regenerate(req, res));
exports.default = router;
//# sourceMappingURL=licenses.js.map