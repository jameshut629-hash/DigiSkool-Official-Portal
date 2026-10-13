import nodemailer from 'nodemailer';
import { queryOne, runQuery, getDb } from './db.ts';
import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  templateName?: string;
  from?: string;
  replyTo?: string;
}

export interface SmtpConfig {
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  secure?: boolean;
  fromEmail?: string;
  fromName?: string;
}

// Read local DigiSkool emblem image for inline Base64 fallback
let EMBLEM_BASE64 = '';
try {
  const emblemPath = path.join(process.cwd(), 'public', 'favicon.png');
  if (fs.existsSync(emblemPath)) {
    EMBLEM_BASE64 = `data:image/png;base64,${fs.readFileSync(emblemPath).toString('base64')}`;
  }
} catch (e) {
  console.warn('[Email] Could not load local emblem image:', e);
}

// Helper to get active SMTP configuration from DB or process.env
// Defaults to noreply@digiskool.pk per user request
export async function getActiveSmtpConfig(): Promise<SmtpConfig & { replyTo?: string }> {
  let dbSettings: any = null;
  try {
    await getDb();
    dbSettings = queryOne<any>('SELECT * FROM system_settings WHERE id = 1;');
  } catch (err) {
    // Database might still be initializing, proceed with env defaults
  }

  const host = process.env.SMTP_HOST || dbSettings?.smtp_host || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || dbSettings?.smtp_port || 587);
  const user = process.env.SMTP_USER || dbSettings?.smtp_user || '';
  const pass = process.env.SMTP_PASS || dbSettings?.smtp_pass || '';
  const secure = Boolean(process.env.SMTP_SECURE === 'true' || dbSettings?.smtp_secure === 1 || port === 465);
  // Default to noreply@digiskool.pk for outgoing notifications
  const fromEmail = process.env.SMTP_FROM_EMAIL || dbSettings?.smtp_from_email || 'noreply@digiskool.pk';
  const fromName = process.env.SMTP_FROM_NAME || dbSettings?.smtp_from_name || 'DigiSkool-Institute of Digital Skills';
  // Default to support@digiskool.pk for user responses
  const replyTo = process.env.SMTP_REPLY_TO || dbSettings?.email || 'support@digiskool.pk';

  return { host, port, user, pass, secure, fromEmail, fromName, replyTo };
}

// Deliver via Firebase Trigger Email Extension (by writing to 'mail' collection)
async function sendViaFirebaseTriggerEmail(payload: EmailPayload): Promise<boolean> {
  try {
    const config = await getActiveSmtpConfig();
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) return false;

    const configJson = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const app = getApps().length > 0 ? getApp() : initializeApp(configJson);
    const firestore = configJson.firestoreDatabaseId
      ? getFirestore(app, configJson.firestoreDatabaseId)
      : getFirestore(app);

    const fromAddress = payload.from || `"${config.fromName}" <${config.fromEmail}>`;
    const replyToAddress = payload.replyTo || config.replyTo || 'support@digiskool.pk';

    const mailCol = collection(firestore, 'mail');
    await addDoc(mailCol, {
      to: [payload.to],
      from: fromAddress,
      replyTo: replyToAddress,
      message: {
        from: fromAddress,
        replyTo: replyToAddress,
        subject: payload.subject,
        text: payload.text || payload.subject,
        html: payload.html
      },
      createdAt: new Date().toISOString(),
      metadata: {
        source: 'DigiSkool Portal API',
        template: payload.templateName || 'general'
      }
    });

    console.log(`[Email] Document created in Firestore 'mail' collection for ${payload.to} with From: ${fromAddress} and Reply-To: ${replyToAddress}`);
    return true;
  } catch (err: any) {
    console.warn(`[Email] Notice on Firestore 'mail' collection trigger:`, err.message);
    return false;
  }
}

