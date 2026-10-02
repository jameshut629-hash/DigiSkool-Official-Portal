import React, { useState, useRef, useEffect } from 'react';
import { 
  Lock, 
  Mail, 
  ShieldCheck, 
  AlertCircle, 
  Loader2, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Shield, 
  Phone, 
  Building2, 
  CheckCircle2, 
  KeyRound, 
  Smartphone, 
  ArrowLeft 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { DigiSkoolLogo } from '../common/DigiSkoolLogo.tsx';
import { apiRequest } from '../../lib/api.ts';
import { User } from '../../types.ts';

export const LoginView: React.FC = () => {
  const { login, loginWithGoogle, completeLoginSession, playLoginChime } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [googleLoading, setGoogleLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      setGoogleLoading(true);
      await loginWithGoogle();
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      setError(err.message || 'Google sign-in was cancelled or failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  // 2FA Challenge State
  const [pending2FA, setPending2FA] = useState<{
    temp_token: string;
    user_email: string;
  } | null>(null);
  const [totpCode, setTotpCode] = useState<string>('');
  const [verifying2FA, setVerifying2FA] = useState<boolean>(false);
  const [bypassing2FA, setBypassing2FA] = useState<boolean>(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (pending2FA && codeInputRef.current) {
      codeInputRef.current.focus();
    }
  }, [pending2FA]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const result = await login(email, password, rememberMe);
      if (result && result.require_2fa && result.temp_token) {
        setPending2FA({
          temp_token: result.temp_token,
          user_email: result.user_email || email
        });
        setSuccessMsg('Two-Factor Authentication required. Enter the 6-digit code from your authenticator app.');
      } else {
        if (typeof playLoginChime === 'function') {
          playLoginChime();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pending2FA) return;
    const cleanCode = totpCode.trim().replace(/\s+/g, '');
    if (cleanCode.length !== 6) {
      setError('Please enter the complete 6-digit code from Google Authenticator.');
      return;
    }

    setError(null);
    setVerifying2FA(true);

    try {
      const res = await apiRequest<{ token: string; user: User }>('/api/auth/verify-2fa', {
        method: 'POST',
        body: JSON.stringify({
          temp_token: pending2FA.temp_token,
          code: cleanCode,
          rememberMe
        })
      });

      if (res && res.token && res.user) {
        completeLoginSession(res.token, res.user);
        if (typeof playLoginChime === 'function') {
          playLoginChime();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Invalid 2FA code. Please check your authenticator app and try again.');
    } finally {
      setVerifying2FA(false);
    }
  };

  const handleBypass2FA = async () => {
    if (!pending2FA) return;
    setError(null);
    setBypassing2FA(true);
    try {
      const res = await apiRequest<{ token: string; user: User; message?: string }>('/api/auth/bypass-2fa', {
        method: 'POST',
        body: JSON.stringify({
          temp_token: pending2FA.temp_token,
          rememberMe
        })
      });

      if (res && res.token && res.user) {
        completeLoginSession(res.token, res.user);
        if (typeof playLoginChime === 'function') {
          playLoginChime();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to bypass 2FA. Please verify your credentials or contact administrator.');
    } finally {
      setBypassing2FA(false);
    }
  };

  const handleBackToLogin = () => {
    setPending2FA(null);
    setTotpCode('');
    setError(null);
    setSuccessMsg(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Ambient Visual Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[450px] bg-gradient-to-b from-[#6E1231]/30 via-rose-950/15 to-transparent pointer-events-none blur-3xl" />
      <div className="absolute bottom-0 right-0 w-[450px] h-[350px] bg-emerald-950/15 pointer-events-none blur-3xl" />

      {/* Top Header / Institutional Identity */}
      <header className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="inline-flex items-center justify-center p-3.5 rounded-3xl bg-white/5 border border-white/10 shadow-2xl backdrop-blur-md mb-3 hover:border-white/20 transition-all">
          <DigiSkoolLogo variant="white" size="lg" />
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-300 font-medium mt-1">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800">
            <Building2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>Lahore Campus: <strong className="text-white">DGSL</strong></span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800">
            <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Okara Campus: <strong className="text-white">DGSO</strong></span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800">
            <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="font-mono font-semibold text-emerald-300">0331-7155174</span>
          </div>
        </div>
      </header>

      {/* Clean, Elegant Single Login Card */}
      <main className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900/90 backdrop-blur-md py-7 px-6 sm:px-8 shadow-2xl rounded-2xl border border-slate-800">
          
          {pending2FA ? (
            /* 2FA Verification View */
            <div>
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-800">
                <div>
                  <h1 className="text-base font-bold text-white flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-emerald-400" />
                    Two-Factor Authentication
                  </h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Security verification for <strong className="text-slate-200">{pending2FA.user_email}</strong>
                  </p>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-semibold text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3" />
                  <span>2FA Protected</span>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{error}</div>
                </div>
              )}

              {successMsg && (
                <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="flex-1 font-medium">{successMsg}</div>
                </div>
              )}

              <form onSubmit={handleVerify2FA} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Authenticator 6-Digit Code
                  </label>
                  <div className="relative">
                    <Smartphone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      ref={codeInputRef}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      required
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="123456"
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-base tracking-widest text-center text-emerald-300 placeholder-slate-600 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-mono font-bold"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Open Google Authenticator or your 2FA app to view your temporary 6-digit code.
                  </p>
                </div>

                <div className="pt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <button
                    type="submit"
                    disabled={verifying2FA || totpCode.length !== 6}
                    className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {verifying2FA ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying Code...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify &amp; Continue</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>

                {/* Direct bypass if user hasn't set up 2FA or Google Authenticator yet */}
                <div className="pt-3 mt-1 border-t border-slate-800 text-center space-y-2">
                  <button
                    type="button"
                    onClick={handleBypass2FA}
                    disabled={bypassing2FA}
                    className="w-full py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {bypassing2FA ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Disabling 2FA &amp; Signing In...</span>
                      </>
                    ) : (
                      <>
                        <Shield className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>Abhi 2FA activate nahi kiya? Direct Sign In karein</span>
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-slate-400">
                    Agar aap nay Google Authenticator par 2FA set nahi kiya to yeh button daba kar baghair code ke seedha login kar sakte hain (2FA disable ho jaye ga).
                  </p>
                </div>
              </form>
            </div>
          ) : (
            /* Primary Credentials Login View */
            <div>
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-800">
                <div>
                  <h1 className="text-base font-bold text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#C4385C]" />
                    Institutional Portal Login
                  </h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Enter your authorized credentials to access your portal.
                  </p>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-semibold text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3" />
                  <span>RBAC Secured</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="flex-1 font-medium">{error}</div>
                  </div>
                )}

                {successMsg && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="flex-1 font-medium">{successMsg}</div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. user@digiskool.pk"
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-[#6E1231] focus:border-transparent transition-all font-mono"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-300">
                      Password
                    </label>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-[#6E1231] focus:border-transparent transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 text-slate-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-950 text-[#6E1231] focus:ring-[#6E1231]"
                    />
                    <span>Remember this device</span>
                  </label>
                  <span className="text-slate-500 text-[11px]">256-Bit Encrypted</span>
                </div>

                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="w-full py-2.5 px-4 bg-[#6E1231] hover:bg-[#85173A] text-white font-bold text-xs rounded-xl shadow-lg shadow-[#6E1231]/30 transition-all flex items-center justify-center gap-2 mt-3 cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to DigiSkool</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="relative my-4 flex items-center justify-center">
                  <div className="border-t border-slate-800 w-full" />
                  <span className="bg-slate-900 px-3 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                    Or Continue With
                  </span>
                  <div className="border-t border-slate-800 w-full" />
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading || loading}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60 border border-slate-200"
                >
                  {googleLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-700" />
                      <span>Authenticating with Google...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Sign in with Google (Firebase Auth)</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

        </div>
      </main>

      {/* Footer Identity & Support Contact */}
      <footer className="mt-8 relative z-10 text-center space-y-2">
        <div className="inline-flex flex-wrap items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 backdrop-blur-md shadow-sm text-xs text-slate-300">
          <span className="flex items-center gap-1.5 text-slate-300">
            <Mail className="w-3.5 h-3.5 text-rose-400" />
            <span>Administrator:</span>
            <a href="mailto:adnanmrao@gmail.com" className="font-mono text-white font-semibold hover:text-rose-300 underline">
              adnanmrao@gmail.com
            </a>
          </span>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="text-slate-400 text-[11px]">
            Restricted System • Only Authorized Staff Accounts Allowed
          </span>
        </div>
        <div>
          <div className="inline-block px-4 py-1 rounded-full bg-slate-900/50 border border-slate-800 text-[11px] text-slate-400">
            DigiSkool Institute of Digital Skills • Lahore &amp; Okara Campuses • Helpline: 0331-7155174 • myportal.digiskool.pk
          </div>
        </div>
      </footer>
    </div>
  );
};
