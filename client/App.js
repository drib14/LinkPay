import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StatusBar,
  StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Bell, ChevronRight, CreditCard,
  Eye, EyeOff, History, House, LogOut, LockKeyhole, ShieldCheck, UserRound,
  Wallet, Plus, Snowflake, CircleHelp, Settings, X
} from 'lucide-react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { apiRequest, saveToken, clearToken, getToken } from './src/api';
import { colors, shadow } from './src/theme';
import Logo from './src/components/Logo';

const peso = (value) => `₱${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateLabel = (value) => value ? new Date(value).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

function Button({ title, onPress, variant = 'primary', disabled = false, style }) {
  return (
    <TouchableOpacity activeOpacity={0.82} disabled={disabled} onPress={onPress}
      style={[styles.button, variant === 'secondary' && styles.buttonSecondary, variant === 'danger' && styles.buttonDanger, disabled && { opacity: 0.5 }, style]}>
      <Text style={[styles.buttonText, variant !== 'primary' && { color: variant === 'danger' ? colors.red : colors.coffee }]}>{title}</Text>
    </TouchableOpacity>
  );
}

function Field({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType = 'default', maxLength, autoCapitalize = 'none' }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value} onChangeText={onChangeText} placeholder={placeholder || label}
        placeholderTextColor="#AA9B90" secureTextEntry={secureTextEntry}
        keyboardType={keyboardType} maxLength={maxLength} autoCapitalize={autoCapitalize}
        style={styles.input}
      />
    </View>
  );
}

function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function Header({ title, onBack, right }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}><ChevronRight size={21} color={colors.coffee} style={{ transform: [{ rotate: '180deg' }] }} /></TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={{ width: 40, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

export default function App() {
  const [screen, setScreen] = useState('loading');
  const [account, setAccount] = useState(null);
  const [tokenReady, setTokenReady] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const [loginNumber, setLoginNumber] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [reg, setReg] = useState({ firstName: '', lastName: '', dateOfBirth: '', address: '', accountType: 'savings', pin: '', confirmPin: '' });
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const data = await apiRequest('/auth/me');
          setAccount(data.account);
          await refreshTransactions();
          setScreen('home');
        } else setScreen('welcome');
      } catch {
        await clearToken();
        setScreen('welcome');
      } finally { setTokenReady(true); }
    })();
  }, []);

  async function refreshAccount() {
    const data = await apiRequest('/auth/me');
    setAccount(data.account);
  }
  async function refreshTransactions() {
    const data = await apiRequest('/wallet/transactions');
    setTransactions(data.transactions || []);
  }
  async function runRequest(task, success) {
    setBusy(true); setMessage('');
    try {
      const result = await task();
      if (success) success(result);
      return result;
    } catch (error) {
      setMessage(error.message);
      Alert.alert('LinkPay', error.message);
      return null;
    } finally { setBusy(false); }
  }

  async function login() {
    if (!/^\d{16}$/.test(loginNumber) || !/^\d{4}$/.test(loginPin)) return Alert.alert('Check your details', 'Enter your 16-digit account number and 4-digit PIN.');
    await runRequest(async () => {
      const data = await apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ accountNumber: loginNumber, pin: loginPin }) });
      await saveToken(data.token);
      setAccount(data.account);
      await refreshTransactions();
      setLoginPin('');
      setScreen('home');
    });
  }

  async function register() {
    if (!reg.firstName.trim() || !reg.lastName.trim() || !reg.address.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(reg.dateOfBirth) || !/^\d{4}$/.test(reg.pin) || reg.pin !== reg.confirmPin) {
      return Alert.alert('Check your details', 'Complete all fields. Use YYYY-MM-DD for date of birth and matching four-digit PINs.');
    }
    await runRequest(async () => {
      const data = await apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(reg) });
      Alert.alert('Account created', `Welcome to LinkPay!\n\nYour account number:\n${data.account.accountNumber}\n\nSave this number. You will need it to log in.`);
      setLoginNumber(data.account.accountNumber);
      setReg({ firstName: '', lastName: '', dateOfBirth: '', address: '', accountType: 'savings', pin: '', confirmPin: '' });
      setScreen('login');
    });
  }

  async function logout() {
    Alert.alert('Log out?', 'Your account information will remain saved.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: async () => { await clearToken(); setAccount(null); setTransactions([]); setScreen('welcome'); } }
    ]);
  }

  async function loadProfile() {
    await runRequest(async () => {
      const data = await apiRequest('/account/profile');
      setAccount(data.account);
      setScreen('profile');
    });
  }
  async function loadCard() {
    await runRequest(async () => {
      const data = await apiRequest('/account/profile');
      setAccount(data.account);
      setScreen('card');
    });
  }
  async function loadHistory() {
    await runRequest(async () => {
      await refreshTransactions();
      setScreen('history');
    });
  }

  async function submitMoney(type) {
    const numericAmount = Number(amount);
    if (!amount.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) return Alert.alert('Invalid amount', 'Enter a valid amount greater than zero.');
    const labels = { deposit: 'Deposit', withdraw: 'Withdrawal', transfer: 'Transfer' };
    Alert.alert(`Confirm ${labels[type].toLowerCase()}`, `${labels[type]} ${peso(numericAmount)}${type === 'transfer' ? ' plus ₱15 fee' : ''}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: async () => {
        await runRequest(async () => {
          const path = type === 'deposit' ? '/wallet/deposit' : type === 'withdraw' ? '/wallet/withdraw' : '/wallet/transfer';
          const body = type === 'transfer' ? { amount: numericAmount, recipientAccountNumber: recipient } : { amount: numericAmount };
          const data = await apiRequest(path, { method: 'POST', body: JSON.stringify(body) });
          setAccount(data.account);
          await refreshTransactions();
          setAmount(''); setRecipient('');
          setScreen('home');
          Alert.alert('Success', data.message + (data.transfer ? `\n\nRecipient: ${data.transfer.recipientName}\nTransfer fee: ₱15.00` : ''));
        });
      }}
    ]);
  }

  async function changePin() {
    await runRequest(async () => {
      const data = await apiRequest('/account/pin', { method: 'PATCH', body: JSON.stringify({ currentPin, newPin, confirmPin: confirmNewPin }) });
      setCurrentPin(''); setNewPin(''); setConfirmNewPin('');
      Alert.alert('PIN updated', data.message);
      setScreen('profile');
    });
  }

  async function toggleCard() {
    const nextStatus = account?.virtualCard?.status === 'locked' ? 'active' : 'locked';
    await runRequest(async () => {
      const data = await apiRequest('/account/card', { method: 'PATCH', body: JSON.stringify({ status: nextStatus }) });
      setAccount(data.account);
      Alert.alert('Virtual card', data.message);
    });
  }

  async function deactivate() {
    Alert.alert('Deactivate account?', 'You can only deactivate an account with a zero balance. Your records will be preserved.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Deactivate', style: 'destructive', onPress: async () => {
        await runRequest(async () => {
          const data = await apiRequest('/account/deactivate', { method: 'POST' });
          await clearToken(); setAccount(null); setScreen('welcome');
          Alert.alert('Account deactivated', data.message);
        });
      }}
    ]);
  }

  if (!tokenReady || screen === 'loading') {
    return <SafeAreaView style={styles.center}><ActivityIndicator color={colors.coffee} size="large" /><Text style={styles.muted}>Preparing LinkPay…</Text></SafeAreaView>;
  }

  const isAuthenticated = !!account && !['welcome', 'login', 'register'].includes(screen);

  return (
    <SafeAreaView style={styles.safe}>
      <ExpoStatusBar style="dark" />
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      {screen === 'welcome' && (
        <ScrollView contentContainerStyle={styles.welcome}>
          <View style={{ alignItems: 'center', marginTop: 56 }}>
            <Logo size={76} />
            <Text style={styles.brandTitle}>LinkPay</Text>
            <Text style={styles.welcomeSubtitle}>A simpler way to manage your money.</Text>
          </View>
          <View style={styles.welcomeArt}>
            <View style={styles.artCircle}><Wallet size={74} color={colors.coffee} /></View>
            <Text style={styles.artTitle}>Your money, in one place.</Text>
            <Text style={styles.artText}>Check your balance, move funds, and keep track of every transaction.</Text>
          </View>
          <View style={{ width: '100%', gap: 12 }}>
            <Button title="Log in to LinkPay" onPress={() => setScreen('login')} />
            <Button title="Create an account" variant="secondary" onPress={() => setScreen('register')} />
          </View>
          <Text style={styles.disclaimer}>Demo wallet only · No real funds or card payments</Text>
        </ScrollView>
      )}

      {screen === 'login' && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.formPage}>
            <Header title="Welcome back" onBack={() => setScreen('welcome')} />
            <Logo size={54} />
            <Text style={styles.pageTitle}>Log in to LinkPay</Text>
            <Text style={styles.pageSubtitle}>Use your LinkPay account number and PIN.</Text>
            <Field label="16-digit account number" value={loginNumber} onChangeText={setLoginNumber} keyboardType="number-pad" maxLength={16} />
            <Field label="4-digit PIN" value={loginPin} onChangeText={setLoginPin} keyboardType="number-pad" secureTextEntry maxLength={4} />
            <Button title={busy ? 'Please wait…' : 'Log in'} onPress={login} disabled={busy} />
            <TouchableOpacity onPress={() => setScreen('register')} style={styles.inlineLink}><Text style={styles.linkText}>New to LinkPay? Create an account</Text></TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {screen === 'register' && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.formPage}>
            <Header title="Create account" onBack={() => setScreen('welcome')} />
            <Text style={styles.pageTitle}>Let's get you started.</Text>
            <Text style={styles.pageSubtitle}>You must be at least 18 years old to register.</Text>
            <Field label="First name" value={reg.firstName} onChangeText={(v) => setReg({ ...reg, firstName: v })} autoCapitalize="words" />
            <Field label="Last name" value={reg.lastName} onChangeText={(v) => setReg({ ...reg, lastName: v })} autoCapitalize="words" />
            <Field label="Date of birth (YYYY-MM-DD)" value={reg.dateOfBirth} onChangeText={(v) => setReg({ ...reg, dateOfBirth: v })} placeholder="2000-01-31" />
            <Field label="Address" value={reg.address} onChangeText={(v) => setReg({ ...reg, address: v })} autoCapitalize="words" />
            <Text style={styles.fieldLabel}>Account type</Text>
            <View style={styles.segmentRow}>
              {['savings', 'checking'].map((type) => <TouchableOpacity key={type} onPress={() => setReg({ ...reg, accountType: type })} style={[styles.segment, reg.accountType === type && styles.segmentActive]}><Text style={[styles.segmentText, reg.accountType === type && styles.segmentTextActive]}>{type.toUpperCase()}</Text></TouchableOpacity>)}
            </View>
            <Field label="Create 4-digit PIN" value={reg.pin} onChangeText={(v) => setReg({ ...reg, pin: v.replace(/\D/g, '') })} keyboardType="number-pad" secureTextEntry maxLength={4} />
            <Field label="Confirm PIN" value={reg.confirmPin} onChangeText={(v) => setReg({ ...reg, confirmPin: v.replace(/\D/g, '') })} keyboardType="number-pad" secureTextEntry maxLength={4} />
            <Button title={busy ? 'Creating…' : 'Create LinkPay account'} onPress={register} disabled={busy} />
            <Text style={styles.smallNote}>Your account starts with a ₱0.00 balance. A demo virtual card is created automatically.</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {isAuthenticated && screen === 'home' && (
        <ScrollView contentContainerStyle={styles.page}>
          <View style={styles.topBar}>
            <View><Logo size={38} wordmark /><Text style={styles.greeting}>Good day, {account.firstName} 👋</Text></View>
            <TouchableOpacity onPress={loadProfile} style={styles.avatar}><UserRound size={21} color={colors.coffee} /></TouchableOpacity>
          </View>
          <View style={styles.balanceCard}>
            <View style={styles.balanceTop}><Text style={styles.balanceLabel}>TOTAL WALLET BALANCE</Text><TouchableOpacity onPress={() => setBalanceVisible(!balanceVisible)}>{balanceVisible ? <Eye size={19} color="#F8EDE2" /> : <EyeOff size={19} color="#F8EDE2" />}</TouchableOpacity></View>
            <Text style={styles.balanceAmount}>{balanceVisible ? peso(account.balance) : '₱ ••••••'}</Text>
            <View style={styles.accountTag}><Text style={styles.accountTagText}>{account.accountType?.toUpperCase()} ACCOUNT</Text><Text style={styles.accountTagText}>•• {String(account.accountNumber).slice(-4)}</Text></View>
            <View style={styles.balanceDecor} />
          </View>
          <View style={styles.actionsGrid}>
            <Action icon={<Plus size={21} color={colors.coffee} />} label="Deposit" onPress={() => { setAmount(''); setScreen('deposit'); }} />
            <Action icon={<ArrowUpRight size={21} color={colors.coffee} />} label="Withdraw" onPress={() => { setAmount(''); setScreen('withdraw'); }} />
            <Action icon={<ArrowLeftRight size={21} color={colors.coffee} />} label="Transfer" onPress={() => { setAmount(''); setRecipient(''); setScreen('transfer'); }} />
            <Action icon={<CreditCard size={21} color={colors.coffee} />} label="Virtual card" onPress={loadCard} />
          </View>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Recent activity</Text><TouchableOpacity onPress={loadHistory}><Text style={styles.linkText}>See all</Text></TouchableOpacity></View>
          <Card style={{ paddingVertical: 4 }}>
            {transactions.slice(0, 4).length === 0 ? <Text style={styles.emptyText}>Your transactions will appear here.</Text> : transactions.slice(0, 4).map((item) => <TransactionRow key={item.id} item={item} />)}
          </Card>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Your account</Text></View>
          <Card style={{ padding: 0 }}>
            <MenuRow icon={<UserRound size={19} color={colors.coffee} />} title="Account information" subtitle="Personal details and account settings" onPress={loadProfile} />
            <MenuRow icon={<History size={19} color={colors.coffee} />} title="Transaction history" subtitle="Review your recent activity" onPress={loadHistory} />
            <MenuRow icon={<ShieldCheck size={19} color={colors.coffee} />} title="Security" subtitle="Change your PIN and manage your account" onPress={() => setScreen('security')} />
          </Card>
          <Text style={styles.footerNote}>LinkPay is a simulated wallet. No real money is held or transferred.</Text>
        </ScrollView>
      )}

      {isAuthenticated && ['deposit', 'withdraw', 'transfer'].includes(screen) && (
        <ScrollView contentContainerStyle={styles.formPage}>
          <Header title={screen === 'deposit' ? 'Cash deposit' : screen === 'withdraw' ? 'Cash withdrawal' : 'Send money'} onBack={() => setScreen('home')} />
          <View style={styles.moneyIcon}><Wallet size={30} color={colors.coffee} /></View>
          <Text style={styles.pageTitle}>{screen === 'deposit' ? 'Add money' : screen === 'withdraw' ? 'Withdraw funds' : 'Transfer to LinkPay'}</Text>
          <Text style={styles.pageSubtitle}>Available balance: {peso(account.balance)}</Text>
          {screen === 'transfer' && <Field label="Recipient account number" value={recipient} onChangeText={setRecipient} keyboardType="number-pad" maxLength={16} />}
          <Field label="Amount (PHP)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" />
          <Card style={styles.infoCard}>
            <Text style={styles.infoTitle}>Transaction limits</Text>
            <Text style={styles.infoText}>{screen === 'deposit' ? 'Minimum ₱100 · Maximum ₱100,000 per deposit' : screen === 'withdraw' ? 'Minimum ₱100 · Maximum ₱20,000 per transaction · ₱50,000 daily limit' : 'Minimum ₱100 · Maximum ₱30,000 per transfer · ₱15 transfer fee'}</Text>
          </Card>
          <Button title={screen === 'deposit' ? 'Review deposit' : screen === 'withdraw' ? 'Review withdrawal' : 'Review transfer'} onPress={() => submitMoney(screen)} disabled={busy} />
          <Button title="Cancel" variant="secondary" onPress={() => setScreen('home')} />
        </ScrollView>
      )}

      {isAuthenticated && screen === 'history' && (
        <View style={{ flex: 1 }}>
          <Header title="Transaction history" onBack={() => setScreen('home')} />
          <ScrollView contentContainerStyle={styles.page}>
            <Text style={styles.pageSubtitle}>Your latest LinkPay activity.</Text>
            <Card style={{ paddingVertical: 4 }}>
              {transactions.length === 0 ? <Text style={styles.emptyText}>No transactions yet. Make your first deposit to get started.</Text> : transactions.map((item) => <TransactionRow key={item.id} item={item} detailed />)}
            </Card>
          </ScrollView>
        </View>
      )}

      {isAuthenticated && screen === 'profile' && (
        <ScrollView contentContainerStyle={styles.page}>
          <Header title="Account information" onBack={() => setScreen('home')} />
          <Card style={{ alignItems: 'center', padding: 24 }}>
            <View style={styles.profileAvatar}><UserRound size={32} color={colors.coffee} /></View>
            <Text style={styles.profileName}>{account.fullName || `${account.firstName} ${account.lastName}`}</Text>
            <Text style={styles.muted}>{account.accountNumber}</Text>
            <View style={styles.statusPill}><Text style={styles.statusText}>{String(account.status || 'active').toUpperCase()}</Text></View>
          </Card>
          <Card>
            <ProfileLine label="First name" value={account.firstName} />
            <ProfileLine label="Last name" value={account.lastName} />
            <ProfileLine label="Age" value={`${account.age} years old`} />
            <ProfileLine label="Date of birth" value={dateLabel(account.dateOfBirth)} />
            <ProfileLine label="Address" value={account.address} />
            <ProfileLine label="Account type" value={account.accountType?.toUpperCase()} />
            <ProfileLine label="Balance" value={peso(account.balance)} />
            <ProfileLine label="Date created" value={dateLabel(account.createdAt)} />
          </Card>
          <Button title="Change PIN" onPress={() => setScreen('changePin')} />
          <Button title="Deactivate account" variant="danger" onPress={deactivate} />
        </ScrollView>
      )}

      {isAuthenticated && screen === 'card' && (
        <ScrollView contentContainerStyle={styles.page}>
          <Header title="Virtual card" onBack={() => setScreen('home')} />
          <Text style={styles.pageSubtitle}>A simulated card for your LinkPay wallet.</Text>
          <View style={[styles.virtualCard, account.virtualCard?.status === 'locked' && { opacity: 0.68 }]}>
            <View style={styles.virtualCardTop}><Logo size={34} light /><Text style={styles.virtualCardTag}>VIRTUAL</Text></View>
            <Text style={styles.virtualCardNumber}>{account.virtualCard?.cardNumber || '•••• •••• •••• ••••'}</Text>
            <View style={styles.virtualCardBottom}>
              <View><Text style={styles.cardMetaLabel}>CARDHOLDER</Text><Text style={styles.cardMetaValue}>{account.virtualCard?.cardholder || account.fullName}</Text></View>
              <View><Text style={styles.cardMetaLabel}>VALID THRU</Text><Text style={styles.cardMetaValue}>{account.virtualCard?.expiry || '--/--'}</Text></View>
            </View>
            <View style={styles.cardOrbOne} /><View style={styles.cardOrbTwo} />
          </View>
          <View style={styles.cardNotice}><ShieldCheck size={19} color={colors.green} /><Text style={styles.cardNoticeText}>This is a demo-only virtual card. It is not connected to a payment network and cannot be used for purchases.</Text></View>
          <Card>
            <View style={styles.rowBetween}><Text style={styles.itemTitle}>Card status</Text><Text style={[styles.statusText, { color: account.virtualCard?.status === 'locked' ? colors.red : colors.green }]}>{String(account.virtualCard?.status || 'active').toUpperCase()}</Text></View>
            <Text style={styles.muted}>Lock your card to simulate disabling card use.</Text>
          </Card>
          <Button title={account.virtualCard?.status === 'locked' ? 'Unlock virtual card' : 'Lock virtual card'} onPress={toggleCard} variant="secondary" />
        </ScrollView>
      )}

      {isAuthenticated && screen === 'security' && (
        <ScrollView contentContainerStyle={styles.page}>
          <Header title="Security & settings" onBack={() => setScreen('home')} />
          <Card style={{ padding: 0 }}>
            <MenuRow icon={<LockKeyhole size={19} color={colors.coffee} />} title="Change PIN" subtitle="Update your four-digit security PIN" onPress={() => setScreen('changePin')} />
            <MenuRow icon={<CreditCard size={19} color={colors.coffee} />} title="Manage virtual card" subtitle="Lock or unlock your demo card" onPress={loadCard} />
          </Card>
          <Button title="Log out" variant="secondary" onPress={logout} />
        </ScrollView>
      )}

      {isAuthenticated && screen === 'changePin' && (
        <ScrollView contentContainerStyle={styles.formPage}>
          <Header title="Change PIN" onBack={() => setScreen('profile')} />
          <View style={styles.moneyIcon}><LockKeyhole size={28} color={colors.coffee} /></View>
          <Text style={styles.pageTitle}>Keep your account secure.</Text>
          <Text style={styles.pageSubtitle}>Your PIN must contain exactly four digits.</Text>
          <Field label="Current PIN" value={currentPin} onChangeText={setCurrentPin} keyboardType="number-pad" secureTextEntry maxLength={4} />
          <Field label="New PIN" value={newPin} onChangeText={setNewPin} keyboardType="number-pad" secureTextEntry maxLength={4} />
          <Field label="Confirm new PIN" value={confirmNewPin} onChangeText={setConfirmNewPin} keyboardType="number-pad" secureTextEntry maxLength={4} />
          <Button title="Update PIN" onPress={changePin} disabled={busy} />
        </ScrollView>
      )}

      {isAuthenticated && (
        <View style={styles.bottomNav}>
          <NavItem icon={<House size={20} />} label="Home" active={screen === 'home'} onPress={() => setScreen('home')} />
          <NavItem icon={<History size={20} />} label="Activity" active={screen === 'history'} onPress={loadHistory} />
          <NavItem icon={<CreditCard size={20} />} label="Card" active={screen === 'card'} onPress={loadCard} />
          <NavItem icon={<UserRound size={20} />} label="Profile" active={screen === 'profile' || screen === 'security' || screen === 'changePin'} onPress={loadProfile} />
        </View>
      )}
      {busy && <View style={styles.busyOverlay}><ActivityIndicator color="#FFFFFF" size="large" /><Text style={{ color: '#FFFFFF', marginTop: 10 }}>Processing securely…</Text></View>}
    </SafeAreaView>
  );
}