// Send Institutional Email with Dual Delivery (Direct SMTP + Firebase Queue)
export async function sendInstitutionalEmail(
  payload: EmailPayload,
  customConfig?: SmtpConfig & { replyTo?: string }
): Promise<{
  success: boolean;
  method: string;
  details?: string;
}> {
  const baseConfig = await getActiveSmtpConfig();
  const config = {
    ...baseConfig,
    ...(customConfig || {})
  };

  // Clean strings
  if (config.user) config.user = String(config.user).trim();
  if (config.pass) config.pass = String(config.pass).trim();
  if (config.host) config.host = String(config.host).trim();

  const fromAddress = payload.from || `"${config.fromName}" <${config.fromEmail}>`;
  const replyToAddress = payload.replyTo || config.replyTo || 'support@digiskool.pk';
  let smtpSuccess = false;
  let smtpError = '';

  // 1. Attempt Direct SMTP Delivery if credentials exist
  if (config.user && config.pass && config.host) {
    try {
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.pass
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Attach logo as inline CID so all email clients render it natively
      const attachments: any[] = [];
      const logoPath = path.join(process.cwd(), 'public', 'favicon.png');
      if (fs.existsSync(logoPath)) {
        attachments.push({
          filename: 'digiskool-logo.png',
          path: logoPath,
          cid: 'digiskool-logo-cid'
        });
      }

      const info = await transporter.sendMail({
        from: fromAddress,
        replyTo: replyToAddress,
        to: payload.to,
        subject: payload.subject,
        text: payload.text || payload.subject,
        html: payload.html,
        attachments: attachments.length > 0 ? attachments : undefined
      });

      console.log(`[Email] Direct SMTP delivery successful to ${payload.to} (MessageId: ${info.messageId})`);
      smtpSuccess = true;

      // Auto-persist working SMTP credentials if passed in customConfig
      if (customConfig && customConfig.user && customConfig.pass && customConfig.host) {
        try {
          runQuery(`
            UPDATE system_settings
            SET smtp_host = ?, smtp_port = ?, smtp_user = ?, smtp_pass = ?, smtp_secure = ?,
                smtp_from_email = COALESCE(?, smtp_from_email), smtp_from_name = COALESCE(?, smtp_from_name),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = 1;
          `, [
            customConfig.host, customConfig.port || 587, customConfig.user, customConfig.pass,
            customConfig.secure ? 1 : 0, customConfig.fromEmail || null, customConfig.fromName || null
          ]);
        } catch {}
      }

      // Log in database
      try {
        runQuery(`
          INSERT INTO email_logs (recipient_email, subject, template, status, sent_via)
          VALUES (?, ?, ?, 'sent', 'smtp');
        `, [payload.to, payload.subject, payload.templateName || 'notification']);
      } catch {}

      return { success: true, method: 'direct_smtp', details: `Delivered via ${config.host} (${info.messageId})` };
    } catch (err: any) {
      smtpError = err.message || 'SMTP delivery failed';
      console.warn(`[Email] Direct SMTP delivery failed:`, smtpError);
    }
  }

  // 2. Trigger via Firebase Email Queue / Extension (Firestore 'mail' collection)
  const fbSuccess = await sendViaFirebaseTriggerEmail(payload);

  if (fbSuccess) {
    try {
      runQuery(`
        INSERT INTO email_logs (recipient_email, subject, template, status, sent_via)
        VALUES (?, ?, ?, 'sent', 'firebase_trigger');
      `, [payload.to, payload.subject, payload.templateName || 'notification']);
    } catch {}

    return {
      success: true,
      method: 'firebase_trigger',
      details: `Queued in Firestore 'mail' collection for Firebase Trigger Email extension`
    };
  }

  // 3. Fallback log failure
  try {
    runQuery(`
      INSERT INTO email_logs (recipient_email, subject, template, status, error_message, sent_via)
      VALUES (?, ?, ?, 'failed', ?, 'none');
    `, [payload.to, payload.subject, payload.templateName || 'notification', smtpError || 'No SMTP credentials configured']);
  } catch {}

  return {
    success: false,
    method: 'failed',
    details: smtpError || 'Please configure SMTP host, user, and password in Institute Settings'
  };
}

