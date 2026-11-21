import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

export function makeId(prefix = 'TXN') {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function randomEightDigits() {
  return String(crypto.randomInt(10_000_000, 100_000_000));
}

export function generateAccountNumber(accounts) {
  let accountNumber = '';
  let exists = true;
  while (exists) {
    accountNumber = randomEightDigits() + randomEightDigits();
    exists = accounts.some((account) => account.accountNumber === accountNumber);
  }
  return accountNumber;
}

export function generateCardNumber() {
  // Demo-only card identifier. It is not issued by a card network.
  return randomEightDigits() + randomEightDigits();
}

export function cardExpiry() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 4);
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getFullYear()).slice(-2)}`;
}

export async function hashPin(pin) {
  return bcrypt.hash(pin, 12);
}

export async function verifyPin(pin, hash) {
  return bcrypt.compare(pin, hash);
}

export function publicAccount(account, includeCardNumber = false) {
  const card = account.virtualCard || {};
  return {
    id: account.id,
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
    virtualCard: {
      cardholder: card.cardholder,
      cardNumber: includeCardNumber ? card.cardNumber : `•••• •••• •••• ${String(card.cardNumber || '').slice(-4)}`,
      expiry: card.expiry,
      status: card.status,
      kind: 'LinkPay virtual demo card'
    }
  };
}
