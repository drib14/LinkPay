import { Router } from 'express';
import { config } from '../config.js';
import { getAccounts, getTransactions } from '../store.js';

const router = Router();

router.get('/', (req, res) => {
  if (!config.adminReportKey || req.headers['x-admin-report-key'] !== config.adminReportKey) {
    return res.status(403).json({ message: 'Admin report access denied.' });
  }

  const accounts = getAccounts();
  const transactions = getTransactions();
  let savingsAccounts = 0;
  let checkingAccounts = 0;
  let totalMoney = 0;
  let highestBalance = null;
  let lowestBalance = null;
  let totalDeposits = 0;
  let totalWithdrawals = 0;
  let totalTransfers = 0;
  let transferFees = 0;
  let successfulTransactions = 0;
  let failedTransactions = 0;
  let highestTransaction = null;

  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    if (account.status === 'active') {
      totalMoney += account.balance;
      if (account.accountType === 'savings') savingsAccounts++;
      if (account.accountType === 'checking') checkingAccounts++;
    }
    if (!highestBalance || account.balance > highestBalance.balance) highestBalance = account;
    if (!lowestBalance || account.balance < lowestBalance.balance) lowestBalance = account;
  }

  for (let i = 0; i < transactions.length; i++) {
    const item = transactions[i];
    if (item.status === 'successful') successfulTransactions++;
    else failedTransactions++;
    if (item.type === 'deposit') totalDeposits += item.amount;
    if (item.type === 'withdrawal') totalWithdrawals += item.amount;
    if (item.type === 'transfer') {
      totalTransfers += item.amount;
      transferFees += item.fee || 0;
    }
    if (!highestTransaction || item.amount > highestTransaction.amount) highestTransaction = item;
  }

  res.json({
    totalRegisteredAccounts: accounts.length,
    savingsAccounts,
    checkingAccounts,
    totalMoneyHeld: Number(totalMoney.toFixed(2)),
    averageAccountBalance: accounts.length ? Number((totalMoney / accounts.length).toFixed(2)) : 0,
    successfulTransactions,
    failedTransactions,
    totalDeposits: Number(totalDeposits.toFixed(2)),
    totalWithdrawals: Number(totalWithdrawals.toFixed(2)),
    totalTransfers: Number(totalTransfers.toFixed(2)),
    totalTransferFees: Number(transferFees.toFixed(2)),
    highestBalanceAccount: highestBalance ? { accountNumber: highestBalance.accountNumber, name: `${highestBalance.firstName} ${highestBalance.lastName}`, balance: highestBalance.balance } : null,
    lowestBalanceAccount: lowestBalance ? { accountNumber: lowestBalance.accountNumber, name: `${lowestBalance.firstName} ${lowestBalance.lastName}`, balance: lowestBalance.balance } : null,
    highestTransaction: highestTransaction ? { id: highestTransaction.id, type: highestTransaction.type, amount: highestTransaction.amount, createdAt: highestTransaction.createdAt } : null,
    accountList: accounts.map((account, index) => ({
      number: index + 1,
      accountNumber: account.accountNumber,
      name: `${account.firstName} ${account.lastName}`,
      accountType: account.accountType,
      balance: account.balance,
      status: account.status
    }))
  });
});

export default router;
