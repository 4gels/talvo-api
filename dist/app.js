"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const tenants_1 = __importDefault(require("./routes/tenants"));
const licenses_1 = __importDefault(require("./routes/licenses"));
const auth_1 = __importDefault(require("./routes/auth"));
const stats_1 = __importDefault(require("./routes/stats"));
dotenv_1.default.config();
const app = (0, express_1.default)();
// ✅ Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// ✅ Routes
app.use('/api/v1/tenants', tenants_1.default);
app.use('/api/v1/licenses', licenses_1.default);
app.use('/api/v1/auth', auth_1.default);
app.use('/api/v1/stats', stats_1.default);
// ✅ Health Check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});
app.get('/', (req, res) => {
    res.json({
        name: 'Talvo Admin API',
        version: '1.0.0',
        docs: '/docs',
        status: 'running'
    });
});
exports.default = app;
//# sourceMappingURL=app.js.map