// Base Branded Email Layout Generator (With DigiSkool Logo, Brand Theme, and Responsive Card)
export function buildBrandedEmailHtml(params: {
  title: string;
  recipientName: string;
  leadParagraph: string;
  badge?: { text: string; color: string; bgColor: string };
  keyDetails?: Array<{ label: string; value: string }>;
  actionButton?: { text: string; url: string; color?: string };
  secondaryAction?: { text: string; url: string };
  footerNote?: string;
  warningAlert?: string;
}): string {
  const badgeHtml = params.badge
    ? `
      <div style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: ${params.badge.color}; background-color: ${params.badge.bgColor}; margin-bottom: 12px;">
        ${params.badge.text}
      </div>
    `
    : '';

  const warningHtml = params.warningAlert
    ? `
      <div style="margin: 16px 0; padding: 14px 16px; border-radius: 10px; background-color: #fef2f2; border: 1px solid #fecaca; color: #991b1b; font-size: 13px; line-height: 1.5;">
        <strong>⚠️ Security Notice:</strong> ${params.warningAlert}
      </div>
    `
    : '';

  const detailsHtml = params.keyDetails && params.keyDetails.length > 0
    ? `
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
        <tbody>
          ${params.keyDetails.map((d, idx) => `
            <tr style="border-bottom: ${idx === params.keyDetails!.length - 1 ? 'none' : '1px solid #e2e8f0'};">
              <td style="padding: 12px 16px; font-size: 12px; font-weight: 600; color: #64748b; width: 38%; text-transform: uppercase; letter-spacing: 0.5px;">${d.label}</td>
              <td style="padding: 12px 16px; font-size: 13px; font-weight: 700; color: #0f172a; word-break: break-all;">${d.value}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
    : '';

  const actionHtml = params.actionButton
    ? `
      <div style="text-align: center; margin: 28px 0 16px 0;">
        <a href="${params.actionButton.url}" style="background-color: ${params.actionButton.color || '#6E1231'}; color: #ffffff; padding: 14px 32px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 12px; display: inline-block; box-shadow: 0 4px 10px rgba(110, 18, 49, 0.25); letter-spacing: 0.2px;">
          ${params.actionButton.text}
        </a>
      </div>
    `
    : '';

  const secondaryActionHtml = params.secondaryAction
    ? `
      <div style="text-align: center; margin-bottom: 20px;">
        <a href="${params.secondaryAction.url}" style="font-size: 12px; color: #6E1231; text-decoration: underline; font-weight: 600;">
          ${params.secondaryAction.text}
        </a>
      </div>
    `
    : '';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${params.title}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; -webkit-font-smoothing: antialiased;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08);">
        
        <!-- Brand Header with DigiSkool Logo -->
        <tr>
          <td style="background: linear-gradient(135deg, #6E1231 0%, #4D0A20 100%); padding: 32px 24px; text-align: center;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
              <tr>
                <td style="vertical-align: middle; padding-right: 14px;">
                  <img src="cid:digiskool-logo-cid" alt="DigiSkool Emblem" width="48" height="48" style="display: block; border-radius: 10px; border: 2px solid rgba(255,255,255,0.25); background-color: #6E1231;" onerror="if(typeof EMBLEM_BASE64 !== 'undefined' &amp;&amp; EMBLEM_BASE64){this.src=EMBLEM_BASE64;}else{this.style.display='none';}" />
                </td>
                <td style="vertical-align: middle; text-align: left;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.1;">DigiSkool</h1>
                  <p style="color: #fecdd3; margin: 3px 0 0 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px;">Institute of Digital Skills</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Main Card Body -->
        <tr>
          <td style="padding: 32px 28px;">
            ${badgeHtml}
            <h2 style="margin: 0 0 14px 0; color: #0f172a; font-size: 19px; font-weight: 800; letter-spacing: -0.3px;">${params.title}</h2>
            
            <p style="margin: 0 0 14px 0; font-size: 14px; line-height: 1.6; color: #334155;">
              Dear <strong>${params.recipientName}</strong>,
            </p>
            
            <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #334155;">
              ${params.leadParagraph}
            </p>

            ${warningHtml}
            ${detailsHtml}
            ${actionHtml}
            ${secondaryActionHtml}

            ${params.footerNote ? `
              <div style="font-size: 12px; line-height: 1.5; color: #64748b; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                ${params.footerNote}
              </div>
            ` : ''}
          </td>
        </tr>

        <!-- Institutional Footer -->
        <tr>
          <td style="background-color: #f8fafc; padding: 24px 28px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; line-height: 1.6;">
            <p style="margin: 0 0 4px 0; font-weight: 700; color: #334155; font-size: 12px;">DigiSkool-Institute of Digital Skills</p>
            <p style="margin: 0 0 4px 0;">Lahore Campus: 12-C Commercial Market, NFC Phase 1 | Okara Campus: 185 Faisal Colony 2</p>
            <p style="margin: 0 0 8px 0;">Helpline: +92 331-715-5174 | Support: <a href="mailto:support@digiskool.pk" style="color: #6E1231; text-decoration: none; font-weight: 600;">support@digiskool.pk</a> | Website: <a href="https://digiskool.pk" style="color: #6E1231; text-decoration: none; font-weight: 600;">digiskool.pk</a></p>
            <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 10px;">This is an automated institutional communication sent from <span style="font-family: monospace;">noreply@digiskool.pk</span>. For assistance, write to <a href="mailto:support@digiskool.pk" style="color: #6E1231;">support@digiskool.pk</a>.</p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// =========================================================================
