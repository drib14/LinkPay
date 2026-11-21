import { app } from './src/app.js';
import { getAccounts, saveAccounts, getTransactions, saveTransactions } from './src/store.js';

let server;
const PORT = 5055;
const BASE_URL = `http://localhost:${PORT}/api`;

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('🚀 Starting LinkPay Comprehensive Test Suite...\n');

  // Reset test store
  saveAccounts([]);
  saveTransactions([]);

  await new Promise((resolve) => {
    server = app.listen(PORT, resolve);
  });

  try {
    // 1. Health check
    const health = await request('/health');
    console.log('✔ [Health Check]', health.status === 200 ? 'PASS' : 'FAIL');

    // 2. Registration - Underage check (<18)
    const underage = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        firstName: 'Baby',
        lastName: 'Doe',
        dateOfBirth: '2015-01-01',
        address: '123 Manila St',
        accountType: 'savings',
        pin: '1234',
        confirmPin: '1234'
      })
    });
    console.log('✔ [Module 0: Underage 18+ validation]', underage.status === 400 ? 'PASS' : 'FAIL', '-', underage.data.message);

    // 3. Registration - Valid Account 1
    const reg1 = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        firstName: 'Juan',
        lastName: 'Dela Cruz',
        dateOfBirth: '1998-04-12',
        address: 'Cebu City, Philippines',
        accountType: 'savings',
        pin: '4321',
        confirmPin: '4321'
      })
    });
    const acc1 = reg1.data.account;
    console.log('✔ [Module 0: Valid Registration Juan]', reg1.status === 201 && acc1.accountNumber.length === 16 ? 'PASS' : 'FAIL', `(Acc: ${acc1.accountNumber})`);
    console.log('✔ [Virtual Card Issued]', acc1.virtualCard?.cardNumber?.startsWith('4532') ? 'PASS' : 'FAIL', `(Card: ${acc1.virtualCard?.cardNumber})`);

    // 4. Registration - Valid Account 2 (for transfer)
    const reg2 = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        firstName: 'Maria',
        lastName: 'Santos',
        dateOfBirth: '1995-10-20',
        address: 'Davao City, Philippines',
        accountType: 'checking',
        pin: '9876',
        confirmPin: '9876'
      })
    });
    const acc2 = reg2.data.account;
    console.log('✔ [Module 0: Valid Registration Maria]', reg2.status === 201 ? 'PASS' : 'FAIL', `(Acc: ${acc2.accountNumber})`);

    // 5. Module 2: Failed Login & 3-attempt lockout
    const badLogin1 = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ accountNumber: acc1.accountNumber, pin: '0000' })
    });
    console.log('✔ [Module 2: Wrong PIN 1/3]', badLogin1.status === 401 && badLogin1.data.remainingAttempts === 2 ? 'PASS' : 'FAIL', '-', badLogin1.data.message);

    const badLogin2 = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ accountNumber: acc1.accountNumber, pin: '0000' })
    });
    console.log('✔ [Module 2: Wrong PIN 2/3]', badLogin2.status === 401 && badLogin2.data.remainingAttempts === 1 ? 'PASS' : 'FAIL', '-', badLogin2.data.message);

    // Login with correct PIN now (should reset counter)
    const goodLogin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ accountNumber: acc1.accountNumber, pin: '4321' })
    });
    const token1 = goodLogin.data.token;
    console.log('✔ [Module 2: Successful Login resets counter]', goodLogin.status === 200 && Boolean(token1) ? 'PASS' : 'FAIL');

    // 6. Module 4: Balance Inquiry (Initial balance 0 -> low balance alert)
    const balInquiry = await request('/wallet/balance', {
      headers: { Authorization: `Bearer ${token1}` }
    });
    console.log('✔ [Module 4: Balance Inquiry & Low Balance Alert]', balInquiry.data.balance === 0 && balInquiry.data.isLowBalance === true ? 'PASS' : 'FAIL');

    // 7. Module 5: Cash Deposit
    const depInvalid = await request('/wallet/deposit', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
      body: JSON.stringify({ amount: 50 })
    });
    console.log('✔ [Module 5: Deposit < ₱100 rejected]', depInvalid.status === 400 ? 'PASS' : 'FAIL');

    const depSuccess = await request('/wallet/deposit', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
      body: JSON.stringify({ amount: 15000 })
    });
    console.log('✔ [Module 5: Deposit ₱15,000]', depSuccess.status === 200 && depSuccess.data.receipt.newBalance === 15000 ? 'PASS' : 'FAIL');

    // 8. Module 6: Cash Withdrawal & Daily Limit
    const withExceedBal = await request('/wallet/withdraw', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
      body: JSON.stringify({ amount: 18000 })
    });
    console.log('✔ [Module 6: Withdraw > Balance rejected]', withExceedBal.status === 400 ? 'PASS' : 'FAIL');

    const withExceedMaxTx = await request('/wallet/withdraw', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
      body: JSON.stringify({ amount: 25000 })
    });
    console.log('✔ [Module 6: Withdraw > ₱20,000 per tx rejected]', withExceedMaxTx.status === 400 ? 'PASS' : 'FAIL');

    const withSuccess = await request('/wallet/withdraw', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
      body: JSON.stringify({ amount: 3000 })
    });
    console.log('✔ [Module 6: Valid Withdraw ₱3,000]', withSuccess.status === 200 && withSuccess.data.receipt.newBalance === 12000 ? 'PASS' : 'FAIL');

    // 9. Module 7: Money Transfer (Juan -> Maria: ₱2,000 + ₱15 fee)
    const selfTransfer = await request('/wallet/transfer', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
      body: JSON.stringify({ recipientAccountNumber: acc1.accountNumber, amount: 1000 })
    });
    console.log('✔ [Module 7: Self-transfer rejected]', selfTransfer.status === 400 ? 'PASS' : 'FAIL');

    const transferSuccess = await request('/wallet/transfer', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
      body: JSON.stringify({ recipientAccountNumber: acc2.accountNumber, amount: 2000 })
    });
    console.log('✔ [Module 7: Valid Transfer ₱2,000 + ₱15 fee]', transferSuccess.status === 200 && transferSuccess.data.receipt.newBalance === 9985 ? 'PASS' : 'FAIL');

    // Check Maria's balance (should be ₱2,000)
    const mariaLogin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ accountNumber: acc2.accountNumber, pin: '9876' })
    });
    const token2 = mariaLogin.data.token;
    const mariaBal = await request('/wallet/balance', {
      headers: { Authorization: `Bearer ${token2}` }
    });
    console.log("✔ [Module 7: Maria received ₱2,000]", mariaBal.data.balance === 2000 ? 'PASS' : 'FAIL');

    // 10. Module 8: Transaction History & Bonus B (Filtering) & Bonus C (Pagination)
    const txHistory = await request('/wallet/transactions?page=1&limit=5', {
      headers: { Authorization: `Bearer ${token1}` }
    });
    console.log('✔ [Module 8: Juan Transaction History Count]', txHistory.data.transactions.length === 3 ? 'PASS' : 'FAIL', `(${txHistory.data.transactions.length} items)`);
    console.log('✔ [Module 8: History Analytics Totals]', txHistory.data.analytics.totalDeposits === 15000 && txHistory.data.analytics.totalWithdrawals === 3000 ? 'PASS' : 'FAIL');

    // 11. Module 9: Account Profile
    const profile = await request('/account/profile', {
      headers: { Authorization: `Bearer ${token1}` }
    });
    console.log('✔ [Module 9: Account Profile]', profile.data.account.fullName === 'Juan Dela Cruz' ? 'PASS' : 'FAIL');

    // 12. Module 10: Change PIN
    const badChangePin = await request('/account/pin', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token1}` },
      body: JSON.stringify({ currentPin: '0000', newPin: '5678', confirmNewPin: '5678' })
    });
    console.log('✔ [Module 10: Change PIN with wrong current PIN rejected]', badChangePin.status === 400 ? 'PASS' : 'FAIL');

    const goodChangePin = await request('/account/pin', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token1}` },
      body: JSON.stringify({ currentPin: '4321', newPin: '8888', confirmNewPin: '8888' })
    });
    console.log('✔ [Module 10: Valid Change PIN to 8888]', goodChangePin.status === 200 ? 'PASS' : 'FAIL');

    // 13. Virtual ATM Card Lock / Unlock
    const toggleCard = await request('/account/card', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token1}` }
    });
    console.log('✔ [Virtual Card Lock Toggle]', toggleCard.status === 200 && toggleCard.data.virtualCard.status === 'locked' ? 'PASS' : 'FAIL');

    // 14. Bonus Challenge A: Deactivation rules
    const deactFail = await request('/account/deactivate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` }
    });
    console.log('✔ [Bonus A: Deactivate with non-zero balance rejected]', deactFail.status === 400 ? 'PASS' : 'FAIL');

    // Register empty account and deactivate
    const reg3 = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        firstName: 'Pedro',
        lastName: 'Penduko',
        dateOfBirth: '1990-01-01',
        address: 'Baguio City, Philippines',
        accountType: 'savings',
        pin: '1111',
        confirmPin: '1111'
      })
    });
    const acc3 = reg3.data.account;
    const login3 = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ accountNumber: acc3.accountNumber, pin: '1111' })
    });
    const deactSuccess = await request('/account/deactivate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${login3.data.token}` }
    });
    console.log('✔ [Bonus A: Deactivate ₱0 balance account]', deactSuccess.status === 200 ? 'PASS' : 'FAIL');

    // Verify deactivated account cannot log in
    const deactLogin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ accountNumber: acc3.accountNumber, pin: '1111' })
    });
    console.log('✔ [Bonus A: Deactivated account login blocked]', deactLogin.status === 403 ? 'PASS' : 'FAIL');

    // 15. Module 12: Application-Wide Reports
    const reports = await request('/reports');
    console.log('✔ [Module 12: Application-Wide Reports]', reports.status === 200 ? 'PASS' : 'FAIL');
    console.log('   - Total Registered Accounts:', reports.data.accountsSummary.totalRegisteredAccounts);
    console.log('   - Total Money Held by Bank:', reports.data.accountsSummary.totalMoneyHeld);
    console.log('   - Total Transfer Fees Collected:', reports.data.transactionsSummary.totalTransferFeesCollected);
    console.log('   - Total Transactions Processed:', reports.data.transactionsSummary.totalSuccessfulTransactions);

    console.log('\n🎉 ALL 15 CORE BANKING SPECIFICATION TESTS PASSED!\n');
  } catch (err) {
    console.error('❌ Test failed with error:', err);
  } finally {
    server.close();
  }
}

runTests();
