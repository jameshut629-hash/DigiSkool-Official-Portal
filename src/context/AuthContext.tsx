import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types.ts';
import { getStoredToken, getStoredUser, setStoredAuth, clearStoredAuth, apiRequest } from '../lib/api.ts';
import { ALL_LOGIN_CREDENTIALS } from '../config/authCredentials.ts';
import {
  storeUserLoginInFirestore,
  signInWithGoogle,
  signOutFromFirebase,
  saveUserProfileInFirestore,
  getUserProfileFromFirestore
} from '../lib/firebase.ts';

// Helper to create a fallback user profile when offline or in emergency standalone mode
function createFallbackUserFromCredentials(email: string): User {
  const matched = ALL_LOGIN_CREDENTIALS.find(
    (c) => c.email.toLowerCase() === email.toLowerCase()
  );
  
  if (matched) {
    let campus_access: 'all' | 'lahore' | 'okara' = 'all';
    if (matched.campusAccess.toLowerCase().includes('lahore') && !matched.campusAccess.toLowerCase().includes('okara')) {
      campus_access = 'lahore';
    } else if (matched.campusAccess.toLowerCase().includes('okara') && !matched.campusAccess.toLowerCase().includes('lahore')) {
      campus_access = 'okara';
    }

    return {
      id: 1,
      name: matched.label,
      email: matched.email,
      role: matched.role,
      permission_level: 'full',
      campus_access,
      status: 'active',
      created_at: new Date().toISOString()
    };
  }

  return {
    id: 1,
    name: 'Authorized User',
    email,
    role: 'main_admin',
    permission_level: 'full',
    campus_access: 'all',
    status: 'active',
    created_at: new Date().toISOString()
  };
}

interface LoginResult {
  require_2fa?: boolean;
  temp_token?: string;
  user_email?: string;
  user_id?: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<LoginResult | void>;
  loginWithGoogle: () => Promise<void>;
  completeLoginSession: (token: string, user: User) => void;
  logout: () => Promise<void>;
  switchDemoRole: (role: UserRole) => Promise<void>;
  isOwner: boolean;
  isMainAdmin: boolean;
  isPrincipal: boolean;
  isAdminHR: boolean;
  isAdmin: boolean;
  isAccountant: boolean;
  isAdmissionOfficer: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  canManageUsers: boolean;
  canEditFinancials: boolean;
  canManageFinance: boolean;
  canManageStudents: boolean;
  canPermanentDelete: boolean;
  hasBothCampusesAccess: boolean;
  canAccessModule: (moduleName: string) => boolean;
  playLoginChime: () => void;
}

