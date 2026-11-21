import { Router } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
import { getAccounts, saveAccounts, getTransactions, saveTransactions } from '../store.js';
import { requireAuth } from '../middleware/auth.js';
import { publicAccount } from '../security.js';

const router = Router();
router.use(requireAuth);

const peso = (val) => `₱${Number(val).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Module 4: Balance Inquiry
router.get('/balance', (req, res) => {
  const account = req.account;
  const isLowBalance = account.balance < 1000;
  res.json({
    accountHolder: `${account.firstName} ${account.lastName}`,
    accountNumber: account.accountNumber,
    accountType: account.accountType,
    balance: account.balance,
    formattedBalance: peso(account.balance),
    isLowBalance,
    warning: isLowBalance ? 'Warning: Your account balance is below ₱1,000.00.' : null
  });
});

// Module 5: Cash Deposit (₱100 - ₱100,000)
router.post('/deposit', (req, res, next) => {
  try {
    const input = z.object({
      amount: z.number().positive('Deposit amount must be positive')
    }).parse(req.body);

    const amount = Number(input.amount.toFixed(2));
    if (amount < 100) {
      return res.status(400).json({ message: 'Minimum deposit is ₱100.00.' });
    }
    if (amount > 100000) {
      return res.status(400).json({ message: 'Maximum deposit is ₱100,000.00 per transaction.' });
    }

    const accounts = getAccounts();
    const accountIndex = accounts.findIndex((a) => a.id === req.account.id);
    if (accountIndex === -1) return res.status(404).json({ message: 'Account not found.' });

    const account = accounts[accountIndex];
    const previousBalance = account.balance;
    const newBalance = Number((previousBalance + amount).toFixed(2));
    account.balance = newBalance;

    accounts[accountIndex] = account;
    saveAccounts(accounts);

    const transactions = getTransactions();
    const tx = {
      id: crypto.randomUUID(),
      accountNumber: account.accountNumber,
      type: 'deposit',
      amount,
      fee: 0,
      previousBalance,
      newBalance,
      status: 'successful',
      description: 'Cash Deposit',
      date: new Date().toISOString()
    };
    transactions.push(tx);
    saveTransactions(transactions);

    res.status(200).json({
      message: 'Deposit successful!',
      receipt: {
        transactionId: tx.id,
        accountHolder: `${account.firstName} ${account.lastName}`,
        accountNumber: account.accountNumber,
        previousBalance,
        depositedAmount: amount,
        fee: 0,
        newBalance,
        date: tx.date
      },
      account: publicAccount(account, true)
    });
  } catch (error) {
    next(error);
  }
});

// Module 6: Cash Withdrawal (₱100 - ₱20,000 per tx, ₱50,000 daily limit)
router.post('/withdraw', (req, res, next) => {
  try {
    const input = z.object({
      amount: z.number().positive('Withdrawal amount must be positive')
    }).parse(req.body);

    const amount = Number(input.amount.toFixed(2));
    if (amount < 100) {
      return res.status(400).json({ message: 'Minimum withdrawal is ₱100.00.' });
    }
    if (amount > 20000) {
      return res.status(400).json({ message: 'Maximum withdrawal is ₱20,000.00 per transaction.' });
    }

    const accounts = getAccounts();
    const accountIndex = accounts.findIndex((a) => a.id === req.account.id);
    if (accountIndex === -1) return res.status(404).json({ message: 'Account not found.' });

    const account = accounts[accountIndex];

    // Check available balance
    if (account.balance < amount) {
      return res.status(400).json({
        message: `Insufficient balance. Available: ${peso(account.balance)}, Requested: ${peso(amount)}.`
      });
    }

    // Calculate today's withdrawals for calendar day daily limit (₱50,000 max)
    const todayStr = new Date().toISOString().slice(0, 10);
    const transactions = getTransactions();
    let todayWithdrawn = 0;
    for (const t of transactions) {
      if (t.accountNumber === account.accountNumber && t.type === 'withdrawal' && t.status === 'successful') {
        if (t.date && t.date.slice(0, 10) === todayStr) {
          todayWithdrawn += t.amount;
        }
      }
    }

    const dailyLimit = 50000;
    const remainingDailyLimit = Math.max(0, dailyLimit - todayWithdrawn);

    if (amount > remainingDailyLimit) {
      return res.status(400).json({
        message: `Daily withdrawal limit exceeded! You have already withdrawn ${peso(todayWithdrawn)} today. Remaining daily limit: ${peso(remainingDailyLimit)}.`
      });
    }

    const previousBalance = account.balance;
    const newBalance = Number((previousBalance - amount).toFixed(2));
    account.balance = newBalance;

    accounts[accountIndex] = account;
    saveAccounts(accounts);

    const tx = {
      id: crypto.randomUUID(),
      accountNumber: account.accountNumber,
      type: 'withdrawal',
      amount,
      fee: 0,
      previousBalance,
      newBalance,
      status: 'successful',
      description: 'Cash Withdrawal',
      date: new Date().toISOString()
    };
    transactions.push(tx);
    saveTransactions(transactions);

    const updatedRemainingLimit = remainingDailyLimit - amount;

    res.status(200).json({
      message: 'Withdrawal successful!',
      receipt: {
        transactionId: tx.id,
        accountHolder: `${account.firstName} ${account.lastName}`,
        accountNumber: account.accountNumber,
        previousBalance,
        withdrawnAmount: amount,
        fee: 0,
        newBalance,
        remainingDailyLimit: updatedRemainingLimit,
        date: tx.date
      },
      account: publicAccount(account, true)
    });
  } catch (error) {
    next(error);
  }
});

// Module 7: Money Transfer (₱100 - ₱30,000, ₱15 fee)
router.post('/transfer', (req, res, next) => {
  try {
    const input = z.object({
      recipientAccountNumber: z.string().regex(/^\d{16}$/, 'Recipient account must be a 16-digit number'),
      amount: z.number().positive('Transfer amount must be positive')
    }).parse(req.body);

    const amount = Number(input.amount.toFixed(2));
    const fee = 15.00;
    const totalDeduction = Number((amount + fee).toFixed(2));

    if (amount < 100) {
      return res.status(400).json({ message: 'Minimum transfer amount is ₱100.00.' });
    }
    if (amount > 30000) {
      return res.status(400).json({ message: 'Maximum transfer amount is ₱30,000.00 per transaction.' });
    }

    if (input.recipientAccountNumber === req.account.accountNumber) {
      return res.status(400).json({ message: 'Cannot transfer money to your own account.' });
    }

    const accounts = getAccounts();
    const senderIndex = accounts.findIndex((a) => a.id === req.account.id);
    const recipientIndex = accounts.findIndex((a) => a.accountNumber === input.recipientAccountNumber);

    if (recipientIndex === -1) {
      return res.status(404).json({ message: 'Recipient account number does not exist.' });
    }

    const recipient = accounts[recipientIndex];
    if (recipient.status !== 'active') {
      return res.status(400).json({ message: 'Recipient account is inactive or suspended.' });
    }

    const sender = accounts[senderIndex];
    if (sender.balance < totalDeduction) {
      return res.status(400).json({
        message: `Insufficient funds. Transfer: ${peso(amount)} + Fee: ${peso(fee)} = Total: ${peso(totalDeduction)}. Your balance: ${peso(sender.balance)}.`
      });
    }

    const senderPrev = sender.balance;
    const senderNew = Number((senderPrev - totalDeduction).toFixed(2));
    sender.balance = senderNew;

    const recipientPrev = recipient.balance;
    const recipientNew = Number((recipientPrev + amount).toFixed(2));
    recipient.balance = recipientNew;

    accounts[senderIndex] = sender;
    accounts[recipientIndex] = recipient;
    saveAccounts(accounts);

    const now = new Date().toISOString();
    const transactions = getTransactions();

    const senderTx = {
      id: crypto.randomUUID(),
      accountNumber: sender.accountNumber,
      type: 'transfer',
      amount,
      fee,
      previousBalance: senderPrev,
      newBalance: senderNew,
      recipientAccount: recipient.accountNumber,
      recipientName: `${recipient.firstName} ${recipient.lastName}`,
      status: 'successful',
      description: `Transfer to ${recipient.firstName} ${recipient.lastName}`,
      date: now
    };

    const recipientTx = {
      id: crypto.randomUUID(),
      accountNumber: recipient.accountNumber,
      type: 'received_transfer',
      amount,
      fee: 0,
      previousBalance: recipientPrev,
      newBalance: recipientNew,
      senderAccount: sender.accountNumber,
      senderName: `${sender.firstName} ${sender.lastName}`,
      status: 'successful',
      description: `Received from ${sender.firstName} ${sender.lastName}`,
      date: now
    };

    transactions.push(senderTx);
    transactions.push(recipientTx);
    saveTransactions(transactions);

    res.status(200).json({
      message: 'Transfer completed successfully!',
      receipt: {
        transactionId: senderTx.id,
        recipientName: `${recipient.firstName} ${recipient.lastName}`,
        recipientAccount: recipient.accountNumber,
        transferAmount: amount,
        fee,
        totalDeduction,
        previousBalance: senderPrev,
        newBalance: senderNew,
        date: now
      },
      account: publicAccount(sender, true)
    });
  } catch (error) {
    next(error);
  }
});

// Module 8: Transaction History & Bonus Challenges B (Filtering) & C (Pagination)
router.get('/transactions', (req, res) => {
  const { type, page = 1, limit = 5 } = req.query;
  const allTransactions = getTransactions();
  const userAccountNumber = req.account.accountNumber;

  // Filter for logged-in user
  let userTx = [];
  let totalSuccessful = 0;
  let totalFailed = 0;
  let totalDeposits = 0;
  let totalWithdrawals = 0;
  let totalTransfersSent = 0;
  let totalTransfersReceived = 0;

  for (let i = 0; i < allTransactions.length; i++) {
    const t = allTransactions[i];
    if (t.accountNumber !== userAccountNumber) continue;

    if (t.status === 'successful') {
      totalSuccessful++;
      if (t.type === 'deposit') totalDeposits += t.amount;
      else if (t.type === 'withdrawal') totalWithdrawals += t.amount;
      else if (t.type === 'transfer') totalTransfersSent += t.amount;
      else if (t.type === 'received_transfer') totalTransfersReceived += t.amount;
    } else {
      totalFailed++;
    }

    // Apply type filter if provided
    if (type && type !== 'all') {
      if (type === 'transfer_all') {
        if (t.type !== 'transfer' && t.type !== 'received_transfer') continue;
      } else if (t.type !== type) {
        continue;
      }
    }

    userTx.push(t);
  }

  // Sort newest first
  userTx.sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalFiltered = userTx.length;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.max(1, parseInt(limit, 10) || 5);
  const totalPages = Math.ceil(totalFiltered / pageSize) || 1;
  const startIndex = (pageNum - 1) * pageSize;
  const paginated = userTx.slice(startIndex, startIndex + pageSize);

  res.json({
    transactions: paginated,
    pagination: {
      currentPage: pageNum,
      pageSize,
      totalItems: totalFiltered,
      totalPages,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1
    },
    analytics: {
      totalTransactions: totalSuccessful + totalFailed,
      totalSuccessful,
      totalFailed,
      totalDeposits,
      totalWithdrawals,
      totalTransfersSent,
      totalTransfersReceived
    }
  });
});

export default router;
