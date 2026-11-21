import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.js';
import walletRoutes from './routes/wallet.js';

const app = express();
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_ORIGIN === '*' ? true : process.env.CLIENT_ORIGIN?.split(',') || true
}));
app.use(express.json({ limit: '20kb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', app: 'LinkPay API' }));
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);

app.use((req, res) => res.status(404).json({ message: 'Endpoint not found.' }));
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

export default app;
