import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET || 'linkpay_super_secret_coffee_jwt_key_2026_secure',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  adminReportKey: process.env.ADMIN_REPORT_KEY || 'linkpay-admin-secret-key-2026'
};
