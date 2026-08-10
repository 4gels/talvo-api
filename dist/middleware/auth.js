"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const security_1 = require("../utils/security");
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ detail: 'Missing or invalid token' });
    }
    const token = authHeader.substring(7);
    const payload = (0, security_1.verifyToken)(token);
    if (!payload) {
        return res.status(401).json({ detail: 'Invalid token' });
    }
    // ✅ Attach user to request
    req.user = payload;
    next();
};
exports.authMiddleware = authMiddleware;
//# sourceMappingURL=auth.js.map