// 4 DEDICATED CUSTOM TEMPLATES REQUESTED BY USER
// =========================================================================

// TEMPLATE 1: Login Alert Template
export function buildLoginAlertEmail(params: {
  recipientName: string;
  userEmail: string;
  timestamp: string;
  ip: string;
  device: string;
  browser: string;
  lockUrl?: string;
  portalUrl?: string;
}): string {
  return buildBrandedEmailHtml({
    title: '🔔 Security Alert: New Login Detected',
    recipientName: params.recipientName,
    badge: { text: 'Security Notification', color: '#1e40af', bgColor: '#dbeafe' },
    leadParagraph: `We detected a successful sign-in to your DigiSkool account (<strong>${params.userEmail}</strong>). Please verify the details below to ensure this was authorized by you.`,
    keyDetails: [
      { label: 'Account Email', value: params.userEmail },
      { label: 'Login Timestamp', value: params.timestamp },
      { label: 'IP Address', value: params.ip },
      { label: 'Device & OS', value: params.device },
      { label: 'Web Browser', value: params.browser }
    ],
    actionButton: {
      text: 'Review Account Security',
      url: params.portalUrl || 'https://digiskool.pk',
      color: '#0f172a'
    },
    warningAlert: 'If you did not initiate this login session, someone may have compromised your password. Please immediately reset your password and lock your account.',
    secondaryAction: params.lockUrl ? {
      text: 'Click here if this was NOT you to secure your account',
      url: params.lockUrl
    } : undefined,
    footerNote: 'This security alert was automatically generated by DigiSkool Guard to safeguard your personal credentials and campus data.'
  });
}

