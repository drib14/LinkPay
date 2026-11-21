import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { config } from '../config.js';
import { getAccounts, saveAccounts } from '../store.js';
import { generateAccountNumber, generateCardNumber, cardExpiry, hashPin, verifyPin, publicAccount } from '../security.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const registerSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  address: z.string().trim().min(5).max(180),
  accountType: z.enum(['savings', 'checking']),
  pin: z.string().regex(/^\d{4}$/, 'PIN must contain exactly four digits.'),
  confirmPin: z.string().regex(/^\d{4}$/)
}).refine((value) => value.pin === value.confirmPin, {
  message: 'PIN confirmation does not match.',
  path: ['confirmPin']
});

function calculateAge(dateString) {
  const birth = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return -1;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDifference = today.getMonth() - birth.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

router.post('/register', async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const age = calculateAge(input.dateOfBirth);
    if (age < 18 || age > 120) {
      return res.status(400).json({ message: 'You must be at least 18 years old to open a LinkPay account.' });
    }

    const accounts = getAccounts();
    const now = new Date().toISOString();
    const account = {
      id: crypto.randomUUID(),
      accountNumber: generateAccountNumber(accounts),
      firstName: input.firstName,
      lastName: input.lastName,
      age,
      dateOfBirth: input.dateOfBirth,
      address: input.address,
      accountType: input.accountType,
      balance: 0,
      pinHash: await hashPin(input.pin),
      status: 'active',
      createdAt: now,
      virtualCard: {
        cardNumber: generateCardNumber(),
        expiry: cardExpiry(),
        status: 'active',
        cardholder: `${input.firstName} ${input.lastName}`.toUpperCase()
      }
    };

    accounts.push(account);
    saveAccounts(accounts);
    return res.status(201).json({
      message: 'Your LinkPay account has been created.',
      account: publicAccount(account, true)
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const input = z.object({
      accountNumber: z.string().regex(/^\d{16}$/),
      pin: z.string().regex(/^\d{4}$/)
    }).parse(req.body);

    const accounts = getAccounts();
    const account = accounts.find((item) => item.accountNumber === input.accountNumber);
    if (!account || account.status !== 'active') {
      return res.status(401).json({ message: 'Invalid credentials or inactive account.' });
    }
    const valid = await verifyPin(input.pin, account.pinHash);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials or inactive account.' });

    const token = jwt.sign({ sub: account.id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
    return res.json({ token, account: publicAccount(account, false) });
  } catch (error) {
    next(error);
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ account: publicAccount(req.account, false) });
});

export default router;
