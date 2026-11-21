import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { config } from '../config.js';
import { getAccounts, saveAccounts } from '../store.js';
import {
  generateAccountNumber,
  generateCardNumber,
  cardExpiry,
  hashPin,
  verifyPin,
  publicAccount
} from '../security.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const registerSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(60),
  lastName: z.string().trim().min(1, 'Last name is required').max(60),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD'),
  address: z.string().trim().min(5, 'Address must be at least 5 characters').max(180),
  accountType: z.enum(['savings', 'checking']),
  pin: z.string().regex(/^\d{4}$/, 'PIN must contain exactly four digits.'),
  confirmPin: z.string().regex(/^\d{4}$/, 'Confirm PIN must contain exactly four digits.')
}).refine((v) => v.pin === v.confirmPin, {
  message: 'PIN confirmation does not match.',
  path: ['confirmPin']
});

function calculateAge(dateString) {
  const birth = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return -1;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// Module 0: Account Registration
router.post('/register', async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const age = calculateAge(input.dateOfBirth);

    if (age < 18) {
      return res.status(400).json({ message: 'Account holders must be at least 18 years old.' });
    }
    if (age > 120) {
      return res.status(400).json({ message: 'Invalid birth date provided.' });
    }

    const accounts = getAccounts();
    const accountNumber = generateAccountNumber(accounts);
    const now = new Date().toISOString();

    const newAccount = {
      id: crypto.randomUUID(),
      accountNumber,
      firstName: input.firstName,
      lastName: input.lastName,
      age,
      dateOfBirth: input.dateOfBirth,
      address: input.address,
      accountType: input.accountType,
      balance: 0,
      pinHash: await hashPin(input.pin),
      status: 'active',
      failedAttempts: 0,
      pinChangeAttempts: 0,
      createdAt: now,
      virtualCard: {
        cardNumber: generateCardNumber(),
        expiry: cardExpiry(),
        status: 'active',
        cardholder: `${input.firstName} ${input.lastName}`.toUpperCase()
      }
    };

    accounts.push(newAccount);
    saveAccounts(accounts);

    return res.status(201).json({
      message: 'Registration successful! Welcome to LinkPay.',
      account: publicAccount(newAccount, true)
    });
  } catch (error) {
    next(error);
  }
});

// Module 2: Account Authentication with 3-attempt Lockout
router.post('/login', async (req, res, next) => {
  try {
    const input = z.object({
      accountNumber: z.string().regex(/^\d{16}$/, 'Account number must be 16 digits'),
      pin: z.string().regex(/^\d{4}$/, 'PIN must be 4 digits')
    }).parse(req.body);

    const accounts = getAccounts();
    const accountIndex = accounts.findIndex((a) => a.accountNumber === input.accountNumber);

    if (accountIndex === -1) {
      return res.status(401).json({ message: 'Invalid account number or PIN.' });
    }

    const account = accounts[accountIndex];

    if (account.status === 'locked') {
      return res.status(403).json({
        message: 'Account is locked due to 3 consecutive failed login attempts. Please contact LinkPay support.'
      });
    }

    if (account.status === 'deactivated') {
      return res.status(403).json({
        message: 'This account has been deactivated.'
      });
    }

    const isMatch = await verifyPin(input.pin, account.pinHash);

    if (!isMatch) {
      account.failedAttempts = (account.failedAttempts || 0) + 1;
      const remaining = 3 - account.failedAttempts;

      if (account.failedAttempts >= 3) {
        account.status = 'locked';
        accounts[accountIndex] = account;
        saveAccounts(accounts);
        return res.status(401).json({
          message: 'Account locked! You have exceeded 3 failed login attempts.',
          locked: true,
          remainingAttempts: 0
        });
      }

      accounts[accountIndex] = account;
      saveAccounts(accounts);
      return res.status(401).json({
        message: `Incorrect PIN! Remaining attempts: ${remaining}`,
        locked: false,
        remainingAttempts: remaining
      });
    }

    // Successful login - reset failed attempts
    account.failedAttempts = 0;
    accounts[accountIndex] = account;
    saveAccounts(accounts);

    const token = jwt.sign({ sub: account.id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

    return res.json({
      message: `Welcome back, ${account.firstName}!`,
      token,
      account: publicAccount(account, true)
    });
  } catch (error) {
    next(error);
  }
});

// Current User Profile / Session
router.get('/me', requireAuth, (req, res) => {
  res.json({ account: publicAccount(req.account, true) });
});

export default router;
