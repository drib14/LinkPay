import { Router } from 'express';
import { z } from 'zod';
import { getAccounts, saveAccounts } from '../store.js';
import { requireAuth } from '../middleware/auth.js';
import { hashPin, verifyPin, publicAccount } from '../security.js';

const router = Router();
router.use(requireAuth);

// Module 9: Account Profile Information
router.get('/profile', (req, res) => {
  const account = req.account;
  res.json({
    account: {
      accountNumber: account.accountNumber,
      firstName: account.firstName,
      lastName: account.lastName,
      fullName: `${account.firstName} ${account.lastName}`,
      age: account.age,
      dateOfBirth: account.dateOfBirth,
      address: account.address,
      accountType: account.accountType,
      balance: account.balance,
      status: account.status,
      createdAt: account.createdAt,
      virtualCard: account.virtualCard
    }
  });
});

// Module 10: Change PIN with max 3 failed attempts on current PIN
router.put('/pin', async (req, res, next) => {
  try {
    const input = z.object({
      currentPin: z.string().regex(/^\d{4}$/, 'Current PIN must be 4 digits'),
      newPin: z.string().regex(/^\d{4}$/, 'New PIN must be 4 digits'),
      confirmNewPin: z.string().regex(/^\d{4}$/, 'Confirm PIN must be 4 digits')
    }).refine((v) => v.newPin === v.confirmNewPin, {
      message: 'New PIN confirmation does not match.',
      path: ['confirmNewPin']
    }).refine((v) => v.newPin !== v.currentPin, {
      message: 'New PIN must be different from current PIN.',
      path: ['newPin']
    }).parse(req.body);

    const accounts = getAccounts();
    const accountIndex = accounts.findIndex((a) => a.id === req.account.id);
    if (accountIndex === -1) return res.status(404).json({ message: 'Account not found.' });

    const account = accounts[accountIndex];
    account.pinChangeAttempts = account.pinChangeAttempts || 0;

    const isMatch = await verifyPin(input.currentPin, account.pinHash);

    if (!isMatch) {
      account.pinChangeAttempts += 1;
      const remaining = 3 - account.pinChangeAttempts;

      if (account.pinChangeAttempts >= 3) {
        account.status = 'locked';
        accounts[accountIndex] = account;
        saveAccounts(accounts);
        return res.status(403).json({
          message: 'Account locked due to 3 failed current PIN entries. Please contact support.',
          locked: true
        });
      }

      accounts[accountIndex] = account;
      saveAccounts(accounts);
      return res.status(400).json({
        message: `Incorrect current PIN! Remaining attempts: ${remaining}`,
        remainingAttempts: remaining
      });
    }

    // Success - update PIN & reset counters
    account.pinHash = await hashPin(input.newPin);
    account.pinChangeAttempts = 0;
    accounts[accountIndex] = account;
    saveAccounts(accounts);

    res.json({ message: 'PIN changed successfully! Please use your new PIN for future logins.' });
  } catch (error) {
    next(error);
  }
});

// Virtual ATM Card Lock / Unlock Toggle
router.put('/card', (req, res) => {
  const accounts = getAccounts();
  const accountIndex = accounts.findIndex((a) => a.id === req.account.id);
  if (accountIndex === -1) return res.status(404).json({ message: 'Account not found.' });

  const account = accounts[accountIndex];
  if (!account.virtualCard) return res.status(400).json({ message: 'No virtual card found.' });

  const newStatus = account.virtualCard.status === 'active' ? 'locked' : 'active';
  account.virtualCard.status = newStatus;
  accounts[accountIndex] = account;
  saveAccounts(accounts);

  res.json({
    message: newStatus === 'locked' ? 'Virtual Card locked successfully.' : 'Virtual Card unlocked.',
    virtualCard: account.virtualCard,
    account: publicAccount(account, true)
  });
});

// Bonus Challenge A: Account Deactivation (Requires ₱0.00 balance)
router.post('/deactivate', (req, res) => {
  const accounts = getAccounts();
  const accountIndex = accounts.findIndex((a) => a.id === req.account.id);
  if (accountIndex === -1) return res.status(404).json({ message: 'Account not found.' });

  const account = accounts[accountIndex];

  if (account.balance > 0) {
    return res.status(400).json({
      message: `Cannot deactivate account with a remaining balance of ₱${account.balance.toFixed(2)}. Please withdraw or transfer all funds first.`
    });
  }

  account.status = 'deactivated';
  accounts[accountIndex] = account;
  saveAccounts(accounts);

  res.json({
    message: 'Your LinkPay account has been deactivated. Thank you for banking with us.',
    account: publicAccount(account, false)
  });
});

// Bonus Challenge D: Account Search (Lookup recipient by account number or name)
router.get('/search', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  if (!q) return res.json({ results: [] });

  const accounts = getAccounts();
  const results = [];

  for (const a of accounts) {
    if (a.id === req.account.id) continue; // Don't search self
    if (a.status !== 'active') continue;

    const fullName = `${a.firstName} ${a.lastName}`.toLowerCase();
    if (a.accountNumber.includes(q) || fullName.includes(q) || a.firstName.toLowerCase().includes(q) || a.lastName.toLowerCase().includes(q)) {
      results.push({
        accountNumber: a.accountNumber,
        fullName: `${a.firstName} ${a.lastName}`,
        accountType: a.accountType
      });
    }
  }

  res.json({ results });
});

export default router;
