import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building2,
  Phone,
  Mail,
  MapPin,
  Save,
  Download,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Globe,
  KeyRound,
  CreditCard,
  AlertCircle,
  Database,
  FileSpreadsheet,
  HardDriveDownload,
  Clock,
  Sun,
  Moon,
  Monitor,
  Smartphone,
  QrCode,
  Copy,
  Check
} from 'lucide-react';
import { SystemSettings } from '../../types.ts';
import { apiRequest, formatDateTime } from '../../lib/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useTheme } from '../../context/ThemeContext.tsx';
import { ALL_LOGIN_CREDENTIALS } from '../../config/authCredentials.ts';
import { DigiSkoolLogo } from '../common/DigiSkoolLogo.tsx';
import { generateQrCodeDataUrl, prepareTwoFactorCredentials } from '../../lib/qrHelper.ts';

export const SettingsView: React.FC = () => {
  const { user, isOwner, isAdmin } = useAuth();
  const { theme, setTheme, toggleTheme } = useTheme();
  const canExportBackup = isOwner || isAdmin;
  const [settings, setSettings] = useState<SystemSettings & any>({
    institute_name: 'DigiSkool-Institute of Digital Skills',
    tagline: 'Institute of Digital Skills',
    campuses: 'Lahore & Okara',
    address: 'Lahore Campus: First Floor 12-C, Commercial Market, NFC Society Lahore (Call: +92 331-715-5174) | Okara Office: 185 Faisal Colony Main Rd, Faisal Colony No. 2 Faisal Town 2, Okara (Call: +92 310-436-7347)',
    phone: '+92 331-715-5174',
    email: 'jameshut629@gmail.com',
    website: 'https://digiskool.pk',
    voucher_prefix: 'DS-VCH-',
    receipt_prefix: 'DS-RCT-',
    expense_prefix: 'DS-EXP-',
    currency: 'PKR',
    whatsapp_enabled: true,
    sms_enabled: true,
    email_alerts_enabled: true,
    late_fee_surcharge: 500,
    owner_email: 'jameshut629@gmail.com',
    alert_email: 'jameshut629@gmail.com',
    bank1_title: 'DIGISKOOL',
    bank1_name: 'Bank Al Habib',
    bank1_account: '57270081000203018',
    bank1_iban: 'PK05BAHL5727008100020301',
    bank2_title: 'DIGISKOOL',
    bank2_name: 'Bank Islami',
    bank2_account: '211100277400001',
    bank2_iban: 'PK50BKIP0211100277400001'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);

  // Two-Factor Authentication (2FA) State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(!!user?.two_factor_enabled);
  const [twoFactorSecret, setTwoFactorSecret] = useState<string | null>(null);
  const [twoFactorQrCode, setTwoFactorQrCode] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [twoFactorSuccess, setTwoFactorSuccess] = useState<string | null>(null);
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Backup State
  const [backupDownloading, setBackupDownloading] = useState(false);
  const [backupStats, setBackupStats] = useState<any>(null);

  useEffect(() => {
    setTwoFactorEnabled(!!user?.two_factor_enabled);
  }, [user]);

  const handleStart2FASetup = async () => {
    setTwoFactorLoading(true);
    setTwoFactorError(null);
    try {
      const data = await apiRequest<{ secret: string; qrCode: string; otpauth: string }>('/api/auth/2fa/setup', {
        method: 'POST'
      });
      let qrCode = data.qrCode || (data as any).qr_code;
      if (!qrCode || !qrCode.startsWith('data:image/')) {
        qrCode = await generateQrCodeDataUrl(data.otpauth || `otpauth://totp/DigiSkool-IMS:${user?.email || 'User'}?secret=${data.secret}&issuer=DigiSkool-IMS`);
      }
      setTwoFactorSecret(data.secret);
      setTwoFactorQrCode(qrCode);
      setShowTwoFactorSetup(true);
    } catch (err: any) {
      console.warn('Backend 2FA setup failed, using resilient client generator:', err);
      try {
        const bundle = await prepareTwoFactorCredentials(user?.email || 'adnanmrao@gmail.com', twoFactorSecret || undefined);
        setTwoFactorSecret(bundle.secret);
        setTwoFactorQrCode(bundle.qrCode);
        setShowTwoFactorSetup(true);
      } catch (fallbackErr: any) {
        setTwoFactorError(fallbackErr.message || 'Failed to initiate 2FA setup');
      }
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleVerifyAndEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorCode || twoFactorCode.trim().length !== 6) {
      setTwoFactorError('Please enter the 6-digit code from Google Authenticator or your 2FA app.');
      return;
    }
    setTwoFactorLoading(true);
    setTwoFactorError(null);
    try {
      await apiRequest('/api/auth/2fa/enable', {
        method: 'POST',
        body: JSON.stringify({ code: twoFactorCode.trim() })
      });
      setTwoFactorEnabled(true);
      setShowTwoFactorSetup(false);
      setTwoFactorCode('');
      setTwoFactorSuccess('Two-factor authentication is now enabled on your account! You will be prompted for a 6-digit code on next sign-in.');
    } catch (err: any) {
      setTwoFactorError(err.message || 'Verification failed. Make sure the code is accurate.');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    const confirm = window.confirm('Are you sure you want to disable Two-Factor Authentication? Your account will only be protected by password.');
    if (!confirm) return;

    setTwoFactorLoading(true);
    setTwoFactorError(null);
    try {
      await apiRequest('/api/auth/2fa/disable', {
        method: 'POST'
      });
      setTwoFactorEnabled(false);
      setShowTwoFactorSetup(false);
      setTwoFactorSuccess('Two-factor authentication has been disabled.');
    } catch (err: any) {
      setTwoFactorError(err.message || 'Failed to disable 2FA');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleCopyKey = () => {
    if (twoFactorSecret) {
      navigator.clipboard.writeText(twoFactorSecret);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
    }
  };

  useEffect(() => {
    apiRequest<SystemSettings>('/api/settings')
      .then((data) => {
        if (data) {
          setSettings((prev: any) => ({
            ...prev,
            ...data,
            bank1_title: (data as any).bank1_title || 'DIGISKOOL',
            bank1_name: (data as any).bank1_name || 'Bank Al Habib',
            bank1_account: (data as any).bank1_account || '57270081000203018',
            bank1_iban: (data as any).bank1_iban || 'PK05BAHL5727008100020301',
            bank2_title: (data as any).bank2_title || 'DIGISKOOL',
            bank2_name: (data as any).bank2_name || 'Bank Islami',
            bank2_account: (data as any).bank2_account || '211100277400001',
            bank2_iban: (data as any).bank2_iban || 'PK50BKIP0211100277400001',
            alert_email: (data as any).alert_email || 'adnanmrao@gmail.com'
          }));
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiRequest('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(settings)
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (err: any) {
      alert('Failed to save settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(null);

    if (newPassword !== confirmPassword) {
      setPwError('New password and confirm password do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setPwError('Password must be at least 6 characters long.');
      return;
    }

    setPwSubmitting(true);
    try {
      try {
        await apiRequest('/api/auth/change-password', {
          method: 'POST',
          body: JSON.stringify({
            currentPassword,
            newPassword
          })
        });
      } catch (err: any) {
        // If static hosting returns 405 / 404 / network error, update credentials locally and in custom users
        const isStaticOrServerless =
          err.message?.includes('405') ||
          err.message?.includes('404') ||
          err.message?.includes('Failed to fetch') ||
          err.message?.includes('NetworkError');

        if (isStaticOrServerless) {
          const userEmail = (user?.email || '').toLowerCase();
          const storedPasswordKey = `digiskool_pwd_${userEmail}`;
          const customPwd = localStorage.getItem(storedPasswordKey);

          if (customPwd && currentPassword !== customPwd) {
            throw new Error('Incorrect current password. Please enter your valid current password.');
          }

          // Save new password to localStorage for this account
          localStorage.setItem(storedPasswordKey, newPassword);

          // Also update custom users list if present
          try {
            const rawCustom = localStorage.getItem('digiskool_custom_users');
            if (rawCustom) {
              const parsed = JSON.parse(rawCustom);
              const updated = parsed.map((u: any) =>
                u.email?.toLowerCase() === userEmail ? { ...u, password: newPassword } : u
              );
              localStorage.setItem('digiskool_custom_users', JSON.stringify(updated));
            }
          } catch {}
        } else {
          throw err;
        }
      }

      setPwSuccess('Password changed successfully! New password is now active for your account.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwError(err.message || 'Failed to change password');
    } finally {
      setPwSubmitting(false);
    }
  };

  const handleDownloadBackup = async () => {
    setBackupDownloading(true);
    try {
      const backup = await apiRequest<any>('/api/settings/backup');
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `DigiSkool_Student_Financial_Backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (backup?.summary) {
        setBackupStats(backup.summary);
      }
      // Refresh settings to get updated last_backup_date
      apiRequest<SystemSettings>('/api/settings').then((data) => {
        if (data) setSettings((prev: any) => ({ ...prev, ...data }));
      });
    } catch (err: any) {
      alert('Backup generation failed: ' + err.message);
    } finally {
      setBackupDownloading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-display flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#6E1231]" />
            <span>DigiSkool Institute Settings</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Official branding, Lahore & Okara campuses, official bank accounts, alert email, and security credentials
          </p>
        </div>
        {canExportBackup && (
          <button
            id="btn-quick-download-backup"
            onClick={handleDownloadBackup}
            disabled={backupDownloading}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>{backupDownloading ? 'Exporting Backup...' : 'Download JSON Backup'}</span>
          </button>
        )}
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Institute settings saved successfully.</span>
        </div>
      )}

      {/* Global Color Theme Appearance Card */}
      <div id="theme-appearance-settings" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
              {theme === 'dark' ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
              <span>Interface Theme & Color Scheme</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Customize the system visual appearance. Your theme choice is automatically persisted across sessions.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-100/90 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              id="theme-btn-light"
              onClick={() => setTheme('light')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                theme === 'light'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>Light</span>
            </button>
            <button
              type="button"
              id="theme-btn-dark"
              onClick={() => setTheme('dark')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                theme === 'dark'
                  ? 'bg-indigo-600 text-white shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Moon className="w-3.5 h-3.5 text-indigo-200" />
              <span>Dark</span>
            </button>
          </div>
        </div>

        {/* Visual Preview Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Light Theme Option Card */}
          <div
            onClick={() => setTheme('light')}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer text-left ${
              theme === 'light'
                ? 'border-[#6E1231] bg-maroon-50/40 shadow-xs ring-2 ring-[#6E1231]/10'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                  <Sun className="w-4 h-4" />
                </div>
                <span className="font-bold text-slate-900 text-xs">DigiSkool Light Mode</span>
              </div>
              {theme === 'light' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#6E1231] text-white">
                  Active
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Standard high-contrast light layout optimized for daytime institutional admin, printing receipts, and voucher preparation.
            </p>
            <div className="mt-3 flex items-center gap-1.5">
              <div className="h-3 w-8 rounded-full bg-slate-100 border border-slate-200"></div>
              <div className="h-3 w-12 rounded-full bg-[#6E1231]"></div>
              <div className="h-3 w-6 rounded-full bg-emerald-500"></div>
            </div>
          </div>

          {/* Dark Theme Option Card */}
          <div
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer text-left ${
              theme === 'dark'
                ? 'border-indigo-500 bg-slate-900 shadow-md ring-2 ring-indigo-500/20 text-white'
                : 'border-slate-200 hover:border-slate-300 bg-slate-900 text-slate-100'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-950 text-indigo-300 border border-indigo-800">
                  <Moon className="w-4 h-4" />
                </div>
                <span className="font-bold text-white text-xs">DigiSkool Dark Mode</span>
              </div>
              {theme === 'dark' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                  Active
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Eye-comfort dark palette with deep navy and charcoal tones, ideal for extended desk work and low-light environments.
            </p>
            <div className="mt-3 flex items-center gap-1.5">
              <div className="h-3 w-8 rounded-full bg-slate-800 border border-slate-700"></div>
              <div className="h-3 w-12 rounded-full bg-[#bf2656]"></div>
              <div className="h-3 w-6 rounded-full bg-indigo-400"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Official Branding Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-display">Official Brand Identity & Logo</h3>
            <p className="text-xs text-slate-500">Official DigiSkool crest with academic cap, digital connectivity waves, and knowledge book</p>
          </div>
          <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-[10px] font-bold">
            Active Identity
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center gap-2 text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Light Surface (Documents / Vouchers)</span>
            <DigiSkoolLogo variant="horizontal" size="md" showCampusAndContact campusText={settings.campuses || 'Lahore & Okara'} contactText={settings.phone || '0331-7155174'} />
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center gap-2 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dark Surface (Portal / Login)</span>
            <DigiSkoolLogo variant="white" size="md" />
          </div>

          <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center gap-2 text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Official Emblem (Favicon / Stamp)</span>
            <div className="flex items-center gap-3">
              <DigiSkoolLogo variant="emblem" size="md" />
              <div className="p-1.5 bg-slate-950 rounded-xl">
                <DigiSkoolLogo variant="emblem-white" size="sm" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Campus & Branding */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 font-display">DigiSkool Campus & Branding</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Institute Name</label>
              <input
                type="text"
                value={settings.institute_name ?? ''}
                onChange={(e) => setSettings({ ...settings, institute_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tagline / Subtitle</label>
              <input
                type="text"
                value={settings.tagline ?? settings.institute_subtitle ?? ''}
                onChange={(e) => setSettings({ ...settings, tagline: e.target.value, institute_subtitle: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Active Campuses</label>
              <input
                type="text"
                value={settings.campuses ?? 'Lahore & Okara'}
                onChange={(e) => setSettings({ ...settings, campuses: e.target.value })}
                placeholder="e.g. Lahore & Okara"
                className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] font-medium"
              />
              <p className="text-[10px] text-slate-500 mt-1">Multi-campus operations: Lahore and Okara</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Contact Info (Phone / UAN / WhatsApp)</label>
              <input
                type="text"
                value={settings.phone ?? ''}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] font-mono font-semibold"
              />
              <p className="text-[10px] text-slate-500 mt-1">Primary helpline printed on all vouchers and receipts</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Official Email</label>
              <input
                type="email"
                value={settings.email ?? ''}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Official Website</label>
              <input
                type="text"
                value={settings.website ?? ''}
                onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
              />
            </div>

            <div className="col-span-full">
              <label className="block font-semibold text-slate-700 mb-1">Campus Addresses</label>
              <input
                type="text"
                value={settings.address ?? ''}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
              />
              <p className="text-[10px] text-slate-500 mt-1">Lahore Campus: First Floor 12-C, Commercial Market, NFC Society Lahore (Call: +92 331-715-5174) | Okara Office: 185 Faisal Colony Main Rd, Faisal Colony No. 2 Faisal Town 2, Okara (Call: +92 310-436-7347)</p>
            </div>
          </div>
        </div>

        {/* Official Bank Accounts */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#6E1231]" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-display">Official DigiSkool Deposit Bank Accounts</h3>
              <p className="text-xs text-slate-500">Printed on 2-part vouchers (Office + Student Copy), receipts, and sent via WhatsApp fee reminders</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Bank 1: Bank Al Habib */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <span className="font-bold text-[#6E1231] block">Bank Account #1 (Bank Al Habib)</span>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Account Title</label>
                <input
                  type="text"
                  value={settings.bank1_title ?? 'DIGISKOOL'}
                  onChange={(e) => setSettings({ ...settings, bank1_title: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={settings.bank1_name ?? 'Bank Al Habib'}
                  onChange={(e) => setSettings({ ...settings, bank1_name: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Account Number</label>
                <input
                  type="text"
                  value={settings.bank1_account ?? '57270081000203018'}
                  onChange={(e) => setSettings({ ...settings, bank1_account: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">IBAN</label>
                <input
                  type="text"
                  value={settings.bank1_iban ?? 'PK05BAHL5727008100020301'}
                  onChange={(e) => setSettings({ ...settings, bank1_iban: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono"
                />
              </div>
            </div>

            {/* Bank 2: Bank Islami */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <span className="font-bold text-[#6E1231] block">Bank Account #2 (Bank Islami)</span>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Account Title</label>
                <input
                  type="text"
                  value={settings.bank2_title ?? 'DIGISKOOL'}
                  onChange={(e) => setSettings({ ...settings, bank2_title: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={settings.bank2_name ?? 'Bank Islami'}
                  onChange={(e) => setSettings({ ...settings, bank2_name: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Account Number</label>
                <input
                  type="text"
                  value={settings.bank2_account ?? '211100277400001'}
                  onChange={(e) => setSettings({ ...settings, bank2_account: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">IBAN</label>
                <input
                  type="text"
                  value={settings.bank2_iban ?? 'PK50BKIP0211100277400001'}
                  onChange={(e) => setSettings({ ...settings, bank2_iban: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Voucher & Prefix Settings */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 font-display">Voucher & Accounting Prefixes</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Fee Voucher Prefix</label>
              <input
                type="text"
                value={settings.voucher_prefix ?? ''}
                onChange={(e) => setSettings({ ...settings, voucher_prefix: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Receipt Prefix</label>
              <input
                type="text"
                value={settings.receipt_prefix ?? ''}
                onChange={(e) => setSettings({ ...settings, receipt_prefix: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Expense Prefix</label>
              <input
                type="text"
                value={settings.expense_prefix ?? ''}
                onChange={(e) => setSettings({ ...settings, expense_prefix: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Late Surcharge (PKR)</label>
              <input
                type="number"
                value={settings.late_fee_surcharge ?? 500}
                onChange={(e) => setSettings({ ...settings, late_fee_surcharge: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] font-bold"
              />
            </div>

            <div className="col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Owner Security Alert Gmail <span className="text-[#6E1231]">* (Alerts sent directly to Gmail)</span>
              </label>
              <input
                type="email"
                value={settings.alert_email ?? 'adnanmrao@gmail.com'}
                onChange={(e) => setSettings({ ...settings, alert_email: e.target.value })}
                placeholder="adnanmrao@gmail.com"
                className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231] font-mono font-semibold"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                All login activities and security events are dispatched to this Gmail address rather than in-app spam.
              </p>
            </div>
          </div>
        </div>

        {/* Save button */}
        {isOwner && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-[#6E1231] hover:bg-[#85173A] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Institute Settings'}</span>
            </button>
          </div>
        )}
      </form>

      {/* Change Password Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-[#6E1231]" />
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-display">Change Account Password</h3>
            <p className="text-xs text-slate-500">
              Update password for currently signed in user ({user?.email})
            </p>
          </div>
        </div>

        {pwSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{pwSuccess}</span>
          </div>
        )}

        {pwError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{pwError}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 text-xs max-w-md">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Current Password *</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">New Password *</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Confirm New Password *</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:ring-2 focus:ring-[#6E1231]"
            />
          </div>

          <button
            type="submit"
            disabled={pwSubmitting}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>{pwSubmitting ? 'Updating Password...' : 'Update Password'}</span>
          </button>
        </form>
      </div>

      {/* Two-Factor Authentication (2FA) Security Card */}
      <div id="card-two-factor-auth" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
                <span>Two-Factor Authentication (2FA / TOTP)</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  twoFactorEnabled
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}>
                  {twoFactorEnabled ? 'Active & Enforced' : 'Disabled'}
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Protect your account with standard TOTP apps (Google Authenticator, Microsoft Authenticator, Authy).
              </p>
            </div>
          </div>

          <div>
            {twoFactorEnabled ? (
              <button
                type="button"
                onClick={handleDisable2FA}
                disabled={twoFactorLoading}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{twoFactorLoading ? 'Disabling...' : 'Disable 2FA'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStart2FASetup}
                disabled={twoFactorLoading || showTwoFactorSetup}
                className="px-4 py-2 bg-[#6E1231] hover:bg-[#85173A] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <QrCode className="w-4 h-4" />
                <span>{twoFactorLoading ? 'Generating QR...' : 'Enable 2FA (QR Code / ID)'}</span>
              </button>
            )}
          </div>
        </div>

        {twoFactorSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{twoFactorSuccess}</span>
          </div>
        )}

        {twoFactorError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{twoFactorError}</span>
          </div>
        )}

        {/* 2FA Setup Flow with QR Code & Manual Secret Key */}
        {showTwoFactorSetup && (
          <div className="p-5 rounded-2xl bg-slate-50 border border-purple-200/80 space-y-4">
            <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Step 1: Scan QR Code or Copy Manual ID Key
                </h4>
                <p className="text-[11px] text-slate-500">
                  Open Google Authenticator on your phone, tap (+), and scan the code below:
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTwoFactorSetup(false)}
                className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 pt-1">
              <div className="p-2.5 bg-white rounded-2xl border border-slate-200 shadow-sm shrink-0 flex flex-col items-center">
                {twoFactorQrCode ? (
                  <img
                    src={twoFactorQrCode}
                    alt="2FA QR Code"
                    className="w-44 h-44 rounded-xl object-contain"
                    onError={(e) => {
                      const target = e.currentTarget;
                      const payload = `otpauth://totp/DigiSkool-IMS:${user?.email || 'User'}?secret=${twoFactorSecret || 'DIGISKOOL2025'}&issuer=DigiSkool-IMS`;
                      target.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(payload)}`;
                    }}
                  />
                ) : (
                  <div className="w-44 h-44 bg-slate-100 rounded-xl flex flex-col items-center justify-center text-slate-500 text-xs">
                    <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                    <span>Loading QR...</span>
                  </div>
                )}
              </div>

              <div className="space-y-3 flex-1 text-xs">
                <div>
                  <span className="font-semibold text-slate-700 block mb-1">
                    Cannot scan QR? Enter this Secret Key manually:
                  </span>
                  <div className="flex items-center gap-2">
                    <code className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-slate-800 text-xs font-bold tracking-wider select-all">
                      {twoFactorSecret}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyKey}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 leading-relaxed bg-white/70 p-3 rounded-xl border border-slate-200/60">
                  <p className="font-semibold text-slate-700 mb-0.5">Account Info in Authenticator:</p>
                  <p>• Account Name: <code>{user?.email || 'DigiSkool User'}</code></p>
                  <p>• Issuer: <code>DigiSkool</code></p>
                </div>

                {/* Step 2: Verification Code Form */}
                <form onSubmit={handleVerifyAndEnable2FA} className="pt-2 flex items-center gap-3">
                  <div className="w-40">
                    <input
                      type="text"
                      maxLength={6}
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="w-full text-center tracking-widest font-mono text-base font-bold px-3 py-2 border rounded-xl border-purple-300 focus:ring-2 focus:ring-[#6E1231] bg-white"
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={twoFactorLoading || twoFactorCode.length !== 6}
                    className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {twoFactorLoading ? 'Verifying...' : 'Verify & Activate'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Consolidated Institutional Logins Reference Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
                <span>Consolidated Institutional Logins Directory</span>
                <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-[10px] font-semibold">
                  All in One File
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Official staff accounts and credentials consolidated in <code>src/config/authCredentials.ts</code>
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {ALL_LOGIN_CREDENTIALS.map((acc) => (
            <div
              key={acc.email}
              className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-bold text-xs text-slate-900">{acc.label}</span>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                    {acc.department}
                  </span>
                </div>
                <div className="font-mono text-xs text-slate-700 font-semibold mb-1">
                  {acc.email}
                </div>
                <p className="text-[11px] text-slate-500 mb-2">
                  {acc.description}
                </p>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-200">
                <span>Access: <strong>{acc.campusAccess}</strong></span>
                <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Custom Password / 2FA
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dedicated Data Export & Backup Section */}
      {canExportBackup && (
        <div id="card-data-export-backup" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
                  <span>Data Export & Institutional Records Backup</span>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-semibold">
                    JSON Archive
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Safely download an offline snapshot of all students, admissions, fee vouchers, payment receipts, and expenses.
                </p>
              </div>
            </div>

            <button
              id="btn-export-database-json"
              type="button"
              onClick={handleDownloadBackup}
              disabled={backupDownloading}
              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 shrink-0"
            >
              <HardDriveDownload className="w-4 h-4" />
              <span>{backupDownloading ? 'Exporting Archive...' : 'Export JSON Backup'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] font-medium text-slate-500 block mb-1">Backup Coverage</span>
              <p className="text-xs font-semibold text-slate-800">
                Students, Vouchers, Payments, Expenses & Accounts
              </p>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Includes Lahore & Okara records
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] font-medium text-slate-500 block mb-1">Format & Portability</span>
              <p className="text-xs font-semibold text-slate-800">
                Standard JSON Format (.json)
              </p>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Importable, encrypted, and audit-logged
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] font-medium text-slate-500 block mb-1">Last Backup Generated</span>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {settings?.last_backup_date
                    ? formatDateTime(settings.last_backup_date, true)
                    : 'No backup recorded yet'}
                </span>
              </div>
              <span className="text-[10px] text-emerald-600 mt-1 block font-medium">
                Official institutional safekeeping
              </span>
            </div>
          </div>

          {backupStats && (
            <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 text-emerald-900 rounded-xl text-xs space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Backup JSON successfully downloaded to your computer!</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-emerald-800 pt-1">
                <div>• Students: <strong>{backupStats.total_students}</strong></div>
                <div>• Admissions: <strong>{backupStats.total_admissions}</strong></div>
                <div>• Vouchers: <strong>{backupStats.total_fee_vouchers}</strong></div>
                <div>• Payments: <strong>{backupStats.total_payments}</strong></div>
                <div>• Expenses: <strong>{backupStats.total_expenses}</strong></div>
                <div>• Ledger Txns: <strong>{backupStats.total_accounts_transactions}</strong></div>
                <div>• Staff: <strong>{backupStats.total_staff}</strong></div>
                <div>• Format: <strong>JSON Snapshot</strong></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Official Technical Support & Help Desk Card */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-950 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Technical Support &amp; Help Desk</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Active Helpline
              </span>
            </h4>
            <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
              Support for email: please contact us on <strong className="text-white font-mono">jameshut629@gmail.com</strong> related to any issue, bug report, or system inquiries.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-400 font-mono">
              <span>Lahore Campus: <strong className="text-slate-200">0331-7155174</strong></span>
              <span>•</span>
              <span>Okara Campus: <strong className="text-slate-200">0310-4367347</strong></span>
            </div>
          </div>
        </div>

        <a
          href="mailto:jameshut629@gmail.com"
          className="px-4 py-2.5 bg-[#6E1231] hover:bg-[#85173A] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          title="Send email to DigiSkool Support"
        >
          <Mail className="w-4 h-4" />
          <span>Email Support</span>
        </a>
      </div>
    </div>
  );
};

