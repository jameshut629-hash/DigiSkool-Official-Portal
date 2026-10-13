import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// In-memory sliding-window rate limiter stores
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const authLimitStore = new Map<string, RateLimitEntry>();
const apiLimitStore = new Map<string, RateLimitEntry>();
const failedAttemptsStore = new Map<string, { count: number; lockedUntil: number }>();

// Clean up expired rate-limit records every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of authLimitStore.entries()) {
    if (val.resetAt < now) authLimitStore.delete(key);
  }
  for (const [key, val] of apiLimitStore.entries()) {
    if (val.resetAt < now) apiLimitStore.delete(key);
  }
  for (const [key, val] of failedAttemptsStore.entries()) {
    if (val.lockedUntil < now) failedAttemptsStore.delete(key);
  }
}, 10 * 60 * 1000);

// Helper: Extract real client IP
export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || '127.0.0.1';
}

// 1. HTTP Security Headers Middleware
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Hide Express server footprint
  res.removeHeader('X-Powered-By');

  // Prevent MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent Clickjacking (allow same origin)
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // Legacy Cross-Site Scripting protection filter
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Strict Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');

  // Strict Transport Security (HSTS)
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  next();
}

// 2. Auth Route Rate Limiter (Max 15 login attempts per 5 minutes per IP)
export function authRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req);
  const now = Date.now();
  const WINDOW_MS = 5 * 60 * 1000; // 5 minutes
  const MAX_ATTEMPTS = 15;

  const current = authLimitStore.get(ip) || { count: 0, resetAt: now + WINDOW_MS };

  if (current.resetAt < now) {
    current.count = 1;
    current.resetAt = now + WINDOW_MS;
  } else {
    current.count += 1;
  }

  authLimitStore.set(ip, current);

  if (current.count > MAX_ATTEMPTS) {
    const retrySec = Math.ceil((current.resetAt - now) / 1000);
    res.setHeader('Retry-After', retrySec);
    return res.status(429).json({
      error: `Too many authentication attempts. For your security, this IP is temporarily throttled. Please wait ${retrySec} seconds before retrying.`
    });
  }

  next();
}

// 3. General API Rate Limiter (Max 400 requests per minute per IP)
export function apiRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req);
  const now = Date.now();
  const WINDOW_MS = 60 * 1000; // 1 minute
  const MAX_REQUESTS = 400;

  const current = apiLimitStore.get(ip) || { count: 0, resetAt: now + WINDOW_MS };

  if (current.resetAt < now) {
    current.count = 1;
    current.resetAt = now + WINDOW_MS;
  } else {
    current.count += 1;
  }

  apiLimitStore.set(ip, current);

  if (current.count > MAX_REQUESTS) {
    const retrySec = Math.ceil((current.resetAt - now) / 1000);
    res.setHeader('Retry-After', retrySec);
    return res.status(429).json({
      error: 'API rate limit exceeded. Please slow down your requests.',
      retryAfter: retrySec
    });
  }

  next();
}

// 4. SQL Injection & Malicious Script Scanner
const SQL_INJECTION_PATTERNS = [
  /(\bunion\s+(all\s+)?select\b)/i,
  /(\bdrop\s+table\b)/i,
  /(\bexec(\s|\()+(xp_|sp_))/i,
  /(\binsert\s+into\b.*\bvalues\b)/i,
  /(\bdelete\s+from\b.*\bwhere\b)/i,
  /(\bupdate\b.*\bset\b.*\bwhere\b)/i,
  /(';\s*shutdown\b)/i,
  /(\b(and|or)\b\s+['"\d]+\s*=\s*['"\d]+(\s*--|\s*\/\*))/i
];

function containsSqlInjection(value: any): boolean {
  if (typeof value === 'string') {
    for (const pattern of SQL_INJECTION_PATTERNS) {
      if (pattern.test(value)) return true;
    }
  } else if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (containsSqlInjection(value[key])) return true;
    }
  }
  return false;
}

export function sqlInjectionGuard(req: Request, res: Response, next: NextFunction) {
  // Allow safe internal API paths
  if (req.path.startsWith('/api/settings/backup') || req.path.startsWith('/api/audit')) {
    return next();
  }

  if (containsSqlInjection(req.query) || containsSqlInjection(req.body)) {
    console.warn(`[Security] Potential SQL Injection pattern blocked from IP: ${getClientIp(req)} on URL: ${req.originalUrl}`);
    return res.status(403).json({
      error: 'Security Alert: Malicious or illegal query pattern detected. Request blocked by Security Firewall.'
    });
  }

  next();
}

// 5. Account Brute Force Lockout
export function isAccountLocked(email: string): { locked: boolean; remainingSec: number } {
  const cleanEmail = email.toLowerCase().trim();
  const record = failedAttemptsStore.get(cleanEmail);
  if (!record) return { locked: false, remainingSec: 0 };

  const now = Date.now();
  if (record.lockedUntil > now) {
    const remainingSec = Math.ceil((record.lockedUntil - now) / 1000);
    return { locked: true, remainingSec };
  }

  return { locked: false, remainingSec: 0 };
}

export function registerFailedLogin(email: string): number {
  const cleanEmail = email.toLowerCase().trim();
  const record = failedAttemptsStore.get(cleanEmail) || { count: 0, lockedUntil: 0 };
  record.count += 1;

  // After 5 consecutive failed logins, lock account for 15 minutes
  if (record.count >= 5) {
    record.lockedUntil = Date.now() + 15 * 60 * 1000;
  }

  failedAttemptsStore.set(cleanEmail, record);
  return record.count;
}

export function resetFailedLogins(email: string) {
  const cleanEmail = email.toLowerCase().trim();
  failedAttemptsStore.delete(cleanEmail);
}

// 6. Cryptographic Temporary Account Unlock Token
const UNLOCK_SECRET = process.env.UNLOCK_SECRET || 'digiskool_unlock_master_secret_key_2026';

export function generateUnlockToken(email: string): string {
  const expiresAt = Date.now() + 30 * 60 * 1000; // 30 minutes
  const payload = `${email.toLowerCase().trim()}|${expiresAt}`;
  const hmac = crypto.createHmac('sha256', UNLOCK_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}|${hmac}`).toString('base64url');
}

export function verifyUnlockToken(token: string): { valid: boolean; email?: string; error?: string } {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const [email, expiresStr, hmac] = decoded.split('|');
    if (!email || !expiresStr || !hmac) {
      return { valid: false, error: 'Invalid or malformed unlock token format.' };
    }

    const payload = `${email}|${expiresStr}`;
    const expectedHmac = crypto.createHmac('sha256', UNLOCK_SECRET).update(payload).digest('hex');
    if (hmac !== expectedHmac) {
      return { valid: false, error: 'Token signature is invalid or has been tampered with.' };
    }

    if (Date.now() > Number(expiresStr)) {
      return { valid: false, error: 'Unlock link has expired (links are valid for 30 minutes).' };
    }

    return { valid: true, email };
  } catch {
    return { valid: false, error: 'Could not parse unlock token.' };
  }
}
