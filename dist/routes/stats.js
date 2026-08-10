"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const stats_1 = require("../controllers/stats");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const statsController = new stats_1.StatsController();
router.get('/', auth_1.authMiddleware, (req, res) => statsController.getStats(req, res));
exports.default = router;
//# sourceMappingURL=stats.js.map