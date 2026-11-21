# LinkPay — Mobile Banking Prototype

A React Native (Expo) mobile wallet with a Node.js/Express backend. The visual style uses a warm coffee palette and a minimal LinkPay mark.

> **Important:** LinkPay is an educational prototype. It does not connect to banks, card networks, GCash, Maya, or payment gateways. Balances and transfers are simulated. Do not use real personal information, real banking credentials, or real money.

## Project structure

```text
LinkPay/
├── client/                 # React Native / Expo mobile app
│   ├── App.js
│   ├── app.json
│   ├── package.json
│   └── src/
│       ├── api.js
│       ├── theme.js
│       └── components/
│           └── Logo.js
└── server/                 # Node.js API + local JSON persistence
    ├── src/
    │   ├── index.js
    │   ├── config.js
    │   ├── store.js
    │   ├── security.js
    │   ├── middleware/
    │   │   └── auth.js
    │   └── routes/
    │       ├── auth.js
    │       ├── wallet.js
    │       ├── account.js
    │       └── reports.js
    ├── data/
    │   ├── accounts.json
    │   └── transactions.json
    ├── .env.example
    └── package.json
```

## Requirements

- Node.js 20 or newer
- npm
- Web browser (Chrome, Edge, Firefox, Safari) OR Expo Go on a mobile phone / emulator

## 1. Start the backend

Open a terminal:

```bash
cd server
npm install
npm run dev
```

The API runs at `http://localhost:5000`. Test it by opening `http://localhost:5000/api/health`.

The JSON files in `server/data/` are created automatically if missing. Existing data is preserved when the server restarts.

## 2. Start the mobile app in your Web Browser

Open a second terminal:

```bash
cd client
npm run web
```

Alternatively:
```bash
npm run start
```
and press **`w`** in the terminal to open the app directly in your default web browser!

The app automatically connects to `http://localhost:5000/api` when accessed from the browser or iOS simulator, and `http://10.0.2.2:5000/api` when on an Android emulator.

## 3. Main features

- Register an account (18+, savings/checking, four-digit PIN)
- Login with 16-digit account number and PIN
- Persistent account and transaction records
- Wallet balance and balance visibility toggle
- Deposit (₱100–₱100,000)
- Withdraw (₱100–₱20,000 per transaction; ₱50,000 daily limit)
- Transfer (₱100–₱30,000; ₱15 fee)
- Transaction history
- Account profile and PIN change
- Virtual card with lock/unlock control
- Account deactivation when balance is zero
- Application-wide report endpoint protected by an admin key

## 4. API overview

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | API health |
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current account |
| GET | `/api/wallet` | Wallet summary |
| POST | `/api/wallet/deposit` | Deposit |
| POST | `/api/wallet/withdraw` | Withdraw |
| POST | `/api/wallet/transfer` | Transfer |
| GET | `/api/wallet/transactions` | Transaction history |
| GET | `/api/account/profile` | Account profile |
| PATCH | `/api/account/pin` | Change PIN |
| PATCH | `/api/account/card` | Lock/unlock virtual card |
| POST | `/api/account/deactivate` | Deactivate account |
| GET | `/api/reports` | Global report (admin key required) |

Protected routes require `Authorization: Bearer <token>`.

For the global report endpoint, send `x-admin-report-key` matching `ADMIN_REPORT_KEY` in the server `.env`.

## Security and prototype limitations

- PINs are hashed with bcryptjs; raw PINs are not stored.
- JWTs authenticate protected requests.
- Request bodies are validated with Zod.
- Helmet and rate limiting are enabled.
- The virtual card is a **simulated display card**. It is not a Visa/Mastercard and cannot be used to pay.
- The JSON file store is suitable only for local development and single-process demos. It is not safe for concurrent production banking traffic and has no database transaction guarantees.
- The app stores the session token in AsyncStorage for this prototype. For production, use secure device storage, a real database, audited authentication, KYC/AML controls, transaction ledgering, idempotency, monitoring, and regulatory review.
- Do not expose the server directly to the public internet.

## Suggested test flow

1. Register a new account with a valid date of birth, address, account type, and PIN.
2. Log in using the generated account number.
3. Deposit funds.
4. Withdraw funds.
5. Register a second account on another device/session.
6. Transfer funds between the accounts.
7. Review transaction history and virtual card.
8. Restart the backend and log in again to verify persistence.
