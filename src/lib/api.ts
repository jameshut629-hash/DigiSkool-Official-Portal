import { User } from '../types.ts';

const TOKEN_KEY = 'digiskool_auth_token';
const USER_KEY = 'digiskool_user';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): User | null {
  const data = localStorage.getItem(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function setStoredAuth(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  if (response.status === 401) {
    clearStoredAuth();
    // Dispatch auth expiration event
    window.dispatchEvent(new Event('digiskool:unauthorized'));
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}: Request failed`);
  }

  return data as T;
}

export const APP_TIMEZONE = 'Asia/Karachi';

export function formatPKR(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return 'Rs. 0';
  return `Rs. ${Math.round(amount).toLocaleString('en-PK')}`;
}

// Helper to parse date string properly with UTC handling for SQLite timestamps
function parseDateInput(dateString: string | undefined | null): Date | null {
  if (!dateString) return null;
  let str = String(dateString).trim();
  // If string is SQLite "YYYY-MM-DD HH:MM:SS" without offset, append 'Z' for UTC
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(str)) {
    str = str.replace(' ', 'T') + 'Z';
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

// Format Date in Pakistan Standard Time (e.g., "27 Sep 2026")
export function formatDate(dateString: string | undefined | null, options?: Intl.DateTimeFormatOptions): string {
  if (!dateString) return '—';
  try {
    const d = parseDateInput(dateString);
    if (!d) return String(dateString);
    return d.toLocaleDateString('en-GB', {
      timeZone: APP_TIMEZONE,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      ...options
    });
  } catch {
    return String(dateString);
  }
}

// Format Time in Pakistan Standard Time (e.g., "09:21 PM" or "09:21 PM PKT")
export function formatTime(dateString: string | undefined | null, includePktBadge: boolean = false): string {
  if (!dateString) return '—';
  try {
    const d = parseDateInput(dateString);
    if (!d) return String(dateString);
    const timeFormatted = d.toLocaleTimeString('en-US', {
      timeZone: APP_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    return includePktBadge ? `${timeFormatted} PKT` : timeFormatted;
  } catch {
    return String(dateString);
  }
}

// Format Full Date & Time in Pakistan Standard Time (e.g., "27 Sep 2026, 09:21 PM PKT")
export function formatDateTime(dateString: string | undefined | null, includePktBadge: boolean = true): string {
  if (!dateString) return '—';
  try {
    const d = parseDateInput(dateString);
    if (!d) return String(dateString);
    const dateFormatted = d.toLocaleDateString('en-GB', {
      timeZone: APP_TIMEZONE,
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const timeFormatted = d.toLocaleTimeString('en-US', {
      timeZone: APP_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    return `${dateFormatted}, ${timeFormatted}${includePktBadge ? ' PKT' : ''}`;
  } catch {
    return String(dateString);
  }
}

// Get current date string in Pakistan Standard Time (YYYY-MM-DD)
export function getTodayDatePKT(): string {
  const d = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
  return parts;
}
