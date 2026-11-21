import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { getAccounts, saveAccounts } from '../store.js';
import { hashPin, verifyPin, publicAccount } from '../security.js';

const router = Router();
router.use(requireAuth);

router.get('/profile', (req, res) => {
  const account = getAccounts().find((item) => item.id === req.accountId);
  res.json({ account: publicAccount(account, true) });
});

router.patch('/pin', async (req, res, next) => {
  try {
    const input = z.object({
      currentPin: z.string().regex(/^\d{4}$/),
      newPin: z.string().regex(/^\d{4}$/),
      confirmPin: z.string().regex(/^\d{4}$/)
    }).parse(req.body);
    if (input.newPin !== input.confirmPin) return res.status(400).json({ message: 'New PIN confirmation does not match.' });
    if (input.currentPin === input.newPin) return res.status(400).json({ message: 'Your new PIN must be different from your current PIN.' });

    const accounts = getAccounts();
    const account = accounts.find((item) => item.id === req.accountId);
    if (!await verifyPin(input.currentPin, account.pinHash)) return res.status(400).json({ message: 'Current PIN is incorrect.' });
    account.pinHash = await hashPin(input.newPin);
    saveAccounts(accounts);
    res.json({ message: 'PIN updated successfully.' });
  } catch (error) { next(error); }
});

router.patch('/card', (req, res, next) => {
  try {
    const { status } = z.object({ status: z.enum(['active', 'locked']) }).parse(req.body);
    const accounts = getAccounts();
    const account = accounts.find((item) => item.id === req.accountId);
    account.virtualCard.status = status;
    saveAccounts(accounts);
    res.json({ message: `Virtual card ${status === 'locked' ? 'locked' : 'unlocked'}.`, account: publicAccount(account, true) });
  } catch (error) { next(error); }
});

router.post('/deactivate', (req, res) => {
  const accounts = getAccounts();
  const account = accounts.find((item) => item.id === req.accountId);
  if (account.balance !== 0) return res.status(400).json({ message: 'Please withdraw or transfer your remaining balance before deactivating your account.' });
  account.status = 'deactivated';
  saveAccounts(accounts);
  res.json({ message: 'Account deactivated. Your account record has been preserved.' });
});

export default router;
