import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { getAccounts } from '../store.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ message: 'Authentication required.' });

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const account = getAccounts().find((item) => item.id === payload.sub);
    if (!account || account.status !== 'active') {
      return res.status(401).json({ message: 'Account is unavailable. Please log in again.' });
    }
    req.accountId = account.id;
    req.account = account;
    next();
  } catch {
    return res.status(401).json({ message: 'Session expired or invalid. Please log in again.' });
  }
}
