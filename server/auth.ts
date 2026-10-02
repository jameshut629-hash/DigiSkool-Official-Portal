import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { queryOne, queryAll, runQuery } from './db.ts';

export interface UserPayload {
  id: number;
  name: string;
  email: string;
  role: string;
  permission_level?: string;
  campus_access?: string;
  allowed_modules?: string;
  phone?: string;
  status: string;
  two_factor_enabled?: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

// Generate secure random session token
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Extract client IP and user agent info
export function getClientInfo(req: Request) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : (req.socket.remoteAddress || '127.0.0.1');
  const userAgent = req.headers['user-agent'] || 'Unknown Browser';

  let browser = 'Unknown Browser';
  let device = 'Desktop';

  if (/chrome/i.test(userAgent) && !/edg/i.test(userAgent)) browser = 'Google Chrome';
  else if (/firefox/i.test(userAgent)) browser = 'Mozilla Firefox';
  else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) browser = 'Apple Safari';
  else if (/edg/i.test(userAgent)) browser = 'Microsoft Edge';

  if (/mobile|android|iphone|ipad/i.test(userAgent)) device = 'Mobile / Tablet';
  else if (/macintosh|mac os/i.test(userAgent)) device = 'Macintosh Desktop';
  else if (/windows/i.test(userAgent)) device = 'Windows PC';
  else if (/linux/i.test(userAgent)) device = 'Linux Workstation';

  return { ip, userAgent, browser, device };
}

