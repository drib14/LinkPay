import express from 'express';
import cors from 'cors';
import { ZodError } from 'zod';
import authRoutes from './routes/auth.js';
import walletRoutes from './routes/wallet.js';
import accountRoutes from './routes/account.js';
import reportsRoutes from './routes/reports.js';

export const app = express();

app.use(cors());
app.use(express.json());

// Request logger for debugging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'LinkPay Server', time: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/reports', reportsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Centralized Error handler
app.use((err, req, res, next) => {
  if (err instanceof ZodError) {
    const firstIssue = err.issues[0];
    const message = firstIssue ? firstIssue.message : 'Invalid request data';
    return res.status(400).json({
      message,
      errors: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }))
    });
  }

  console.error('[LinkPay Error]', err);
  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  res.status(status).json({ message });
});
