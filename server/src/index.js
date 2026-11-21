import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ZodError } from 'zod';
import { config } from './config.js';
import { getAccounts, getTransactions } from './store.js';
import authRoutes from './routes/auth.js';
import walletRoutes from './routes/wallet.js';
import accountRoutes from './routes/account.js';
import reportRoutes from './routes/reports.js';

const app = express();
app.use(helmet());
app.use(cors({ origin: config.clientOrigin === '*' ? true : config.clientOrigin.split(',') }));
app.use(express.json({ limit: '20kb' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 250, standardHeaders: 'draft-7', legacyHeaders: false }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'LinkPay API', timestamp: new Date().toISOString() });
});
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/reports', reportRoutes);

app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));

app.use((error, _req, res, _next) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      message: 'Please check the information you entered.',
      errors: error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message }))
    });
  }
  console.error(error);
  return res.status(500).json({ message: 'An unexpected server error occurred.' });
});

try {
  getAccounts();
  getTransactions();
  app.listen(config.port, '0.0.0.0', () => {
    console.log(`LinkPay API running at http://localhost:${config.port}`);
  });
} catch (error) {
  console.error('Could not initialize LinkPay JSON storage:', error);
  process.exit(1);
}
