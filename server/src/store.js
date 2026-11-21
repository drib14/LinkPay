import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

const accountsPath = path.join(config.dataDir, 'accounts.json');
const transactionsPath = path.join(config.dataDir, 'transactions.json');

function ensureFile(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '[]\n', 'utf8');
}

function readJson(filePath) {
  ensureFile(filePath);
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    throw new Error(`Unable to read valid JSON from ${filePath}`);
  }
}

function writeJson(filePath, data) {
  ensureFile(filePath);
  const temporaryPath = `${filePath}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(temporaryPath, filePath);
}

export function getAccounts() {
  return readJson(accountsPath);
}

export function saveAccounts(accounts) {
  writeJson(accountsPath, accounts);
}

export function getTransactions() {
  return readJson(transactionsPath);
}

export function saveTransactions(transactions) {
  writeJson(transactionsPath, transactions);
}

export function saveBankState(accounts, transactions) {
  // Write temp files first, then replace both data files.
  const accountTemp = `${accountsPath}.tmp`;
  const transactionTemp = `${transactionsPath}.tmp`;
  ensureFile(accountsPath);
  ensureFile(transactionsPath);
  fs.writeFileSync(accountTemp, JSON.stringify(accounts, null, 2), 'utf8');
  fs.writeFileSync(transactionTemp, JSON.stringify(transactions, null, 2), 'utf8');
  fs.renameSync(accountTemp, accountsPath);
  fs.renameSync(transactionTemp, transactionsPath);
}
