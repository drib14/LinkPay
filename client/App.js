import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Award,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Coffee,
  CreditCard,
  Eye,
  EyeOff,
  History,
  House,
  Lock,
  LockKeyhole,
  LogOut,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Unlock,
  UserCheck,
  UserMinus,
  UserRound,
  Wallet,
  X
} from 'lucide-react-native';
import { apiRequest, saveToken, clearToken, getToken } from './src/api';
import { colors, shadow, cardShadow } from './src/theme';
import Logo from './src/components/Logo';

const peso = (val) =>
  `₱${Number(val || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

const formatDate = (isoString) => {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
};

function formatCardNumber(num) {
  if (!num) return '•••• •••• •••• ••••';
  const clean = num.replace(/\s+/g, '');
  return clean.replace(/(\d{4})/g, '$1 ').trim();
}

function MainBankingApp() {
  const [screen, setScreen] = useState('loading');
  const [account, setAccount] = useState(null);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successReceipt, setSuccessReceipt] = useState(null);

  // Auth Inputs
  const [loginNumber, setLoginNumber] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [regForm, setRegForm] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    address: '',
    accountType: 'savings',
    pin: '',
    confirmPin: ''
  });

  // Wallet Inputs
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [transferRecipient, setTransferRecipient] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [recipientPreview, setRecipientPreview] = useState(null);

  // PIN Change Inputs
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');

  // Transactions State
  const [transactions, setTransactions] = useState([]);
  const [txFilter, setTxFilter] = useState('all');
  const [txPage, setTxPage] = useState(1);
  const [txPagination, setTxPagination] = useState(null);
  const [txAnalytics, setTxAnalytics] = useState(null);

  // Reports State
  const [reportsData, setReportsData] = useState(null);

  // Check login on startup
  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const res = await apiRequest('/auth/me');
          setAccount(res.account);
          await loadTransactions();
          setScreen('home');
        } else {
          setScreen('welcome');
        }
      } catch {
        await clearToken();
        setScreen('welcome');
      }
    })();
  }, []);

  async function loadTransactions(filter = txFilter, page = 1) {
    try {
      const typeParam = filter !== 'all' ? `&type=${filter}` : '';
      const data = await apiRequest(`/wallet/transactions?page=${page}&limit=5${typeParam}`);
      setTransactions(data.transactions || []);
      setTxPagination(data.pagination || null);
      setTxAnalytics(data.analytics || null);
      setTxPage(page);
    } catch (e) {
      console.warn('Failed to load transactions:', e.message);
    }
  }

  async function refreshAccount() {
    try {
      const res = await apiRequest('/auth/me');
      setAccount(res.account);
    } catch {}
  }

  async function handleLogin() {
    if (!/^\d{16}$/.test(loginNumber)) {
      Alert.alert('Invalid Account Number', 'Please enter your 16-digit account number.');
      return;
    }
    if (!/^\d{4}$/.test(loginPin)) {
      Alert.alert('Invalid PIN', 'Please enter your 4-digit PIN.');
      return;
    }

    setBusy(true);
    setErrorMessage('');
    try {
      const res = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ accountNumber: loginNumber, pin: loginPin })
      });
      await saveToken(res.token);
      setAccount(res.account);
      setLoginPin('');
      await loadTransactions();
      setScreen('home');
    } catch (err) {
      setErrorMessage(err.message);
      Alert.alert('Login Failed', err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister() {
    const { firstName, lastName, dateOfBirth, address, accountType, pin, confirmPin } = regForm;
    if (!firstName || !lastName) {
      return Alert.alert('Missing Name', 'Please enter both first name and last name.');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
      return Alert.alert('Invalid Birthdate', 'Please enter your birthdate in YYYY-MM-DD format.');
    }
    if (!address || address.length < 5) {
      return Alert.alert('Invalid Address', 'Please enter a valid address (at least 5 characters).');
    }
    if (!/^\d{4}$/.test(pin)) {
      return Alert.alert('Invalid PIN', 'PIN must be exactly 4 digits.');
    }
    if (pin !== confirmPin) {
      return Alert.alert('PIN Mismatch', 'PIN and confirmation do not match.');
    }

    setBusy(true);
    try {
      const res = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(regForm)
      });
      Alert.alert(
        'Account Created! ☕',
        `Your 16-digit Account Number is:\n\n${res.account.accountNumber}\n\nPlease save this number to login.`,
        [
          {
            text: 'Proceed to Login',
            onPress: () => {
              setLoginNumber(res.account.accountNumber);
              setScreen('login');
            }
          }
        ]
      );
    } catch (err) {
      Alert.alert('Registration Failed', err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeposit() {
    const num = parseFloat(depositAmount);
    if (isNaN(num) || num < 100 || num > 100000) {
      return Alert.alert('Invalid Amount', 'Deposit amount must be between ₱100.00 and ₱100,000.00.');
    }

    setBusy(true);
    try {
      const res = await apiRequest('/wallet/deposit', {
        method: 'POST',
        body: JSON.stringify({ amount: num })
      });
      setAccount(res.account);
      setDepositAmount('');
      setSuccessReceipt({
        title: 'Cash Deposit Successful',
        type: 'deposit',
        amount: num,
        newBalance: res.receipt.newBalance,
        ref: res.receipt.transactionId,
        date: res.receipt.date
      });
      await loadTransactions();
    } catch (err) {
      Alert.alert('Deposit Failed', err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleWithdraw() {
    const num = parseFloat(withdrawAmount);
    if (isNaN(num) || num < 100 || num > 20000) {
      return Alert.alert('Invalid Amount', 'Withdrawal amount must be between ₱100.00 and ₱20,000.00.');
    }
    if (account.balance < num) {
      return Alert.alert('Insufficient Balance', `Your current balance is ${peso(account.balance)}.`);
    }

    setBusy(true);
    try {
      const res = await apiRequest('/wallet/withdraw', {
        method: 'POST',
        body: JSON.stringify({ amount: num })
      });
      setAccount(res.account);
      setWithdrawAmount('');
      setSuccessReceipt({
        title: 'Cash Withdrawal Successful',
        type: 'withdrawal',
        amount: num,
        newBalance: res.receipt.newBalance,
        ref: res.receipt.transactionId,
        date: res.receipt.date,
        extra: `Remaining Daily Limit: ${peso(res.receipt.remainingDailyLimit)}`
      });
      await loadTransactions();
    } catch (err) {
      Alert.alert('Withdrawal Failed', err.message);
    } finally {
      setBusy(false);
    }
  }

  async function searchRecipient(accNum) {
    setTransferRecipient(accNum);
    if (accNum.length === 16) {
      try {
        const res = await apiRequest(`/account/search?q=${accNum}`);
        if (res.results && res.results.length > 0) {
          setRecipientPreview(res.results[0]);
        } else {
          setRecipientPreview(null);
        }
      } catch {
        setRecipientPreview(null);
      }
    } else {
      setRecipientPreview(null);
    }
  }

  async function handleTransfer() {
    const num = parseFloat(transferAmount);
    if (!/^\d{16}$/.test(transferRecipient)) {
      return Alert.alert('Invalid Recipient', 'Please enter a valid 16-digit recipient account number.');
    }
    if (isNaN(num) || num < 100 || num > 30000) {
      return Alert.alert('Invalid Amount', 'Transfer amount must be between ₱100.00 and ₱30,000.00.');
    }
    const totalDeduction = num + 15;
    if (account.balance < totalDeduction) {
      return Alert.alert(
        'Insufficient Funds',
        `Transfer amount (${peso(num)}) + ₱15.00 transfer fee = ${peso(totalDeduction)}. Your current balance is ${peso(account.balance)}.`
      );
    }

    setBusy(true);
    try {
      const res = await apiRequest('/wallet/transfer', {
        method: 'POST',
        body: JSON.stringify({
          recipientAccountNumber: transferRecipient,
          amount: num
        })
      });
      setAccount(res.account);
      setTransferAmount('');
      setTransferRecipient('');
      setRecipientPreview(null);
      setSuccessReceipt({
        title: 'Transfer Completed',
        type: 'transfer',
        amount: num,
        fee: 15.0,
        totalDeduction: res.receipt.totalDeduction,
        recipientName: res.receipt.recipientName,
        recipientAccount: res.receipt.recipientAccount,
        newBalance: res.receipt.newBalance,
        ref: res.receipt.transactionId,
        date: res.receipt.date
      });
      await loadTransactions();
    } catch (err) {
      Alert.alert('Transfer Failed', err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleChangePin() {
    if (!/^\d{4}$/.test(currentPin)) {
      return Alert.alert('Invalid PIN', 'Current PIN must be 4 digits.');
    }
    if (!/^\d{4}$/.test(newPin)) {
      return Alert.alert('Invalid PIN', 'New PIN must be 4 digits.');
    }
    if (newPin !== confirmNewPin) {
      return Alert.alert('Mismatch', 'New PIN confirmation does not match.');
    }
    if (newPin === currentPin) {
      return Alert.alert('Identical PIN', 'New PIN must be different from your current PIN.');
    }

    setBusy(true);
    try {
      const res = await apiRequest('/account/pin', {
        method: 'PUT',
        body: JSON.stringify({ currentPin, newPin, confirmNewPin })
      });
      Alert.alert('Success', res.message);
      setCurrentPin('');
      setNewPin('');
      setConfirmNewPin('');
      setScreen('home');
    } catch (err) {
      Alert.alert('PIN Change Failed', err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleCard() {
    setBusy(true);
    try {
      const res = await apiRequest('/account/card', { method: 'PUT' });
      setAccount(res.account);
      Alert.alert(
        res.account.virtualCard.status === 'locked' ? 'Virtual Card Locked 🔒' : 'Virtual Card Active ☕',
        res.message
      );
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeactivate() {
    if (account.balance > 0) {
      return Alert.alert(
        'Cannot Deactivate',
        `Your account has a remaining balance of ${peso(account.balance)}. Module rules strictly require a ₱0.00 balance before deactivating. Please withdraw or transfer all funds.`
      );
    }

    Alert.alert(
      'Confirm Deactivation',
      'Are you sure you want to deactivate your LinkPay account? You will no longer be able to log in, but your transaction records will remain archived.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate Account',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await apiRequest('/account/deactivate', { method: 'POST' });
              await clearToken();
              setAccount(null);
              Alert.alert('Account Deactivated', 'Your LinkPay account has been closed.');
              setScreen('welcome');
            } catch (err) {
              Alert.alert('Failed', err.message);
            } finally {
              setBusy(false);
            }
          }
        }
      ]
    );
  }

  async function handleLogout() {
    Alert.alert('Logout Session', 'Are you sure you want to end your LinkPay session?', [
      { text: 'Stay Logged In', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await clearToken();
          setAccount(null);
          setScreen('welcome');
        }
      }
    ]);
  }

  async function loadSystemReports() {
    setBusy(true);
    try {
      const res = await apiRequest('/reports');
      setReportsData(res);
      setScreen('reports');
    } catch (err) {
      Alert.alert('Reports Error', err.message);
    } finally {
      setBusy(false);
    }
  }

  if (screen === 'loading') {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Logo size="large" />
        <ActivityIndicator color={colors.coffee} size="large" style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar style="dark" />

      {/* Screen 1: Welcome Screen */}
      {screen === 'welcome' && (
        <View style={styles.welcomeContainer}>
          <View style={styles.welcomeHero}>
            <Logo size="large" />
            <Text style={styles.welcomeSubhead}>
              Your fast, simple, and delightfully warm Philippine mobile wallet.
            </Text>

            <View style={[styles.welcomeCardSample, cardShadow]}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardBrand}>LinkPay</Text>
                <CreditCard color={colors.caramel} size={20} />
              </View>
              <Text style={styles.cardSampleNum}>•••• •••• •••• 2026</Text>
              <View style={styles.cardBottomRow}>
                <View>
                  <Text style={styles.cardLabelSmall}>VIRTUAL WALLET</Text>
                  <Text style={styles.cardValueSmall}>PHILIPPINES</Text>
                </View>
                <View style={styles.chipGraphic} />
              </View>
            </View>
          </View>

          <View style={styles.welcomeButtons}>
            <TouchableOpacity
              style={[styles.btnPrimary, shadow]}
              onPress={() => setScreen('login')}
              activeOpacity={0.85}
            >
              <Text style={styles.btnPrimaryText}>Login to Account</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() => setScreen('register')}
              activeOpacity={0.85}
            >
              <Text style={styles.btnSecondaryText}>Open New Bank Account</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ marginTop: 12, padding: 8, alignItems: 'center' }}
              onPress={loadSystemReports}
            >
              <Text style={{ color: colors.coffeeLight, fontSize: 12, fontWeight: '700' }}>
                View Bank System Reports (Module 12)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Screen 2: Login */}
      {screen === 'login' && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.authScroll}>
            <TouchableOpacity style={styles.backPill} onPress={() => setScreen('welcome')}>
              <Text style={styles.backPillText}>← Back</Text>
            </TouchableOpacity>

            <View style={{ alignItems: 'center', marginTop: 16, marginBottom: 24 }}>
              <Logo size="medium" />
              <Text style={styles.screenHeading}>Account Login</Text>
              <Text style={styles.screenSub}>Enter your 16-digit account number & 4-digit PIN</Text>
            </View>

            {errorMessage ? (
              <View style={styles.errorAlert}>
                <ShieldAlert color={colors.red} size={18} />
                <Text style={styles.errorAlertText}>{errorMessage}</Text>
              </View>
            ) : null}

            <View style={[styles.formCard, shadow]}>
              <Text style={styles.fieldLabel}>16-Digit Account Number</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 1234567890123456"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
                maxLength={16}
                value={loginNumber}
                onChangeText={setLoginNumber}
              />

              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>4-Digit Account PIN</Text>
              <TextInput
                style={[styles.input, { letterSpacing: 8, fontSize: 18 }]}
                placeholder="••••"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
                secureTextEntry
                maxLength={4}
                value={loginPin}
                onChangeText={setLoginPin}
              />

              <TouchableOpacity
                style={[styles.btnPrimary, { marginTop: 24 }]}
                onPress={handleLogin}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.btnPrimaryText}>Secure Login</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.securityNoteRow}>
              <LockKeyhole color={colors.coffeeLight} size={15} />
              <Text style={styles.securityNoteText}>
                Protection active: 3 consecutive failed attempts will lock the account.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* Screen 3: Register */}
      {screen === 'register' && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.authScroll}>
            <TouchableOpacity style={styles.backPill} onPress={() => setScreen('welcome')}>
              <Text style={styles.backPillText}>← Back</Text>
            </TouchableOpacity>

            <View style={{ alignItems: 'center', marginTop: 12, marginBottom: 20 }}>
              <Logo size="small" />
              <Text style={styles.screenHeading}>Open LinkPay Account</Text>
              <Text style={styles.screenSub}>Module 0: Setup & Registration (Min. 18 years old)</Text>
            </View>

            <View style={[styles.formCard, shadow]}>
              <View style={styles.rowTwo}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.fieldLabel}>First Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Juan"
                    placeholderTextColor={colors.muted}
                    value={regForm.firstName}
                    onChangeText={(t) => setRegForm({ ...regForm, firstName: t })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Last Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Dela Cruz"
                    placeholderTextColor={colors.muted}
                    value={regForm.lastName}
                    onChangeText={(t) => setRegForm({ ...regForm, lastName: t })}
                  />
                </View>
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Date of Birth (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                placeholder="2000-05-15"
                placeholderTextColor={colors.muted}
                value={regForm.dateOfBirth}
                onChangeText={(t) => setRegForm({ ...regForm, dateOfBirth: t })}
              />

              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Home Address</Text>
              <TextInput
                style={styles.input}
                placeholder="Cebu City, Philippines"
                placeholderTextColor={colors.muted}
                value={regForm.address}
                onChangeText={(t) => setRegForm({ ...regForm, address: t })}
              />

              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Account Type</Text>
              <View style={styles.accountTypeRow}>
                <TouchableOpacity
                  style={[
                    styles.typeChip,
                    regForm.accountType === 'savings' && styles.typeChipActive
                  ]}
                  onPress={() => setRegForm({ ...regForm, accountType: 'savings' })}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      regForm.accountType === 'savings' && styles.typeChipTextActive
                    ]}
                  >
                    Savings Account
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeChip,
                    regForm.accountType === 'checking' && styles.typeChipActive
                  ]}
                  onPress={() => setRegForm({ ...regForm, accountType: 'checking' })}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      regForm.accountType === 'checking' && styles.typeChipTextActive
                    ]}
                  >
                    Checking Account
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.rowTwo}>
                <View style={{ flex: 1, marginRight: 8, marginTop: 14 }}>
                  <Text style={styles.fieldLabel}>4-Digit PIN</Text>
                  <TextInput
                    style={[styles.input, { letterSpacing: 4, textAlign: 'center' }]}
                    placeholder="••••"
                    placeholderTextColor={colors.muted}
                    keyboardType="numeric"
                    secureTextEntry
                    maxLength={4}
                    value={regForm.pin}
                    onChangeText={(t) => setRegForm({ ...regForm, pin: t })}
                  />
                </View>
                <View style={{ flex: 1, marginTop: 14 }}>
                  <Text style={styles.fieldLabel}>Confirm PIN</Text>
                  <TextInput
                    style={[styles.input, { letterSpacing: 4, textAlign: 'center' }]}
                    placeholder="••••"
                    placeholderTextColor={colors.muted}
                    keyboardType="numeric"
                    secureTextEntry
                    maxLength={4}
                    value={regForm.confirmPin}
                    onChangeText={(t) => setRegForm({ ...regForm, confirmPin: t })}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.btnPrimary, { marginTop: 22 }]}
                onPress={handleRegister}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.btnPrimaryText}>Create Account & Issue Card</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* Screen 4: Home / Dashboard */}
      {screen === 'home' && account && (
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.homeScroll}>
            {/* Top Bar */}
            <View style={styles.dashboardHeader}>
              <View>
                <Text style={styles.greetingSub}>WELCOME BACK</Text>
                <Text style={styles.greetingName}>
                  {account.firstName} {account.lastName}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={styles.headerIconBtn}
                  onPress={loadSystemReports}
                  title="System Reports"
                >
                  <BarChart3 color={colors.coffeeDark} size={18} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerIconBtn} onPress={handleLogout}>
                  <LogOut color={colors.red} size={18} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Low Balance Warning (Module 4) */}
            {account.balance < 1000 && (
              <View style={styles.lowBalanceBanner}>
                <ShieldAlert color={colors.red} size={18} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.lowBalanceTitle}>Low Balance Warning</Text>
                  <Text style={styles.lowBalanceDesc}>
                    Your balance is below ₱1,000.00. Consider cashing in to avoid service interruptions.
                  </Text>
                </View>
              </View>
            )}

            {/* Balance Card (GCash / Maya style) */}
            <View style={[styles.mainBalanceCard, cardShadow]}>
              <View style={styles.balanceCardTop}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Wallet color={colors.caramel} size={16} />
                  <Text style={styles.balanceCardLabel}>LINKPAY AVAILABLE BALANCE</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setBalanceVisible(!balanceVisible)}
                  style={styles.eyeBtn}
                >
                  {balanceVisible ? (
                    <Eye color="#E8DCCE" size={17} />
                  ) : (
                    <EyeOff color="#E8DCCE" size={17} />
                  )}
                </TouchableOpacity>
              </View>

              <Text style={styles.balanceCardValue}>
                {balanceVisible ? peso(account.balance) : '₱ ••••••'}
              </Text>

              <View style={styles.balanceCardBottom}>
                <View>
                  <Text style={styles.accountTypeBadge}>
                    {account.accountType.toUpperCase()} ACCOUNT
                  </Text>
                  <Text style={styles.accountNumberDisplay}>
                    ACC: {account.accountNumber.slice(0, 4)} •••• •••• {account.accountNumber.slice(12)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={refreshAccount}
                  style={{ padding: 4 }}
                  activeOpacity={0.7}
                >
                  <RefreshCw color={colors.caramel} size={15} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Actions (GCash / Maya 4-icon grid) */}
            <View style={styles.actionGridContainer}>
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => setScreen('deposit')}
                activeOpacity={0.8}
              >
                <View style={[styles.actionIconBox, { backgroundColor: colors.paleGreen }]}>
                  <ArrowDownLeft color={colors.green} size={22} strokeWidth={2.5} />
                </View>
                <Text style={styles.actionLabel}>Cash In</Text>
                <Text style={styles.actionSub}>Deposit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => setScreen('withdraw')}
                activeOpacity={0.8}
              >
                <View style={[styles.actionIconBox, { backgroundColor: colors.paleRed }]}>
                  <ArrowUpRight color={colors.red} size={22} strokeWidth={2.5} />
                </View>
                <Text style={styles.actionLabel}>Cash Out</Text>
                <Text style={styles.actionSub}>Withdraw</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => setScreen('transfer')}
                activeOpacity={0.8}
              >
                <View style={[styles.actionIconBox, { backgroundColor: '#EBF3FB' }]}>
                  <ArrowLeftRight color="#2B6CB0" size={22} strokeWidth={2.5} />
                </View>
                <Text style={styles.actionLabel}>Transfer</Text>
                <Text style={styles.actionSub}>₱15 fee</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => {
                  loadTransactions();
                  setScreen('history');
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.actionIconBox, { backgroundColor: colors.surfaceMuted }]}>
                  <History color={colors.coffee} size={22} strokeWidth={2.5} />
                </View>
                <Text style={styles.actionLabel}>History</Text>
                <Text style={styles.actionSub}>Activities</Text>
              </TouchableOpacity>
            </View>

            {/* Virtual ATM Card Promo Widget */}
            <TouchableOpacity
              style={[styles.atmCardBanner, shadow]}
              onPress={() => setScreen('card')}
              activeOpacity={0.85}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <CreditCard color={colors.coffee} size={18} />
                  <Text style={styles.atmBannerTitle}>Virtual LinkPay ATM Card</Text>
                </View>
                <Text style={styles.atmBannerSub}>
                  {account.virtualCard?.status === 'locked'
                    ? 'Card is currently LOCKED'
                    : 'Active • Ready for online & tap transactions'}
                </Text>
              </View>
              <ChevronRight color={colors.coffee} size={20} />
            </TouchableOpacity>

            {/* Recent Transactions List */}
            <View style={styles.recentTxSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Recent Transactions</Text>
                <TouchableOpacity onPress={() => setScreen('history')}>
                  <Text style={styles.sectionSeeAll}>View All →</Text>
                </TouchableOpacity>
              </View>

              {transactions.length === 0 ? (
                <View style={[styles.emptyBox, shadow]}>
                  <History color={colors.muted} size={30} />
                  <Text style={styles.emptyBoxText}>No transactions yet</Text>
                  <Text style={styles.emptyBoxSub}>
                    Deposit money or make a transfer to see records here.
                  </Text>
                </View>
              ) : (
                transactions.slice(0, 4).map((tx) => (
                  <View key={tx.id} style={[styles.txItem, shadow]}>
                    <View
                      style={[
                        styles.txIconRound,
                        tx.type === 'deposit'
                          ? { backgroundColor: colors.paleGreen }
                          : tx.type === 'withdrawal'
                          ? { backgroundColor: colors.paleRed }
                          : { backgroundColor: '#EBF3FB' }
                      ]}
                    >
                      {tx.type === 'deposit' ? (
                        <ArrowDownLeft color={colors.green} size={18} />
                      ) : tx.type === 'withdrawal' ? (
                        <ArrowUpRight color={colors.red} size={18} />
                      ) : (
                        <ArrowLeftRight color="#2B6CB0" size={18} />
                      )}
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.txDesc}>{tx.description || tx.type}</Text>
                      <Text style={styles.txDate}>{formatDate(tx.date)}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text
                        style={[
                          styles.txAmount,
                          tx.type === 'deposit' || tx.type === 'received_transfer'
                            ? { color: colors.green }
                            : { color: colors.coffeeDark }
                        ]}
                      >
                        {tx.type === 'deposit' || tx.type === 'received_transfer' ? '+' : '-'}
                        {peso(tx.amount)}
                      </Text>
                      {tx.fee > 0 && (
                        <Text style={styles.txFeeText}>+ ₱{tx.fee.toFixed(2)} fee</Text>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>

          {/* Bottom Navigation */}
          <View style={styles.bottomNav}>
            <TouchableOpacity style={styles.navBtn} onPress={() => setScreen('home')}>
              <House color={colors.coffee} size={20} />
              <Text style={[styles.navText, { color: colors.coffee, fontWeight: '800' }]}>
                Home
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navBtn} onPress={() => setScreen('card')}>
              <CreditCard color={colors.muted} size={20} />
              <Text style={styles.navText}>Card</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => {
                loadTransactions();
                setScreen('history');
              }}
            >
              <History color={colors.muted} size={20} />
              <Text style={styles.navText}>History</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navBtn} onPress={() => setScreen('profile')}>
              <UserRound color={colors.muted} size={20} />
              <Text style={styles.navText}>Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Screen 5: Deposit / Cash In */}
      {screen === 'deposit' && account && (
        <ScrollView contentContainerStyle={styles.screenScroll}>
          <View style={styles.subScreenHeader}>
            <TouchableOpacity style={styles.backPill} onPress={() => setScreen('home')}>
              <Text style={styles.backPillText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.subScreenTitle}>Cash Deposit</Text>
          </View>

          <View style={[styles.formCard, shadow]}>
            <Text style={styles.fieldLabel}>Current Available Balance</Text>
            <Text style={styles.currentBalanceDisplay}>{peso(account.balance)}</Text>

            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
              Deposit Amount (₱100 – ₱100,000)
            </Text>
            <TextInput
              style={[styles.input, { fontSize: 20, fontWeight: '700' }]}
              placeholder="0.00"
              keyboardType="numeric"
              value={depositAmount}
              onChangeText={setDepositAmount}
            />

            <View style={styles.presetRow}>
              {[500, 1000, 5000, 10000].map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={styles.presetPill}
                  onPress={() => setDepositAmount(String(amt))}
                >
                  <Text style={styles.presetPillText}>+₱{amt.toLocaleString()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.btnPrimary, { marginTop: 24 }]}
              onPress={handleDeposit}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.btnPrimaryText}>Confirm Deposit</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Screen 6: Cash Withdrawal */}
      {screen === 'withdraw' && account && (
        <ScrollView contentContainerStyle={styles.screenScroll}>
          <View style={styles.subScreenHeader}>
            <TouchableOpacity style={styles.backPill} onPress={() => setScreen('home')}>
              <Text style={styles.backPillText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.subScreenTitle}>Cash Withdrawal</Text>
          </View>

          <View style={[styles.formCard, shadow]}>
            <Text style={styles.fieldLabel}>Current Available Balance</Text>
            <Text style={styles.currentBalanceDisplay}>{peso(account.balance)}</Text>

            <View style={styles.infoPillBox}>
              <Text style={styles.infoPillText}>
                Daily Limit: ₱50,000.00 | Per Tx Limit: ₱20,000.00
              </Text>
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
              Withdrawal Amount (₱100 – ₱20,000)
            </Text>
            <TextInput
              style={[styles.input, { fontSize: 20, fontWeight: '700' }]}
              placeholder="0.00"
              keyboardType="numeric"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
            />

            <View style={styles.presetRow}>
              {[500, 1000, 2000, 5000].map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={styles.presetPill}
                  onPress={() => setWithdrawAmount(String(amt))}
                >
                  <Text style={styles.presetPillText}>₱{amt.toLocaleString()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.btnPrimary, { marginTop: 24 }]}
              onPress={handleWithdraw}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.btnPrimaryText}>Confirm Withdrawal</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Screen 7: Money Transfer */}
      {screen === 'transfer' && account && (
        <ScrollView contentContainerStyle={styles.screenScroll}>
          <View style={styles.subScreenHeader}>
            <TouchableOpacity style={styles.backPill} onPress={() => setScreen('home')}>
              <Text style={styles.backPillText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.subScreenTitle}>Transfer Money</Text>
          </View>

          <View style={[styles.formCard, shadow]}>
            <Text style={styles.fieldLabel}>Recipient 16-Digit Account Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter recipient account number"
              keyboardType="numeric"
              maxLength={16}
              value={transferRecipient}
              onChangeText={searchRecipient}
            />

            {recipientPreview && (
              <View style={styles.recipientFoundPill}>
                <CheckCircle2 color={colors.green} size={16} />
                <Text style={styles.recipientFoundText}>
                  Recipient: <Text style={{ fontWeight: '800' }}>{recipientPreview.fullName}</Text>{' '}
                  ({recipientPreview.accountType})
                </Text>
              </View>
            )}

            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
              Transfer Amount (₱100 – ₱30,000)
            </Text>
            <TextInput
              style={[styles.input, { fontSize: 20, fontWeight: '700' }]}
              placeholder="0.00"
              keyboardType="numeric"
              value={transferAmount}
              onChangeText={setTransferAmount}
            />

            {/* Fee Breakdown */}
            <View style={styles.feeBreakdown}>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Transfer Amount:</Text>
                <Text style={styles.feeVal}>{peso(parseFloat(transferAmount) || 0)}</Text>
              </View>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Transfer Fee:</Text>
                <Text style={styles.feeVal}>₱15.00</Text>
              </View>
              <View style={[styles.feeRow, { borderTopWidth: 1, borderColor: colors.border, paddingTop: 6, marginTop: 4 }]}>
                <Text style={[styles.feeLabel, { fontWeight: '800' }]}>Total Deduction:</Text>
                <Text style={[styles.feeVal, { fontWeight: '800', color: colors.coffeeDark }]}>
                  {peso((parseFloat(transferAmount) || 0) + 15)}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.btnPrimary, { marginTop: 22 }]}
              onPress={handleTransfer}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.btnPrimaryText}>Send Transfer Now</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Screen 8: Virtual ATM Card Screen */}
      {screen === 'card' && account && (
        <ScrollView contentContainerStyle={styles.screenScroll}>
          <View style={styles.subScreenHeader}>
            <TouchableOpacity style={styles.backPill} onPress={() => setScreen('home')}>
              <Text style={styles.backPillText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.subScreenTitle}>Virtual ATM Card</Text>
          </View>

          {/* Interactive Virtual Card (Visual Masterpiece) */}
          <View
            style={[
              styles.virtualAtmCard,
              cardShadow,
              account.virtualCard?.status === 'locked' && { opacity: 0.65 }
            ]}
          >
            {/* Glossy radial orb effect */}
            <View style={styles.cardGlow} />

            <View style={styles.cardHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Coffee color={colors.caramel} size={20} />
                <Text style={styles.cardBrandLarge}>LinkPay</Text>
              </View>
              <Text style={styles.cardStatusBadge}>
                {account.virtualCard?.status === 'locked' ? 'CARD LOCKED' : 'PREMIUM DEBIT'}
              </Text>
            </View>

            {/* Chip & Contactless */}
            <View style={styles.chipRow}>
              <View style={styles.emvChip}>
                <View style={styles.chipLine1} />
                <View style={styles.chipLine2} />
              </View>
              <Sparkles color={colors.caramel} size={18} />
            </View>

            {/* 16-Digit Card Number */}
            <Text style={styles.virtualCardNumber}>
              {formatCardNumber(account.virtualCard?.cardNumber)}
            </Text>

            <View style={styles.cardBottomRow}>
              <View>
                <Text style={styles.cardLabelSmall}>CARDHOLDER NAME</Text>
                <Text style={styles.cardHolderName}>
                  {account.virtualCard?.cardholder ||
                    `${account.firstName} ${account.lastName}`.toUpperCase()}
                </Text>
              </View>

              <View>
                <Text style={styles.cardLabelSmall}>EXPIRES</Text>
                <Text style={styles.cardHolderName}>{account.virtualCard?.expiry || '11/31'}</Text>
              </View>
            </View>
          </View>

          {/* Card Management Controls */}
          <View style={[styles.formCard, shadow, { marginTop: 20 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={styles.cardManageTitle}>Card Status</Text>
                <Text style={styles.cardManageSub}>
                  {account.virtualCard?.status === 'locked'
                    ? 'Card is temporarily locked. Transactions are declined.'
                    : 'Card is active for online shopping and ATM transactions.'}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.toggleCardBtn,
                  account.virtualCard?.status === 'locked'
                    ? { backgroundColor: colors.green }
                    : { backgroundColor: colors.red }
                ]}
                onPress={handleToggleCard}
              >
                {account.virtualCard?.status === 'locked' ? (
                  <>
                    <Unlock color={colors.white} size={16} />
                    <Text style={styles.toggleCardText}>Unlock</Text>
                  </>
                ) : (
                  <>
                    <Lock color={colors.white} size={16} />
                    <Text style={styles.toggleCardText}>Lock Card</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Screen 9: Transaction History */}
      {screen === 'history' && (
        <View style={{ flex: 1 }}>
          <View style={styles.subScreenHeader}>
            <TouchableOpacity style={styles.backPill} onPress={() => setScreen('home')}>
              <Text style={styles.backPillText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.subScreenTitle}>Transaction History</Text>
          </View>

          {/* Filter Pills */}
          <View style={styles.filterRow}>
            {['all', 'deposit', 'withdrawal', 'transfer'].map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterPill, txFilter === f && styles.filterPillActive]}
                onPress={() => {
                  setTxFilter(f);
                  loadTransactions(f, 1);
                }}
              >
                <Text style={[styles.filterText, txFilter === f && styles.filterTextActive]}>
                  {f === 'all'
                    ? 'All'
                    : f === 'deposit'
                    ? 'Cash In'
                    : f === 'withdrawal'
                    ? 'Cash Out'
                    : 'Transfers'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Transaction Summary (Module 8 Challenges) */}
          {txAnalytics && (
            <View style={styles.txStatsBar}>
              <Text style={styles.txStatsText}>
                Total: {txAnalytics.totalTransactions} | Cash In: {peso(txAnalytics.totalDeposits)} | Cash Out: {peso(txAnalytics.totalWithdrawals)}
              </Text>
            </View>
          )}

          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
            {transactions.length === 0 ? (
              <View style={[styles.emptyBox, shadow, { marginTop: 24 }]}>
                <History color={colors.muted} size={36} />
                <Text style={styles.emptyBoxText}>No transactions found</Text>
                <Text style={styles.emptyBoxSub}>No records match your selected filter.</Text>
              </View>
            ) : (
              transactions.map((tx) => (
                <View key={tx.id} style={[styles.txItem, shadow]}>
                  <View
                    style={[
                      styles.txIconRound,
                      tx.type === 'deposit'
                        ? { backgroundColor: colors.paleGreen }
                        : tx.type === 'withdrawal'
                        ? { backgroundColor: colors.paleRed }
                        : { backgroundColor: '#EBF3FB' }
                    ]}
                  >
                    {tx.type === 'deposit' ? (
                      <ArrowDownLeft color={colors.green} size={18} />
                    ) : tx.type === 'withdrawal' ? (
                      <ArrowUpRight color={colors.red} size={18} />
                    ) : (
                      <ArrowLeftRight color="#2B6CB0" size={18} />
                    )}
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.txDesc}>{tx.description || tx.type}</Text>
                    <Text style={styles.txDate}>{formatDate(tx.date)}</Text>
                    <Text style={styles.txRef}>Ref: {tx.id.slice(0, 8)}...</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={[
                        styles.txAmount,
                        tx.type === 'deposit' || tx.type === 'received_transfer'
                          ? { color: colors.green }
                          : { color: colors.coffeeDark }
                      ]}
                    >
                      {tx.type === 'deposit' || tx.type === 'received_transfer' ? '+' : '-'}
                      {peso(tx.amount)}
                    </Text>
                    <Text style={styles.txStatusText}>● {tx.status}</Text>
                  </View>
                </View>
              ))
            )}

            {/* Pagination Controls (Bonus Challenge C) */}
            {txPagination && txPagination.totalPages > 1 && (
              <View style={styles.paginationRow}>
                <TouchableOpacity
                  style={[styles.pageBtn, !txPagination.hasPrev && { opacity: 0.4 }]}
                  disabled={!txPagination.hasPrev}
                  onPress={() => loadTransactions(txFilter, txPage - 1)}
                >
                  <Text style={styles.pageBtnText}>← Previous</Text>
                </TouchableOpacity>

                <Text style={styles.pageInfoText}>
                  Page {txPagination.currentPage} of {txPagination.totalPages}
                </Text>

                <TouchableOpacity
                  style={[styles.pageBtn, !txPagination.hasNext && { opacity: 0.4 }]}
                  disabled={!txPagination.hasNext}
                  onPress={() => loadTransactions(txFilter, txPage + 1)}
                >
                  <Text style={styles.pageBtnText}>Next →</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* Screen 10: Profile & Account Information */}
      {screen === 'profile' && account && (
        <ScrollView contentContainerStyle={styles.screenScroll}>
          <View style={styles.subScreenHeader}>
            <TouchableOpacity style={styles.backPill} onPress={() => setScreen('home')}>
              <Text style={styles.backPillText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.subScreenTitle}>Account Profile</Text>
          </View>

          <View style={[styles.profileCard, shadow]}>
            <View style={styles.avatarCircle}>
              <UserRound color={colors.white} size={32} />
            </View>
            <Text style={styles.profileFullName}>
              {account.firstName} {account.lastName}
            </Text>
            <Text style={styles.profileAccNum}>Account: {account.accountNumber}</Text>
            <View style={styles.profileStatusBadge}>
              <Text style={styles.profileStatusText}>STATUS: {account.status.toUpperCase()}</Text>
            </View>

            <View style={styles.profileDetailsList}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Account Type</Text>
                <Text style={styles.detailValue}>{account.accountType.toUpperCase()}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Age</Text>
                <Text style={styles.detailValue}>{account.age} years old</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Date of Birth</Text>
                <Text style={styles.detailValue}>{account.dateOfBirth}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Address</Text>
                <Text style={styles.detailValue}>{account.address}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Account Balance</Text>
                <Text style={[styles.detailValue, { color: colors.green, fontWeight: '800' }]}>
                  {peso(account.balance)}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Member Since</Text>
                <Text style={styles.detailValue}>{account.createdAt?.slice(0, 10)}</Text>
              </View>
            </View>

            {/* Profile Action Buttons */}
            <View style={{ marginTop: 20, width: '100%', gap: 10 }}>
              <TouchableOpacity
                style={styles.profileActionBtn}
                onPress={() => setScreen('changePin')}
              >
                <LockKeyhole color={colors.coffee} size={18} />
                <Text style={styles.profileActionText}>Change Account PIN</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.profileActionBtn, { borderColor: colors.red }]}
                onPress={handleDeactivate}
              >
                <UserMinus color={colors.red} size={18} />
                <Text style={[styles.profileActionText, { color: colors.red }]}>
                  Deactivate Account (Bonus A)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Screen 11: Change PIN */}
      {screen === 'changePin' && (
        <ScrollView contentContainerStyle={styles.screenScroll}>
          <View style={styles.subScreenHeader}>
            <TouchableOpacity style={styles.backPill} onPress={() => setScreen('profile')}>
              <Text style={styles.backPillText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.subScreenTitle}>Change PIN</Text>
          </View>

          <View style={[styles.formCard, shadow]}>
            <Text style={styles.fieldLabel}>Current 4-Digit PIN</Text>
            <TextInput
              style={[styles.input, { letterSpacing: 6, fontSize: 18 }]}
              placeholder="••••"
              keyboardType="numeric"
              secureTextEntry
              maxLength={4}
              value={currentPin}
              onChangeText={setCurrentPin}
            />

            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>New 4-Digit PIN</Text>
            <TextInput
              style={[styles.input, { letterSpacing: 6, fontSize: 18 }]}
              placeholder="••••"
              keyboardType="numeric"
              secureTextEntry
              maxLength={4}
              value={newPin}
              onChangeText={setNewPin}
            />

            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Confirm New PIN</Text>
            <TextInput
              style={[styles.input, { letterSpacing: 6, fontSize: 18 }]}
              placeholder="••••"
              keyboardType="numeric"
              secureTextEntry
              maxLength={4}
              value={confirmNewPin}
              onChangeText={setConfirmNewPin}
            />

            <TouchableOpacity
              style={[styles.btnPrimary, { marginTop: 24 }]}
              onPress={handleChangePin}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.btnPrimaryText}>Update PIN</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Screen 12: Application-Wide Reports (Module 12) */}
      {screen === 'reports' && reportsData && (
        <ScrollView contentContainerStyle={styles.screenScroll}>
          <View style={styles.subScreenHeader}>
            <TouchableOpacity
              style={styles.backPill}
              onPress={() => (account ? setScreen('home') : setScreen('welcome'))}
            >
              <Text style={styles.backPillText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.subScreenTitle}>System Reports</Text>
          </View>

          <View style={[styles.formCard, shadow]}>
            <Text style={styles.reportsHeading}>LinkPay System Analytics</Text>
            <Text style={styles.reportsSub}>Module 12: Application-wide statistics</Text>

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>
                  {reportsData.accountsSummary?.totalRegisteredAccounts}
                </Text>
                <Text style={styles.statLabel}>Total Accounts</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>
                  {reportsData.transactionsSummary?.totalSuccessfulTransactions}
                </Text>
                <Text style={styles.statLabel}>Successful Tx</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statNum, { color: colors.green }]}>
                  {peso(reportsData.accountsSummary?.totalMoneyHeld)}
                </Text>
                <Text style={styles.statLabel}>Total Bank Deposits</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statNum, { color: colors.caramel }]}>
                  {peso(reportsData.transactionsSummary?.totalTransferFeesCollected)}
                </Text>
                <Text style={styles.statLabel}>Transfer Fees Collected</Text>
              </View>
            </View>

            <View style={{ marginTop: 16 }}>
              <Text style={styles.reportSectionHeader}>Account Breakdown</Text>
              <Text style={styles.reportLine}>
                • Savings Accounts: {reportsData.accountsSummary?.totalSavingsAccounts}
              </Text>
              <Text style={styles.reportLine}>
                • Checking Accounts: {reportsData.accountsSummary?.totalCheckingAccounts}
              </Text>
              <Text style={styles.reportLine}>
                • Average Balance: {peso(reportsData.accountsSummary?.averageAccountBalance)}
              </Text>
              {reportsData.accountsSummary?.highestBalanceAccount && (
                <Text style={styles.reportLine}>
                  • Highest Balance: {reportsData.accountsSummary.highestBalanceAccount.name} (
                  {peso(reportsData.accountsSummary.highestBalanceAccount.balance)})
                </Text>
              )}
            </View>

            <View style={{ marginTop: 16 }}>
              <Text style={styles.reportSectionHeader}>Transaction Totals</Text>
              <Text style={styles.reportLine}>
                • Total Deposits: {reportsData.transactionsSummary?.totalDepositsProcessed} (
                {peso(reportsData.transactionsSummary?.totalDepositAmount)})
              </Text>
              <Text style={styles.reportLine}>
                • Total Withdrawals: {reportsData.transactionsSummary?.totalWithdrawalsProcessed} (
                {peso(reportsData.transactionsSummary?.totalWithdrawalAmount)})
              </Text>
              <Text style={styles.reportLine}>
                • Total Transfers: {reportsData.transactionsSummary?.totalTransfersProcessed} (
                {peso(reportsData.transactionsSummary?.totalTransferAmount)})
              </Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Transaction Success Receipt Modal */}
      {successReceipt && (
        <View style={styles.receiptOverlay}>
          <View style={[styles.receiptCard, cardShadow]}>
            <View style={styles.receiptCheckCircle}>
              <CheckCircle2 color={colors.white} size={34} />
            </View>
            <Text style={styles.receiptTitle}>{successReceipt.title}</Text>
            <Text style={styles.receiptAmount}>{peso(successReceipt.amount)}</Text>

            <View style={styles.receiptDetails}>
              {successReceipt.recipientName && (
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptRowLabel}>Recipient:</Text>
                  <Text style={styles.receiptRowVal}>{successReceipt.recipientName}</Text>
                </View>
              )}
              {successReceipt.fee > 0 && (
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptRowLabel}>Transfer Fee:</Text>
                  <Text style={styles.receiptRowVal}>₱15.00</Text>
                </View>
              )}
              <View style={styles.receiptRow}>
                <Text style={styles.receiptRowLabel}>New Balance:</Text>
                <Text style={[styles.receiptRowVal, { color: colors.green, fontWeight: '800' }]}>
                  {peso(successReceipt.newBalance)}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptRowLabel}>Reference No:</Text>
                <Text style={styles.receiptRowVal}>{successReceipt.ref?.slice(0, 16)}...</Text>
              </View>
              {successReceipt.extra && (
                <Text style={styles.receiptExtra}>{successReceipt.extra}</Text>
              )}
            </View>

            <TouchableOpacity
              style={[styles.btnPrimary, { marginTop: 18 }]}
              onPress={() => setSuccessReceipt(null)}
            >
              <Text style={styles.btnPrimaryText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MainBankingApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: colors.background
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  welcomeContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between'
  },
  welcomeHero: {
    alignItems: 'center',
    marginTop: 40
  },
  welcomeSubhead: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
    maxWidth: 280
  },
  welcomeCardSample: {
    width: '100%',
    height: 180,
    backgroundColor: colors.coffeeDark,
    borderRadius: 20,
    padding: 20,
    marginTop: 36,
    justifyContent: 'space-between'
  },
  cardBrand: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  cardSampleNum: {
    color: '#E8DCCE',
    fontSize: 18,
    letterSpacing: 4,
    fontWeight: '600'
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end'
  },
  cardLabelSmall: {
    color: colors.muted,
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1
  },
  cardValueSmall: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2
  },
  chipGraphic: {
    width: 32,
    height: 24,
    backgroundColor: colors.gold,
    borderRadius: 5
  },
  welcomeButtons: {
    gap: 12,
    marginBottom: 16
  },
  btnPrimary: {
    backgroundColor: colors.coffee,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center'
  },
  btnPrimaryText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 15
  },
  btnSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center'
  },
  btnSecondaryText: {
    color: colors.coffeeDark,
    fontWeight: '800',
    fontSize: 15
  },
  authScroll: {
    padding: 20,
    paddingBottom: 40
  },
  backPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20
  },
  backPillText: {
    color: colors.coffeeDark,
    fontWeight: '700',
    fontSize: 12
  },
  screenHeading: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.coffeeDark,
    marginTop: 10
  },
  screenSub: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 4
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text
  },
  rowTwo: {
    flexDirection: 'row'
  },
  accountTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4
  },
  typeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center'
  },
  typeChipActive: {
    backgroundColor: colors.coffee
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.coffeeDark
  },
  typeChipTextActive: {
    color: colors.white
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.paleRed,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16
  },
  errorAlertText: {
    color: colors.red,
    fontSize: 13,
    fontWeight: '600',
    flex: 1
  },
  securityNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 18,
    justifyContent: 'center'
  },
  securityNoteText: {
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center'
  },
  homeScroll: {
    padding: 16,
    paddingBottom: 85
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  greetingSub: {
    fontSize: 10,
    color: colors.muted,
    fontWeight: '800',
    letterSpacing: 1.2
  },
  greetingName: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.coffeeDark
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  lowBalanceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paleRed,
    padding: 12,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(185, 74, 72, 0.2)'
  },
  lowBalanceTitle: {
    color: colors.red,
    fontWeight: '800',
    fontSize: 12
  },
  lowBalanceDesc: {
    color: colors.red,
    fontSize: 11,
    marginTop: 1
  },
  mainBalanceCard: {
    backgroundColor: colors.coffeeDark,
    borderRadius: 22,
    padding: 20,
    marginBottom: 16
  },
  balanceCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  balanceCardLabel: {
    color: '#E8DCCE',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1
  },
  eyeBtn: {
    padding: 4
  },
  balanceCardValue: {
    color: colors.white,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginVertical: 12
  },
  balanceCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 10
  },
  accountTypeBadge: {
    color: colors.caramel,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1
  },
  accountNumberDisplay: {
    color: '#E8DCCE',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2
  },
  actionGridContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 8,
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16
  },
  actionItem: {
    alignItems: 'center',
    width: 70
  },
  actionIconBox: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text
  },
  actionSub: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 1
  },
  atmCardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 18
  },
  atmBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.coffeeDark
  },
  atmBannerSub: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2
  },
  recentTxSection: {
    marginTop: 4
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.coffeeDark
  },
  sectionSeeAll: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.coffee
  },
  emptyBox: {
    backgroundColor: colors.surface,
    padding: 28,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border
  },
  emptyBoxText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.coffeeDark,
    marginTop: 8
  },
  emptyBoxSub: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 4
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8
  },
  txIconRound: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  txDesc: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text
  },
  txDate: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 2
  },
  txRef: {
    fontSize: 9,
    color: colors.muted,
    marginTop: 1
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '900'
  },
  txFeeText: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 1
  },
  txStatusText: {
    fontSize: 10,
    color: colors.green,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'capitalize'
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 65,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center'
  },
  navBtn: {
    alignItems: 'center'
  },
  navText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.muted,
    marginTop: 2
  },
  screenScroll: {
    padding: 16,
    paddingBottom: 40
  },
  subScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12
  },
  subScreenTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.coffeeDark
  },
  currentBalanceDisplay: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.coffeeDark,
    marginVertical: 4
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12
  },
  presetPill: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center'
  },
  presetPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.coffee
  },
  infoPillBox: {
    backgroundColor: colors.surfaceMuted,
    padding: 10,
    borderRadius: 10,
    marginVertical: 8
  },
  infoPillText: {
    fontSize: 11,
    color: colors.coffee,
    fontWeight: '700',
    textAlign: 'center'
  },
  recipientFoundPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.paleGreen,
    padding: 10,
    borderRadius: 10,
    marginTop: 8
  },
  recipientFoundText: {
    fontSize: 12,
    color: colors.green
  },
  feeBreakdown: {
    backgroundColor: colors.surfaceMuted,
    padding: 12,
    borderRadius: 12,
    marginTop: 16
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  feeLabel: {
    fontSize: 12,
    color: colors.text
  },
  feeVal: {
    fontSize: 12,
    color: colors.text
  },
  virtualAtmCard: {
    width: '100%',
    height: 215,
    backgroundColor: colors.coffeeDark,
    borderRadius: 22,
    padding: 22,
    justifyContent: 'space-between',
    overflow: 'hidden'
  },
  cardGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(201, 154, 107, 0.14)',
    right: -30,
    top: -30
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  cardBrandLarge: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  cardStatusBadge: {
    color: colors.caramel,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2
  },
  chipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6
  },
  emvChip: {
    width: 42,
    height: 32,
    backgroundColor: colors.gold,
    borderRadius: 6,
    padding: 4,
    justifyContent: 'space-around'
  },
  chipLine1: {
    height: 1,
    backgroundColor: '#8B6A28'
  },
  chipLine2: {
    height: 1,
    backgroundColor: '#8B6A28'
  },
  virtualCardNumber: {
    color: colors.white,
    fontSize: 20,
    letterSpacing: 3,
    fontWeight: '700',
    marginVertical: 10
  },
  cardHolderName: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2
  },
  cardManageTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.coffeeDark
  },
  cardManageSub: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
    maxWidth: 200
  },
  toggleCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12
  },
  toggleCardText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800'
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  filterPillActive: {
    backgroundColor: colors.coffee,
    borderColor: colors.coffee
  },
  filterText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text
  },
  filterTextActive: {
    color: colors.white
  },
  txStatsBar: {
    backgroundColor: colors.surfaceMuted,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 8,
    borderRadius: 10
  },
  txStatsText: {
    fontSize: 10,
    color: colors.coffee,
    fontWeight: '700',
    textAlign: 'center'
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingHorizontal: 8
  },
  pageBtn: {
    backgroundColor: colors.coffee,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10
  },
  pageBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700'
  },
  pageInfoText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600'
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.coffee,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  profileFullName: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.coffeeDark
  },
  profileAccNum: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2
  },
  profileStatusBadge: {
    backgroundColor: colors.paleGreen,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8
  },
  profileStatusText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.green,
    letterSpacing: 1
  },
  profileDetailsList: {
    width: '100%',
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  detailLabel: {
    fontSize: 12,
    color: colors.muted
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text
  },
  profileActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  profileActionText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.coffeeDark
  },
  reportsHeading: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.coffeeDark
  },
  reportsSub: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
    marginBottom: 16
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  statBox: {
    width: '48%',
    backgroundColor: colors.surfaceMuted,
    padding: 12,
    borderRadius: 12
  },
  statNum: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.coffeeDark
  },
  statLabel: {
    fontSize: 10,
    color: colors.muted,
    fontWeight: '700',
    marginTop: 4
  },
  reportSectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.coffeeDark,
    marginBottom: 6
  },
  reportLine: {
    fontSize: 12,
    color: colors.text,
    marginBottom: 4
  },
  receiptOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(44, 24, 16, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 99
  },
  receiptCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border
  },
  receiptCheckCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14
  },
  receiptTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.coffeeDark
  },
  receiptAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.green,
    marginVertical: 10
  },
  receiptDetails: {
    width: '100%',
    backgroundColor: colors.surfaceMuted,
    padding: 14,
    borderRadius: 14,
    marginVertical: 10
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  receiptRowLabel: {
    fontSize: 12,
    color: colors.muted
  },
  receiptRowVal: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text
  },
  receiptExtra: {
    fontSize: 11,
    color: colors.coffee,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 6
  }
});