// TEMPLATE 2: Password Reset Template
export function buildPasswordResetEmail(params: {
  recipientName: string;
  userEmail: string;
  resetUrl: string;
  resetToken?: string;
  expiresMinutes?: number;
}): string {
  return buildBrandedEmailHtml({
    title: '🔐 Password Reset Request',
    recipientName: params.recipientName,
    badge: { text: 'Password Recovery', color: '#b45309', bgColor: '#fef3c7' },
    leadParagraph: `We received a request to reset the password for your DigiSkool account (<strong>${params.userEmail}</strong>). Click the secure button below to choose a new password.`,
    keyDetails: [
      { label: 'Account', value: params.userEmail },
      { label: 'Link Expiry', value: `${params.expiresMinutes || 30} Minutes` },
      ...(params.resetToken ? [{ label: 'Reset Code', value: params.resetToken }] : [])
    ],
    actionButton: {
      text: 'Reset My Password',
      url: params.resetUrl,
      color: '#6E1231'
    },
    warningAlert: 'For security reasons, this password reset link will expire in 30 minutes. If you did not request a password reset, you can safely ignore this email; your current password remains secure.',
    footerNote: 'Never share your reset link with anyone. DigiSkool staff will never ask for your password or reset link.'
  });
}

// TEMPLATE 3: Invite Access Template
export function buildInviteAccessEmail(params: {
  recipientName: string;
  userEmail: string;
  tempPassword?: string;
  roleName: string;
  campusAccess: string;
  portalUrl?: string;
}): string {
  return buildBrandedEmailHtml({
    title: '🎓 Welcome to DigiSkool: Account Access Granted',
    recipientName: params.recipientName,
    badge: { text: 'Portal Invitation', color: '#047857', bgColor: '#d1fae5' },
    leadParagraph: `You have been officially invited and granted access to the <strong>DigiSkool Institutional Portal</strong>. Your credentials and assigned access levels are provided below:`,
    keyDetails: [
      { label: 'Account Email', value: params.userEmail },
      ...(params.tempPassword ? [{ label: 'Temporary Password', value: params.tempPassword }] : []),
      { label: 'Assigned Role', value: params.roleName },
      { label: 'Campus Assignment', value: params.campusAccess },
      { label: 'Portal Access', value: 'Active & Verified' }
    ],
    actionButton: {
      text: 'Log In to DigiSkool Portal',
      url: params.portalUrl || 'https://digiskool.pk',
      color: '#6E1231'
    },
    warningAlert: 'For security compliance, please change your temporary password immediately upon your first successful login.',
    footerNote: 'If you have questions regarding your assigned privileges or modules, please contact your campus administration desk.'
  });
}

// TEMPLATE 4: Account Lock with Temporary Unlock Link Template
export function buildAccountLockEmail(params: {
  recipientName: string;
  userEmail: string;
  failCount: number;
  lockDurationMin: number;
  unlockUrl: string;
  clientIp: string;
  timestamp: string;
}): string {
  return buildBrandedEmailHtml({
    title: '🚨 Account Locked: Too Many Failed Login Attempts',
    recipientName: params.recipientName,
    badge: { text: 'Security Lockout', color: '#b91c1c', bgColor: '#fee2e2' },
    leadParagraph: `Your DigiSkool account (<strong>${params.userEmail}</strong>) has been temporarily locked after <strong>${params.failCount} consecutive incorrect password attempts</strong> detected from IP: <code>${params.clientIp}</code>.`,
    keyDetails: [
      { label: 'Account Locked', value: params.userEmail },
      { label: 'Failed Attempts', value: `${params.failCount} Consecutive Failures` },
      { label: 'Lockout Duration', value: `${params.lockDurationMin} Minutes` },
      { label: 'Attempt Timestamp', value: params.timestamp },
      { label: 'Attacking IP', value: params.clientIp }
    ],
    actionButton: {
      text: '🔓 Unlock My Account Now',
      url: params.unlockUrl,
      color: '#b91c1c'
    },
    warningAlert: 'If this was you attempting to sign in, click the button above to immediately unlock your account. This one-time unlock link is cryptographically signed and valid for 30 minutes.',
    footerNote: 'If this was NOT you, someone may be attempting to guess your password. We strongly advise that you unlock your account and immediately change your password.'
  });
}
