import { Platform } from 'react-native';

// For web and mobile, determine API base URL dynamically
const getBaseUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }
  return 'http://localhost:5000/api';
};

export const API_BASE_URL = getBaseUrl();

const TOKEN_KEY = 'linkpay_auth_token_v1';

// Web localStorage / in-memory fallback
let memoryToken = null;

export async function saveToken(token) {
  memoryToken = token;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(TOKEN_KEY, token);
    } catch {}
  }
}

export async function getToken() {
  if (memoryToken) return memoryToken;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(TOKEN_KEY);
      if (stored) {
        memoryToken = stored;
        return stored;
      }
    } catch {}
  }
  return null;
}

export async function clearToken() {
  memoryToken = null;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(TOKEN_KEY);
    } catch {}
  }
}

export async function apiRequest(endpoint, options = {}) {
  const token = await getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.message || `Request failed with status ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}
