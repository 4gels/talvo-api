"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const SECRET_KEY = process.env.SECRET_KEY || 'talvo-admin-secret-key-2026';
class AuthController {
    async login(req, res) {
        try {
            const { username, password } = req.body;
            const user = await prisma.user.findFirst({
                where: {
                    username,
                    is_system_admin_flag: true,
                    tenant_id: null,
                    is_deleted: false
                }
            });
            if (!user) {
                return res.status(401).json({ detail: 'Invalid credentials' });
            }
            const isValid = await bcryptjs_1.default.compare(password, user.password_hash);
            if (!isValid) {
                return res.status(401).json({ detail: 'Invalid credentials' });
            }
            // ✅ Update last login
            await prisma.user.update({
                where: { id: user.id },
                data: { last_login: new Date() }
            });
            // ✅ Create JWT
            const token = jsonwebtoken_1.default.sign({ sub: user.username, id: user.id }, SECRET_KEY, { expiresIn: '7d' });
            res.json({
                access_token: token,
                token_type: 'bearer',
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    full_name: user.full_name,
                    is_active: user.is_active,
                    is_admin: user.is_admin,
                    is_system_admin: user.is_system_admin_flag,
                    created_at: user.created_at,
                    last_login: user.last_login
                }
            });
        }
        catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    async getMe(req, res) {
        try {
            // ✅ Get user from token (implement middleware)
            res.json({ message: 'Get current user' });
        }
        catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=auth.js.map