import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '..', 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const accountsFile = path.join(dataDir, 'accounts.json');
const transactionsFile = path.join(dataDir, 'transactions.json');

function initFile(file) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify([], null, 2), 'utf-8');
  }
}

initFile(accountsFile);
initFile(transactionsFile);

export function getAccounts() {
  try {
    const raw = fs.readFileSync(accountsFile, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveAccounts(accounts) {
  fs.writeFileSync(accountsFile, JSON.stringify(accounts, null, 2), 'utf-8');
}

export function getTransactions() {
  try {
    const raw = fs.readFileSync(transactionsFile, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveTransactions(transactions) {
  fs.writeFileSync(transactionsFile, JSON.stringify(transactions, null, 2), 'utf-8');
}
