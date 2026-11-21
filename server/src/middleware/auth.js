import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { getAccounts } from '../store.js';

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required. Please login.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const accounts = getAccounts();
    const account = accounts.find((a) => a.id === decoded.sub);

    if (!account) {
      return res.status(401).json({ message: 'Account not found or no longer exists.' });
    }
    if (account.status === 'locked') {
      return res.status(403).json({ message: 'Account is locked due to security policy. Please contact support.' });
    }
    if (account.status === 'deactivated') {
      return res.status(403).json({ message: 'Account has been deactivated.' });
    }

    req.account = account;
    next();
  } catch {
    return res.status(401).json({ message: 'Session expired or invalid token. Please log in again.' });
  }
}
