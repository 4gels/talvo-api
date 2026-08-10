import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import tenantsRoutes from './routes/tenants';
import licensesRoutes from './routes/licenses';
import authRoutes from './routes/auth';
import statsRoutes from './routes/stats';

dotenv.config();

const app: Express = express();

// ✅ Middleware
app.use(cors());
app.use(express.json());

// ✅ Routes
app.use('/api/v1/tenants', tenantsRoutes);
app.use('/api/v1/licenses', licensesRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/stats', statsRoutes);

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

export default app;