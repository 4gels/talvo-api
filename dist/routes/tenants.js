"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tenants_1 = require("../controllers/tenants");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const tenantsController = new tenants_1.TenantsController();
router.get('/', auth_1.authMiddleware, (req, res) => tenantsController.getAll(req, res));
router.post('/', auth_1.authMiddleware, (req, res) => tenantsController.create(req, res));
router.get('/:id', auth_1.authMiddleware, (req, res) => tenantsController.getById(req, res));
router.put('/:id', auth_1.authMiddleware, (req, res) => tenantsController.update(req, res));
router.delete('/:id', auth_1.authMiddleware, (req, res) => tenantsController.delete(req, res));
router.post('/:id/toggle-status', auth_1.authMiddleware, (req, res) => tenantsController.toggleStatus(req, res));
exports.default = router;
//# sourceMappingURL=tenants.js.map