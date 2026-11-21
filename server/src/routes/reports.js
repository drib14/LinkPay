import { Router } from 'express';
import { config } from '../config.js';
import { getAccounts, getTransactions } from '../store.js';

const router = Router();

// Module 12: Application-Wide Reports & Analytics
const getReportsHandler = (req, res) => {
  const adminKey = req.headers['x-admin-report-key'];
  // Allow if admin header matches or if invoked internally
  if (adminKey && adminKey !== config.adminReportKey) {
    return res.status(403).json({ message: 'Unauthorized: Invalid admin report key.' });
  }

  const accounts = getAccounts();
  const transactions = getTransactions();

  // Account analytics
  let totalRegisteredAccounts = accounts.length;
  let totalSavingsAccounts = 0;
  let totalCheckingAccounts = 0;
  let totalActiveAccounts = 0;
  let totalLockedAccounts = 0;
  let totalDeactivatedAccounts = 0;
  let totalMoneyHeld = 0;

  let highestBalanceAccount = null;
  let lowestBalanceAccount = null;

  for (let i = 0; i < accounts.length; i++) {
    const acc = accounts[i];
    if (acc.accountType === 'savings') totalSavingsAccounts++;
    else if (acc.accountType === 'checking') totalCheckingAccounts++;

    if (acc.status === 'active') totalActiveAccounts++;
    else if (acc.status === 'locked') totalLockedAccounts++;
    else if (acc.status === 'deactivated') totalDeactivatedAccounts++;

    totalMoneyHeld += acc.balance || 0;

    if (!highestBalanceAccount || acc.balance > highestBalanceAccount.balance) {
      highestBalanceAccount = {
        accountNumber: acc.accountNumber,
        name: `${acc.firstName} ${acc.lastName}`,
        balance: acc.balance,
        accountType: acc.accountType
      };
    }
    if (!lowestBalanceAccount || acc.balance < lowestBalanceAccount.balance) {
      lowestBalanceAccount = {
        accountNumber: acc.accountNumber,
        name: `${acc.firstName} ${acc.lastName}`,
        balance: acc.balance,
        accountType: acc.accountType
      };
    }
  }

  const averageAccountBalance = totalRegisteredAccounts > 0 ? (totalMoneyHeld / totalRegisteredAccounts) : 0;

  // Transaction analytics
  let totalSuccessfulTransactions = 0;
  let totalFailedTransactions = 0;
  let totalDepositsProcessed = 0;
  let totalDepositAmount = 0;
  let totalWithdrawalsProcessed = 0;
  let totalWithdrawalAmount = 0;
  let totalTransfersProcessed = 0;
  let totalTransferAmount = 0;
  let totalTransferFeesCollected = 0;
  let highestTransaction = null;

  // Daily transaction report (Bonus E)
  const todayStr = new Date().toISOString().slice(0, 10);
  let todayCount = 0;
  let todayVolume = 0;

  for (let j = 0; j < transactions.length; j++) {
    const tx = transactions[j];

    if (tx.status === 'successful') {
      totalSuccessfulTransactions++;
      if (tx.type === 'deposit') {
        totalDepositsProcessed++;
        totalDepositAmount += tx.amount;
      } else if (tx.type === 'withdrawal') {
        totalWithdrawalsProcessed++;
        totalWithdrawalAmount += tx.amount;
      } else if (tx.type === 'transfer') {
        totalTransfersProcessed++;
        totalTransferAmount += tx.amount;
        totalTransferFeesCollected += (tx.fee || 0);
      }

      if (!highestTransaction || tx.amount > highestTransaction.amount) {
        highestTransaction = {
          id: tx.id,
          type: tx.type,
          amount: tx.amount,
          date: tx.date,
          accountNumber: tx.accountNumber
        };
      }

      if (tx.date && tx.date.slice(0, 10) === todayStr) {
        todayCount++;
        todayVolume += tx.amount;
      }
    } else {
      totalFailedTransactions++;
    }
  }

  // Account directory numbered list
  const accountDirectory = accounts.map((a, idx) => ({
    index: idx + 1,
    accountNumber: a.accountNumber,
    name: `${a.firstName} ${a.lastName}`,
    accountType: a.accountType,
    balance: a.balance,
    status: a.status,
    createdAt: a.createdAt
  }));

  res.json({
    generatedAt: new Date().toISOString(),
    accountsSummary: {
      totalRegisteredAccounts,
      totalSavingsAccounts,
      totalCheckingAccounts,
      totalActiveAccounts,
      totalLockedAccounts,
      totalDeactivatedAccounts,
      totalMoneyHeld: Number(totalMoneyHeld.toFixed(2)),
      averageAccountBalance: Number(averageAccountBalance.toFixed(2)),
      highestBalanceAccount,
      lowestBalanceAccount
    },
    transactionsSummary: {
      totalSuccessfulTransactions,
      totalFailedTransactions,
      totalDepositsProcessed,
      totalDepositAmount: Number(totalDepositAmount.toFixed(2)),
      totalWithdrawalsProcessed,
      totalWithdrawalAmount: Number(totalWithdrawalAmount.toFixed(2)),
      totalTransfersProcessed,
      totalTransferAmount: Number(totalTransferAmount.toFixed(2)),
      totalTransferFeesCollected: Number(totalTransferFeesCollected.toFixed(2)),
      highestTransaction
    },
    dailyReport: {
      date: todayStr,
      todaySuccessfulCount: todayCount,
      todayVolume: Number(todayVolume.toFixed(2))
    },
    accountDirectory
  });
};

router.get('/', getReportsHandler);
router.get('/reports', getReportsHandler);

export default router;