function Action({ icon, label, onPress }) {
  return <TouchableOpacity onPress={onPress} style={styles.actionItem}><View style={styles.actionIcon}>{icon}</View><Text style={styles.actionLabel}>{label}</Text></TouchableOpacity>;
}
function TransactionRow({ item, detailed = false }) {
  const incoming = item.type === 'deposit' || item.type === 'received_transfer';
  const icon = item.type === 'deposit' ? <ArrowDownLeft size={19} color={colors.green} /> : item.type === 'withdrawal' ? <ArrowUpRight size={19} color={colors.red} /> : <ArrowLeftRight size={19} color={colors.coffee} />;
  const label = item.type === 'received_transfer' ? 'Money received' : item.type === 'transfer' ? 'Money sent' : item.type === 'deposit' ? 'Cash deposit' : 'Cash withdrawal';
  return (
    <View style={styles.transactionRow}>
      <View style={[styles.transactionIcon, { backgroundColor: incoming ? colors.paleGreen : colors.surfaceMuted }]}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemTitle}>{label}</Text>
        <Text style={styles.muted}>{new Date(item.createdAt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</Text>
        {detailed && <Text style={styles.transactionDetail}>Ref: {item.id}{item.fee ? ` · Fee ${peso(item.fee)}` : ''}</Text>}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.transactionAmount, { color: incoming ? colors.green : colors.text }]}>{incoming ? '+' : '−'}{peso(item.amount)}</Text>
        <Text style={styles.transactionStatus}>{item.status}</Text>
      </View>
    </View>
  );
}
function MenuRow({ icon, title, subtitle, onPress }) {
  return <TouchableOpacity onPress={onPress} style={styles.menuRow}><View style={styles.menuIcon}>{icon}</View><View style={{ flex: 1 }}><Text style={styles.itemTitle}>{title}</Text><Text style={styles.muted}>{subtitle}</Text></View><ChevronRight size={19} color={colors.muted} /></TouchableOpacity>;
}
function ProfileLine({ label, value }) {
  return <View style={styles.profileLine}><Text style={styles.muted}>{label}</Text><Text style={styles.profileValue}>{value || '—'}</Text></View>;
}
function NavItem({ icon, label, active, onPress }) {
  return <TouchableOpacity onPress={onPress} style={styles.navItem}><View style={[styles.navIcon, active && styles.navIconActive]}>{React.cloneElement(icon, { color: active ? colors.coffee : colors.muted })}</View><Text style={[styles.navLabel, active && { color: colors.coffee, fontWeight: '800' }]}>{label}</Text></TouchableOpacity>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 12 },
  welcome: { flexGrow: 1, padding: 26, justifyContent: 'space-between', alignItems: 'center', paddingBottom: 34 },
  brandTitle: { fontSize: 34, fontWeight: '900', color: colors.coffeeDark, marginTop: 16, letterSpacing: -1.2 },
  welcomeSubtitle: { color: colors.muted, fontSize: 14, marginTop: 6 },
  welcomeArt: { alignItems: 'center', paddingHorizontal: 22, marginVertical: 28 },
  artCircle: { width: 154, height: 154, borderRadius: 77, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  artTitle: { fontSize: 23, fontWeight: '800', color: colors.coffeeDark, textAlign: 'center' },
  artText: { color: colors.muted, textAlign: 'center', lineHeight: 22, marginTop: 9, maxWidth: 290 },
  disclaimer: { fontSize: 11, color: colors.muted, marginTop: 20, textAlign: 'center' },
  formPage: { flexGrow: 1, padding: 24, paddingBottom: 40 },
  page: { padding: 20, paddingBottom: 110 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26 },
  backButton: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.coffeeDark },
  pageTitle: { fontSize: 27, lineHeight: 33, fontWeight: '900', color: colors.coffeeDark, marginTop: 20, marginBottom: 7, letterSpacing: -0.7 },
  pageSubtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginBottom: 24 },
  fieldLabel: { color: colors.coffee, fontWeight: '700', fontSize: 12, marginBottom: 7 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 15, paddingVertical: 14, color: colors.text, fontSize: 15 },
  button: { minHeight: 52, borderRadius: 15, backgroundColor: colors.coffee, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, marginTop: 10, ...shadow },
  buttonSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, elevation: 0, shadowOpacity: 0 },
  buttonDanger: { backgroundColor: colors.paleRed, borderWidth: 1, borderColor: '#F0D1CC', elevation: 0, shadowOpacity: 0 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  inlineLink: { alignItems: 'center', padding: 18 },
  linkText: { color: colors.coffeeLight, fontWeight: '800', fontSize: 13 },
  smallNote: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 16, textAlign: 'center' },
  segmentRow: { flexDirection: 'row', gap: 10, marginBottom: 16, marginTop: 8 },
  segment: { flex: 1, padding: 13, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center' },
  segmentActive: { borderColor: colors.coffee, backgroundColor: colors.surfaceMuted },
  segmentText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  segmentTextActive: { color: colors.coffee },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  greeting: { color: colors.muted, marginTop: 11, fontSize: 13 },
  avatar: { width: 43, height: 43, borderRadius: 15, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  balanceCard: { backgroundColor: colors.coffee, borderRadius: 24, padding: 22, overflow: 'hidden', minHeight: 178, ...shadow },
  balanceTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  balanceLabel: { color: '#EAD9C8', fontSize: 10, letterSpacing: 1.1, fontWeight: '800' },
  balanceAmount: { color: '#FFFFFF', fontSize: 32, fontWeight: '900', letterSpacing: -0.8, marginTop: 15 },
  accountTag: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 22 },
  accountTagText: { color: '#EAD9C8', fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  balanceDecor: { position: 'absolute', width: 170, height: 170, borderRadius: 85, borderWidth: 28, borderColor: 'rgba(255,255,255,0.06)', right: -65, top: 65 },
  actionsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 22, marginBottom: 25 },
  actionItem: { alignItems: 'center', width: '24%' },
  actionIcon: { width: 54, height: 54, borderRadius: 19, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  actionLabel: { color: colors.text, fontWeight: '700', fontSize: 11, marginTop: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 3 },
  sectionTitle: { color: colors.coffeeDark, fontSize: 17, fontWeight: '900' },
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 14 },
  emptyText: { textAlign: 'center', color: colors.muted, paddingVertical: 24, fontSize: 13 },
  transactionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 11 },
  transactionIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { color: colors.text, fontSize: 13, fontWeight: '800' },
  muted: { color: colors.muted, fontSize: 11, marginTop: 4 },
  transactionAmount: { fontSize: 13, fontWeight: '900' },
  transactionStatus: { color: colors.green, fontSize: 10, textTransform: 'capitalize', marginTop: 4 },
  transactionDetail: { color: colors.muted, fontSize: 10, marginTop: 4 },
  menuRow: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12 },
  menuIcon: { width: 39, height: 39, borderRadius: 13, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  footerNote: { color: colors.muted, fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 18 },
  moneyIcon: { width: 62, height: 62, borderRadius: 20, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  infoCard: { backgroundColor: colors.surfaceMuted, borderColor: colors.surfaceMuted, marginTop: 4, marginBottom: 16 },
  infoTitle: { color: colors.coffee, fontWeight: '800', fontSize: 13 },
  infoText: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 6 },
  profileAvatar: { width: 68, height: 68, borderRadius: 24, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  profileName: { color: colors.coffeeDark, fontSize: 20, fontWeight: '900', marginTop: 12 },
  statusPill: { backgroundColor: colors.paleGreen, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginTop: 10 },
  statusText: { color: colors.green, fontWeight: '900', fontSize: 10, letterSpacing: 0.7 },
  profileLine: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  profileValue: { color: colors.text, fontSize: 13, fontWeight: '700', marginTop: 5 },
  virtualCard: { minHeight: 215, backgroundColor: colors.coffeeDark, borderRadius: 23, padding: 21, overflow: 'hidden', justifyContent: 'space-between', marginTop: 8, marginBottom: 17, ...shadow },
  virtualCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  virtualCardTag: { color: '#E8D2BD', fontWeight: '900', fontSize: 10, letterSpacing: 1.5 },
  virtualCardNumber: { color: '#FFF9F1', fontSize: 19, letterSpacing: 2.1, fontWeight: '700', marginTop: 26 },
  virtualCardBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 25 },
  cardMetaLabel: { color: '#CBB6A2', fontSize: 8, letterSpacing: 1, fontWeight: '800' },
  cardMetaValue: { color: '#FFF9F1', fontSize: 11, fontWeight: '800', marginTop: 5 },
  cardOrbOne: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(201,154,107,0.12)', right: -70, top: -50 },
  cardOrbTwo: { position: 'absolute', width: 110, height: 110, borderRadius: 55, borderWidth: 18, borderColor: 'rgba(255,255,255,0.05)', right: 42, bottom: -70 },
  cardNotice: { flexDirection: 'row', gap: 9, alignItems: 'flex-start', backgroundColor: colors.paleGreen, padding: 13, borderRadius: 13, marginBottom: 15 },
  cardNoticeText: { color: colors.text, fontSize: 11, lineHeight: 17, flex: 1 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 72, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingBottom: 5 },
  navItem: { alignItems: 'center', justifyContent: 'center', width: '25%' },
  navIcon: { width: 36, height: 29, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  navIconActive: { backgroundColor: colors.surfaceMuted },
  navLabel: { color: colors.muted, fontSize: 9, marginTop: 3, fontWeight: '600' },
  busyOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(47,36,31,0.55)', alignItems: 'center', justifyContent: 'center', zIndex: 20 }
});