// Pleasant digital chime synthesizer using standard Web Audio API
export function playLoginSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (Bright cheerful chord)
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.08);
      
      gain.gain.setValueAtTime(0, ctx.currentTime + index * 0.08);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + index * 0.08 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.08 + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + index * 0.08);
      osc.stop(ctx.currentTime + index * 0.08 + 0.5);
    });
  } catch {
    // Gracefully handle browser autoplay restriction
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(getStoredUser());
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [loading, setLoading] = useState<boolean>(true);

  // Validate session on mount
  useEffect(() => {
    async function verifySession() {
      const storedTok = getStoredToken();
      if (!storedTok) {
        setLoading(false);
        return;
      }
      try {
        const res = await apiRequest<{ user: User }>('/api/auth/me');
        setUser(res.user);
        setToken(storedTok);
      } catch (err: any) {
        // If static hosting (404/405/offline), retain stored user session instead of wiping
        const existingUser = getStoredUser();
        if (existingUser) {
          setUser(existingUser);
          setToken(storedTok);
        } else {
          clearStoredAuth();
          setUser(null);
          setToken(null);
        }
      } finally {
        setLoading(false);
      }
    }

    verifySession();

    // Listen for 401 events
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
    };
    window.addEventListener('digiskool:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('digiskool:unauthorized', handleUnauthorized);
  }, []);

  const completeLoginSession = (newToken: string, newUser: User) => {
    setStoredAuth(newToken, newUser);
    setToken(newToken);
    setUser(newUser);
    playLoginSound();

    // Store user login timestamp and session in Firestore (As requested)
    storeUserLoginInFirestore({
      userId: newUser.id,
      userEmail: newUser.email,
      userName: newUser.name,
      role: newUser.role,
      loginTimestamp: new Date().toISOString(),
      action: 'USER_LOGIN',
      details: `${newUser.name} (${newUser.role.toUpperCase()}) authenticated successfully`
    }).catch(err => {
      console.warn('Background Firestore login sync notice:', err);
    });
  };

  const login = async (email: string, password: string, rememberMe: boolean = false): Promise<LoginResult | void> => {
    try {
      const data = await apiRequest<{
        token?: string;
        user?: User;
        require_2fa?: boolean;
        temp_token?: string;
        user_email?: string;
        user_id?: number;
      }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, rememberMe })
      });

      // If server requests 2FA code verification
      if (data.require_2fa) {
        return {
          require_2fa: true,
          temp_token: data.temp_token,
          user_email: data.user_email,
          user_id: data.user_id
        };
      }

      if (data.token && data.user) {
        completeLoginSession(data.token, data.user);
      }
    } catch (err: any) {
      // If server returned network failure or standalone offline fallback
      const isStaticOrServerlessError = 
        err.message?.includes('405') || 
        err.message?.includes('404') || 
        err.message?.includes('Failed to fetch') ||
        err.message?.includes('NetworkError');

      if (isStaticOrServerlessError) {
        // Check if user has changed their password via settings
        const cleanEmail = email.trim().toLowerCase();
        const customStoredPwd = localStorage.getItem(`digiskool_pwd_${cleanEmail}`);

        // Default password requirement has been removed; check for custom password or default staff profile
        if (customStoredPwd && password !== customStoredPwd) {
          throw new Error('Invalid password. Please enter the correct password for ' + email);
        }

        const fallbackUser = createFallbackUserFromCredentials(email);
        const fallbackToken = 'static_session_' + Date.now();
        completeLoginSession(fallbackToken, fallbackUser);
        return;
      }

      throw err;
    }
  };

  const loginWithGoogle = async (): Promise<void> => {
    try {
      const firebaseUser = await signInWithGoogle();
      if (!firebaseUser.email) {
        throw new Error('Google Sign-In failed: No email returned.');
      }

      const email = firebaseUser.email.toLowerCase().trim();
      const displayName = firebaseUser.displayName || email.split('@')[0];

      // Synchronize with server session first (verifies if user is pre-authorized)
      try {
        const data = await apiRequest<{ token: string; user: User }>('/api/auth/firebase-google', {
          method: 'POST',
          body: JSON.stringify({
            email,
            name: displayName,
            uid: firebaseUser.uid
          })
        });

        // Persist authorized user profile to Firestore
        saveUserProfileInFirestore({
          uid: firebaseUser.uid,
          email,
          name: data.user.name || displayName,
          role: data.user.role,
          photoURL: firebaseUser.photoURL || '',
          campusAccess: data.user.campus_access || 'all',
          permissionLevel: data.user.permission_level || 'selective'
        }).catch(e => console.warn('Notice: Firestore user profile sync:', e));

        completeLoginSession(data.token, data.user);
      } catch (err: any) {
        // If server explicitly returned authorization error, immediately sign out from Firebase and reject
        await signOutFromFirebase();
        const errorMessage = err.message || 'You do not have access to this portal. Please contact the administrator.';
        throw new Error(errorMessage);
      }
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await signOutFromFirebase();
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      clearStoredAuth();
      setUser(null);
      setToken(null);
    }
  };

  const switchDemoRole = async (role: UserRole) => {
    setLoading(true);
    try {
      const data = await apiRequest<{ token: string; user: User }>('/api/auth/switch-demo', {
        method: 'POST',
        body: JSON.stringify({ role })
      });
      completeLoginSession(data.token, data.user);
    } catch (err: any) {
      alert('Failed to switch demo account: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const role = user?.role;
  const isMainAdmin = role === 'main_admin' || role === 'owner';
  const isPrincipal = role === 'principal';
  const isAdminHR = role === 'admin_hr';
  const isOwner = isMainAdmin;
  const isAdmin = isMainAdmin || isPrincipal || isAdminHR || role === 'admin';
  const isAccountant = role === 'accountant' || isAdmin;
  const isAdmissionOfficer = role === 'admission_officer' || isAdmin;
  const isTeacher = role === 'teacher';
  const isStudent = role === 'student';

  const canManageUsers = isMainAdmin || isPrincipal;
  const canEditFinancials = isMainAdmin || isPrincipal || isAdminHR || role === 'admin' || role === 'accountant';
  const canManageStudents = isMainAdmin || isPrincipal || isAdminHR || role === 'admin' || role === 'admission_officer';
  const canPermanentDelete = isMainAdmin; // STRICT MAIN ADMIN ONLY
  const hasBothCampusesAccess = isMainAdmin || isAdminHR || user?.campus_access === 'all' || !user?.campus_access;

  // Granular module access check based on user's custom assigned permissions
  const canAccessModule = (moduleName: string): boolean => {
    if (!user) return false;
    // Master admin always has access to everything
    if (isMainAdmin) return true;

    // Check if user has explicit allowed_modules configured
    if (user.allowed_modules) {
      if (user.allowed_modules === 'all' || user.permission_level === 'full') return true;
      const modulesList = user.allowed_modules.split(',').map(m => m.trim().toLowerCase());
      return modulesList.includes(moduleName.toLowerCase());
    }

    // Default role-based fallbacks if allowed_modules is not set
    switch (moduleName) {
      case 'dashboard':
        return true;
      case 'students':
      case 'admissions':
        return isAdmissionOfficer || isAdmin || isPrincipal || isAdminHR;
      case 'courses':
        return true;
      case 'vouchers':
      case 'payments':
      case 'expenses':
      case 'reminders':
      case 'reports':
        return isAccountant || isAdmin || isPrincipal || isAdminHR;
      case 'staff':
        return isAdminHR || isAdmin || isPrincipal;
      case 'security':
        return isMainAdmin || isPrincipal;
      case 'settings':
      case 'activity-log':
        return isMainAdmin;
      default:
        return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        loginWithGoogle,
        completeLoginSession,
        logout,
        switchDemoRole,
        isOwner,
        isMainAdmin,
        isPrincipal,
        isAdminHR,
        isAdmin,
        isAccountant,
        isAdmissionOfficer,
        isTeacher,
        isStudent,
        canManageUsers,
        canEditFinancials,
        canManageFinance: canEditFinancials,
        canManageStudents,
        canPermanentDelete,
        hasBothCampusesAccess,
        canAccessModule,
        playLoginChime: playLoginSound
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
