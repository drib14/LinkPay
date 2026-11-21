import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { getAccounts, getTransactions, saveBankState } from '../store.js';
import { makeId, publicAccount } from '../security.js';

const router = Router();
router.use(requireAuth);

function money(value) {
  return Number(value).toFixed(2);
}

function addTransaction(transactions, data) {
  transactions.push({
    id: makeId(),
    ...data,
    createdAt: new Date().toISOString(),
    status: 'successful'
  });
}

router.get('/', (req, res) => {
  const account = getAccounts().find((item) => item.id === req.accountId);
  res.json({ account: publicAccount(account, false) });
});

router.get('/transactions', (req, res) => {
  const transactions = getTransactions()
    .filter((item) => item.accountNumber === req.account.accountNumber)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ transactions });
});

router.post('/deposit', (req, res, next) => {
  try {
    const { amount } = z.object({ amount: z.coerce.number().finite().min(100).max(100000) }).parse(req.body);
    const accounts = getAccounts();
    const transactions = getTransactions();
    const account = accounts.find((item) => item.id === req.accountId);
    const previousBalance = account.balance;
    account.balance = Number((account.balance + amount).toFixed(2));
    addTransaction(transactions, {
      accountNumber: account.accountNumber,
      type: 'deposit',
      amount,
      fee: 0,
      previousBalance,
      newBalance: account.balance,
      description: 'Cash deposit'
    });
    saveBankState(accounts, transactions);
    res.json({ message: 'Deposit successful.', account: publicAccount(account, false) });
  } catch (error) { next(error); }
});

router.post('/withdraw', (req, res, next) => {
  try {
    const { amount } = z.object({ amount: z.coerce.number().finite().min(100).max(20000) }).parse(req.body);
    const accounts = getAccounts();
    const transactions = getTransactions();
    const account = accounts.find((item) => item.id === req.accountId);
    const today = new Date().toISOString().slice(0, 10);
    let withdrawnToday = 0;
    for (let index = 0; index < transactions.length; index++) {
      const item = transactions[index];
      if (item.accountNumber === account.accountNumber && item.type === 'withdrawal' &&
          item.status === 'successful' && item.createdAt.slice(0, 10) === today) {
        withdrawnToday += item.amount;
      }
    }
    if (account.balance < amount) return res.status(400).json({ message: 'Insufficient balance.' });
    if (withdrawnToday + amount > 50000) {
      return res.status(400).json({ message: `Daily withdrawal limit exceeded. Remaining limit: ₱${money(50000 - withdrawnToday)}.` });
    }
    const previousBalance = account.balance;
    account.balance = Number((account.balance - amount).toFixed(2));
    addTransaction(transactions, {
      accountNumber: account.accountNumber,
      type: 'withdrawal',
      amount,
      fee: 0,
      previousBalance,
      newBalance: account.balance,
      description: 'Cash withdrawal'
    });
    saveBankState(accounts, transactions);
    res.json({ message: 'Withdrawal successful.', account: publicAccount(account, false), dailyLimitRemaining: 50000 - withdrawnToday - amount });
  } catch (error) { next(error); }
});

router.post('/transfer', (req, res, next) => {
  try {
    const { recipientAccountNumber, amount } = z.object({
      recipientAccountNumber: z.string().regex(/^\d{16}$/),
      amount: z.coerce.number().finite().min(100).max(30000)
    }).parse(req.body);

    const accounts = getAccounts();
    const transactions = getTransactions();
    const sender = accounts.find((item) => item.id === req.accountId);
    const recipient = accounts.find((item) => item.accountNumber === recipientAccountNumber && item.status === 'active');

    if (!recipient) return res.status(404).json({ message: 'Recipient account was not found or is inactive.' });
    if (recipient.id === sender.id) return res.status(400).json({ message: 'You cannot transfer money to your own account.' });

    const fee = 15;
    const totalDeduction = Number((amount + fee).toFixed(2));
    if (sender.balance < totalDeduction) return res.status(400).json({ message: 'Insufficient balance to cover the transfer and ₱15 fee.' });

    const senderPrevious = sender.balance;
    const recipientPrevious = recipient.balance;
    sender.balance = Number((sender.balance - totalDeduction).toFixed(2));
    recipient.balance = Number((recipient.balance + amount).toFixed(2));

    addTransaction(transactions, {
      accountNumber: sender.accountNumber,
      type: 'transfer',
      amount,
      fee,
      previousBalance: senderPrevious,
      newBalance: sender.balance,
      recipientAccountNumber: recipient.accountNumber,
      recipientName: `${recipient.firstName} ${recipient.lastName}`,
      description: `Transfer to ${recipient.firstName} ${recipient.lastName}`
    });
    addTransaction(transactions, {
      accountNumber: recipient.accountNumber,
      type: 'received_transfer',
      amount,
      fee: 0,
      previousBalance: recipientPrevious,
      newBalance: recipient.balance,
      senderAccountNumber: sender.accountNumber,
      senderName: `${sender.firstName} ${sender.lastName}`,
      description: `Transfer from ${sender.firstName} ${sender.lastName}`
    });

    saveBankState(accounts, transactions);
    res.json({
      message: 'Transfer successful.',
      transfer: { amount, fee, totalDeduction, recipientName: `${recipient.firstName} ${recipient.lastName}` },
      account: publicAccount(sender, false)
    });
  } catch (error) { next(error); }
});

export default router;
