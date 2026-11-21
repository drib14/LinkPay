import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  port: Number(process.env.PORT || 5000),
  jwtSecret: process.env.JWT_SECRET || 'development-only-change-this-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  adminReportKey: process.env.ADMIN_REPORT_KEY || '',
  clientOrigin: process.env.CLIENT_ORIGIN || '*',
  dataDir: path.resolve(currentDir, '../data')
};
