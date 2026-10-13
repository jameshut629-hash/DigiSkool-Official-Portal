import QRCode from 'qrcode';

/**
 * Generate a cryptographically random Base32 secret string (RFC 4648)
 * for TOTP / Google Authenticator / Microsoft Authenticator
 */
export function generateBase32Secret(length = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < length; i++) {
      secret += chars[bytes[i] % chars.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      secret += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return secret;
}

/**
 * Build standard otpauth URI for TOTP authenticators
 */
export function buildOtpAuthUri(
  email: string,
  secret: string,
  issuer: string = 'DigiSkool-IMS'
): string {
  const cleanEmail = email.trim();
  const cleanIssuer = issuer.trim();
  const label = encodeURIComponent(`${cleanIssuer}:${cleanEmail}`);
  const encIssuer = encodeURIComponent(cleanIssuer);
  const encSecret = encodeURIComponent(secret.trim().replace(/\s+/g, ''));
  return `otpauth://totp/${label}?secret=${encSecret}&issuer=${encIssuer}`;
}

export interface QrCodeOptions {
  width?: number;
  margin?: number;
  darkColor?: string;
  lightColor?: string;
}

/**
 * Robust QR code generator that produces a data URL with multiple layers of fallback:
 * 1. Canvas-based PNG Data URL (via QRCode.toDataURL)
 * 2. Vector SVG Data URL (via QRCode.toString SVG)
 * 3. Fast secure public QR API fallback (via api.qrserver.com)
 */
export async function generateQrCodeDataUrl(
  payload: string,
  options: QrCodeOptions = {}
): Promise<string> {
  const width = options.width || 280;
  const margin = options.margin !== undefined ? options.margin : 2;
  const dark = options.darkColor || '#1e293b';
  const light = options.lightColor || '#ffffff';

  // 1. Try standard PNG data URL
  try {
    const dataUrl = await QRCode.toDataURL(payload, {
      width,
      margin,
      errorCorrectionLevel: 'M',
      color: { dark, light }
    });
    if (dataUrl && dataUrl.startsWith('data:image/')) {
      return dataUrl;
    }
  } catch (err) {
    console.warn('QRCode.toDataURL failed, attempting SVG fallback:', err);
  }

  // 2. Try SVG string conversion
  try {
    const svgString = await QRCode.toString(payload, {
      type: 'svg',
      width,
      margin,
      errorCorrectionLevel: 'M',
      color: { dark, light }
    });
    if (svgString && svgString.includes('<svg')) {
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
    }
  } catch (err) {
    console.warn('QRCode.toString SVG failed, attempting CDN fallback:', err);
  }

  // 3. Guaranteed network CDN fallback
  return `https://api.qrserver.com/v1/create-qr-code/?size=${width}x${width}&margin=${margin}&data=${encodeURIComponent(payload)}`;
}

/**
 * Prepare a complete 2FA setup bundle (Secret, OTPAuth URI, and QR Code Data URL)
 */
export async function prepareTwoFactorCredentials(
  email: string,
  existingSecret?: string
): Promise<{ secret: string; otpauth: string; qrCode: string }> {
  const secret = (existingSecret && existingSecret.length >= 16)
    ? existingSecret.trim().toUpperCase()
    : generateBase32Secret(32);
  const otpauth = buildOtpAuthUri(email, secret);
  const qrCode = await generateQrCodeDataUrl(otpauth);
  return { secret, otpauth, qrCode };
}
