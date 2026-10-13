import { generateSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';

/**
 * Generate a new base32 secret for TOTP 2-Factor Authentication
 */
export function generateTwoFactorSecret(): string {
  return generateSecret();
}

/**
 * Generate standard otpauth URL for Google Authenticator / Microsoft Authenticator
 */
export function generateOtpAuthUrl(email: string, secret: string): string {
  return generateURI({
    label: email,
    issuer: 'DigiSkool-IMS',
    secret
  });
}

/**
 * Generate Data URL QR code for scanning in Google Authenticator or Microsoft Authenticator
 */
export async function generateQrCodeDataUrl(otpauthUrl: string): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(otpauthUrl, {
      width: 280,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#1e293b',
        light: '#ffffff'
      }
    });
    if (dataUrl && dataUrl.startsWith('data:image/')) {
      return dataUrl;
    }
  } catch (e) {
    console.warn('QRCode.toDataURL error in totp.ts, falling back to SVG:', e);
  }

  try {
    const svg = await QRCode.toString(otpauthUrl, {
      type: 'svg',
      width: 280,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#1e293b',
        light: '#ffffff'
      }
    });
    if (svg && svg.includes('<svg')) {
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    }
  } catch (e) {
    console.warn('QRCode.toString error in totp.ts, falling back to CDN:', e);
  }

  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(otpauthUrl)}`;
}

/**
 * Verify a 6-digit TOTP code against a user's base32 secret
 */
export function verifyTwoFactorToken(token: string, secret: string): boolean {
  if (!token || !secret) return false;
  const cleanToken = token.trim().replace(/\s+/g, '');
  try {
    const result = verifySync({
      token: cleanToken,
      secret,
      epochTolerance: 30 // Allow 30 seconds clock drift leeway
    });
    return !!result && result.valid === true;
  } catch (err) {
    console.error('TOTP verification error:', err);
    return false;
  }
}
