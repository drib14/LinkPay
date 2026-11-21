import crypto from 'node:crypto';

export async function hashPin(pin) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(pin, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

export async function verifyPin(pin, storedHash) {
  return new Promise((resolve) => {
    if (!storedHash || !storedHash.includes(':')) return resolve(false);
    const [salt, key] = storedHash.split(':');
    crypto.scrypt(pin, salt, 64, (err, derivedKey) => {
      if (err) return resolve(false);
      try {
        const keyBuffer = Buffer.from(key, 'hex');
        resolve(crypto.timingSafeEqual(keyBuffer, derivedKey));
      } catch {
        resolve(false);
      }
    });
  });
}

/**
 * Generates unique 16-digit account number using two independently generated 8-digit segments.
 * Avoids crypto.randomInt 2^48 overflow issues.
 */
export function generateAccountNumber(existingAccounts = []) {
  while (true) {
    const segment1 = String(crypto.randomInt(10000000, 100000000));
    const segment2 = String(crypto.randomInt(10000000, 100000000));
    const candidate = `${segment1}${segment2}`;
    const exists = existingAccounts.some((acc) => acc.accountNumber === candidate);
    if (!exists) return candidate;
  }
}

/**
 * Generates 16-digit virtual card number (LinkPay Visa format starting with 4532)
 */
export function generateCardNumber() {
  const part1 = '4532';
  const part2 = String(crypto.randomInt(1000, 10000));
  const part3 = String(crypto.randomInt(1000, 10000));
  const part4 = String(crypto.randomInt(1000, 10000));
  return `${part1}${part2}${part3}${part4}`;
}

export function cardExpiry() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String((date.getFullYear() + 5) % 100).padStart(2, '0');
  return `${month}/${year}`;
}

export function publicAccount(acc, includeCard = true) {
  if (!acc) return null;
  const { pinHash, ...safe } = acc;
  if (!includeCard && safe.virtualCard) {
    const rawCard = safe.virtualCard.cardNumber || '';
    safe.virtualCard = {
      ...safe.virtualCard,
      maskedCardNumber: rawCard.length === 16 ? `•••• •••• •••• ${rawCard.slice(12)}` : rawCard
    };
  }
  return safe;
}