// Security alert email generator - dispatches to account holder's email & Main Admin
export function sendLoginAlertEmail(user: UserPayload, clientInfo: { ip: string; browser: string; device: string; userAgent: string }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { timeZone: 'Asia/Karachi', day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' PKT';

  const roleTitle = user.role === 'main_admin' ? 'Main Admin' : user.role === 'principal' ? 'Principal' : user.role === 'admin_hr' ? 'Admin/HR' : user.role.toUpperCase();
  const permissionTitle = user.permission_level === 'full' ? 'Full Access' : user.permission_level === 'limited' ? 'Limited Permission' : 'Selective Permission';
  const campusTitle = user.campus_access === 'all' ? 'Both Lahore & Okara' : user.campus_access === 'okara' ? 'Okara Campus Only' : 'Lahore Campus Only';

  const subject = `DigiSkool Security Alert: New Login Detected (${user.name} - ${user.email})`;
  const body = `
========================================================================
DIGISKOOL - INSTITUTE OF DIGITAL SKILLS
INSTITUTIONAL SECURITY & LOGIN DETECTION SYSTEM
========================================================================

Hello ${user.name},

A new login session has been successfully established for your DigiSkool account:
• Email Address: ${user.email}
• User Role: ${roleTitle}
• Permission Level: ${permissionTitle}
• Campus Access: ${campusTitle}

LOGIN EVENT METRICS (Pakistan Standard Time):
• Date: ${dateStr}
• Time: ${timeStr} (Asia/Karachi)
• IP Address: ${clientInfo.ip}
• Device: ${clientInfo.device}
• Browser: ${clientInfo.browser}
• Status: Successfully Authenticated

WAS THIS YOU?
If you recognized this sign-in, no further action is required.
If this login was unexpected, unauthorized, or you suspect any compromise, please contact the Main Admin (adnanmrao@gmail.com) immediately or have your session revoked via the DigiSkool Security Console.

------------------------------------------------------------------------
DigiSkool - Institute of Digital Skills
Campuses: Lahore & Okara | Helpline: 0331-7155174 | https://digiskool.pk
Designed & Developed & Managed by GenZ Lab
========================================================================
  `.trim();

  // Log and dispatch to the logged in account's email address
  runQuery(`
    INSERT INTO email_logs (recipient_email, recipient_name, subject, body, type, status, related_id)
    VALUES (?, ?, ?, ?, 'login_detected', 'delivered', ?);
  `, [user.email, user.name, subject, body, String(user.id)]);

  // Also notify Main Admin if different
  const mainAdminEmail = 'adnanmrao@gmail.com';
  if (user.email.toLowerCase() !== mainAdminEmail.toLowerCase()) {
    runQuery(`
      INSERT INTO email_logs (recipient_email, recipient_name, subject, body, type, status, related_id)
      VALUES (?, ?, ?, ?, 'login_detected_admin', 'delivered', ?);
    `, [mainAdminEmail, 'Main Admin (Adnan Rao)', `[Admin Audit] ${subject}`, body, String(user.id)]);
  }

  console.log(`[Security Alert] Login notification dispatched to ${user.email} and ${mainAdminEmail} at ${timeStr}`);
}

// Record an audit log entry
export function logAudit(
  user: UserPayload | undefined,
  action: string,
  module: string,
  recordId: string,
  details: string,
  req?: Request,
  oldValues?: any,
  newValues?: any
) {
  const ip = req ? getClientInfo(req).ip : '127.0.0.1';
  const userId = user?.id || 0;
  const userName = user?.name || 'System';
  const userRole = user?.role || 'system';

  runQuery(`
    INSERT INTO audit_logs (user_id, user_name, user_role, action, module, record_id, details, old_values, new_values, ip)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `, [
    userId,
    userName,
    userRole,
    action,
    module,
    recordId,
    details,
    oldValues ? JSON.stringify(oldValues) : null,
    newValues ? JSON.stringify(newValues) : null,
    ip
  ]);
}

// Authentication Middleware
export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  const token = authHeader.split(' ')[1];
  const session = queryOne<{
    token: string;
    user_id: number;
    expires_at: string;
    id: number;
    name: string;
    email: string;
    role: string;
    permission_level?: string;
    campus_access?: string;
    allowed_modules?: string;
    phone: string;
    status: string;
    two_factor_enabled?: number;
  }>(`
    SELECT s.token, s.user_id, s.expires_at, u.id, u.name, u.email, u.role, u.permission_level, u.campus_access, u.allowed_modules, u.phone, u.status, u.two_factor_enabled
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ?;
  `, [token]);

  if (!session) {
    return res.status(401).json({ error: 'Session invalid or expired. Please log in again.' });
  }

  if (new Date(session.expires_at) < new Date()) {
    runQuery('DELETE FROM sessions WHERE token = ?;', [token]);
    return res.status(401).json({ error: 'Session has expired. Please log in again.' });
  }

  if (session.status === 'disabled') {
    return res.status(403).json({ error: 'This user account has been disabled by institute administration.' });
  }

  // Update last active timestamps for user and session
  try {
    runQuery('UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = ?;', [session.id]);
    runQuery('UPDATE sessions SET last_active_at = CURRENT_TIMESTAMP WHERE token = ?;', [token]);
  } catch {
    // Non-blocking
  }

  req.user = {
    id: session.id,
    name: session.name,
    email: session.email,
    role: session.role,
    permission_level: session.permission_level || 'full',
    campus_access: session.campus_access || 'all',
    allowed_modules: session.allowed_modules || 'all',
    phone: session.phone,
    status: session.status,
    two_factor_enabled: Boolean(session.two_factor_enabled)
  };

  next();
}

// Role Authorization Middleware
export function requireRoles(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const r = req.user.role;
    // Main Admin / Owner always has full administrative access
    if (r === 'main_admin' || r === 'owner') {
      return next();
    }

    // Role mapping: principal and admin_hr count as admin/staff
    if (allowedRoles.includes(r)) {
      return next();
    }
    if (allowedRoles.includes('admin') && (r === 'principal' || r === 'admin_hr')) {
      return next();
    }
    if (allowedRoles.includes('accountant') && (r === 'principal' || r === 'admin_hr')) {
      return next();
    }

    return res.status(403).json({
      error: `Access Denied: Your role (${req.user.role}) does not have permission to perform this action.`
    });
  };
}

// Strict Owner / Main Admin check
export function requireOwner(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || (req.user.role !== 'owner' && req.user.role !== 'main_admin')) {
    return res.status(403).json({
      error: 'Please contact to admin for deletion of data. Permanent data deletion is strictly restricted.'
    });
  }
  next();
}
