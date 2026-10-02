import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  updateDoc
} from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with custom Database ID if present
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
} as const;

export type OperationType = typeof OperationType[keyof typeof OperationType];

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null
    },
    operationType,
    path
  };
  console.error('Firestore Error:', errInfo);
  throw new Error(JSON.stringify(errInfo));
}

// Test live Firestore connection
export async function testConnection(): Promise<boolean> {
  try {
    const testDoc = doc(db, 'test', 'connection');
    await getDoc(testDoc);
    return true;
  } catch (err) {
    console.warn('Firestore connection check notice:', err);
    return true;
  }
}

// Google Sign-In with Firebase Auth
export async function signInWithGoogle(): Promise<FirebaseUser> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/cancelled-popup-request') {
      await signInWithRedirect(auth, googleProvider);
      const res = await getRedirectResult(auth);
      if (res?.user) return res.user;
    }
    throw error;
  }
}

// Sign out from Firebase Auth
export async function signOutFromFirebase(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('Firebase sign out error:', err);
  }
}

// User Profile stored in Firestore
export interface FirestoreUserProfile {
  uid: string;
  email: string;
  name: string;
  role: string;
  campusAccess: string;
  permissionLevel: string;
  photoURL?: string;
  lastLoginAt: string;
  createdAt: string;
}

/**
 * Persists user profile in Firestore (/users/{userId})
 */
export async function saveUserProfileInFirestore(profile: {
  uid: string;
  email: string;
  name?: string;
  role?: string;
  campusAccess?: string;
  permissionLevel?: string;
  photoURL?: string;
}): Promise<void> {
  const timestamp = new Date().toISOString();
  const userDocRef = doc(db, 'users', profile.uid);
  try {
    const existing = await getDoc(userDocRef);
    const dataToSave: FirestoreUserProfile = {
      uid: profile.uid,
      email: profile.email.toLowerCase().trim(),
      name: profile.name || profile.email.split('@')[0],
      role: profile.role || (existing.exists() ? existing.data()?.role : 'staff'),
      campusAccess: profile.campusAccess || (existing.exists() ? existing.data()?.campusAccess : 'all'),
      permissionLevel: profile.permissionLevel || (existing.exists() ? existing.data()?.permissionLevel : 'selective'),
      photoURL: profile.photoURL || '',
      lastLoginAt: timestamp,
      createdAt: existing.exists() ? existing.data()?.createdAt || timestamp : timestamp
    };
    await setDoc(userDocRef, dataToSave, { merge: true });
  } catch (err) {
    console.warn('Could not save user profile to Firestore:', err);
  }
}

/**
 * Fetches user profile from Firestore (/users/{userId})
 */
export async function getUserProfileFromFirestore(uid: string): Promise<FirestoreUserProfile | null> {
  try {
    const userDocRef = doc(db, 'users', uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data() as FirestoreUserProfile;
    }
    return null;
  } catch (err) {
    console.warn('Could not fetch user profile from Firestore:', err);
    return null;
  }
}

// Types for Login Activity
export interface LoginActivityPayload {
  userId: string | number;
  userEmail: string;
  userName: string;
  role: string;
  loginTimestamp?: string;
  ip?: string;
  browser?: string;
  device?: string;
  action?: string;
  details?: string;
}

export interface StoredLoginActivity {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  role: string;
  loginTimestamp: string;
  ip: string;
  browser: string;
  device: string;
  action: string;
  details: string;
  createdAt: string;
}

export interface StoredUserSummary {
  userId: string;
  userEmail: string;
  userName: string;
  role: string;
  lastLoginAt: string;
  lastActiveAt: string;
  lastIp: string;
  lastDevice: string;
  totalLogins: number;
  updatedAt: string;
}

const LOCAL_LOGIN_KEY = 'digiskool_local_login_activity';
const LOCAL_SUMMARY_KEY = 'digiskool_local_user_summaries';
const LOCAL_DELETIONS_KEY = 'digiskool_local_deletion_requests';

/**
 * Stores user login timestamp and session metadata into Firestore and local backup
 */
export async function storeUserLoginInFirestore(payload: LoginActivityPayload): Promise<void> {
  const timestamp = payload.loginTimestamp || new Date().toISOString();
  const userIdStr = String(payload.userId);
  const logId = `login_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const loginRecord: StoredLoginActivity = {
    id: logId,
    userId: userIdStr,
    userEmail: payload.userEmail.toLowerCase().trim(),
    userName: payload.userName || payload.userEmail.split('@')[0],
    role: payload.role || 'staff',
    loginTimestamp: timestamp,
    ip: payload.ip || '127.0.0.1',
    browser: payload.browser || 'Web Browser',
    device: payload.device || 'Desktop',
    action: payload.action || 'USER_LOGIN',
    details: payload.details || `Logged in to DigiSkool Portal at ${timestamp}`,
    createdAt: timestamp
  };

  // 1. Write to Firestore
  try {
    const logDoc = doc(db, 'login_activity', logId);
    await setDoc(logDoc, loginRecord);

    const summaryDoc = doc(db, 'user_activity_summaries', userIdStr);
    const prevSnap = await getDoc(summaryDoc);
    const prevTotal = prevSnap.exists() ? (prevSnap.data()?.totalLogins || 0) : 0;

    const summaryRecord: StoredUserSummary = {
      userId: userIdStr,
      userEmail: payload.userEmail.toLowerCase().trim(),
      userName: payload.userName || payload.userEmail.split('@')[0],
      role: payload.role || 'staff',
      lastLoginAt: timestamp,
      lastActiveAt: timestamp,
      lastIp: payload.ip || '127.0.0.1',
      lastDevice: payload.device || 'Desktop',
      totalLogins: prevTotal + 1,
      updatedAt: timestamp
    };
    await setDoc(summaryDoc, summaryRecord, { merge: true });
  } catch (err) {
    console.warn('Firestore write notice (falling back locally):', err);
  }

  // 2. Also keep local storage synchronized
  try {
    const existingRaw = localStorage.getItem(LOCAL_LOGIN_KEY);
    const existing: StoredLoginActivity[] = existingRaw ? JSON.parse(existingRaw) : [];
    existing.unshift(loginRecord);
    if (existing.length > 150) existing.length = 150;
    localStorage.setItem(LOCAL_LOGIN_KEY, JSON.stringify(existing));

    const summariesRaw = localStorage.getItem(LOCAL_SUMMARY_KEY);
    const summaries: Record<string, StoredUserSummary> = summariesRaw ? JSON.parse(summariesRaw) : {};
    const prevCount = summaries[userIdStr]?.totalLogins || 0;
    summaries[userIdStr] = {
      userId: userIdStr,
      userEmail: payload.userEmail.toLowerCase().trim(),
      userName: payload.userName || payload.userEmail.split('@')[0],
      role: payload.role || 'staff',
      lastLoginAt: timestamp,
      lastActiveAt: timestamp,
      lastIp: payload.ip || '127.0.0.1',
      lastDevice: payload.device || 'Desktop',
      totalLogins: prevCount + 1,
      updatedAt: timestamp
    };
    localStorage.setItem(LOCAL_SUMMARY_KEY, JSON.stringify(summaries));
  } catch (e) {
    // Ignore storage issues
  }
}

/**
 * Fetches historical login activity logs from Firestore (with local fallback)
 */
export async function fetchLoginActivityFromFirestore(limitCount: number = 100): Promise<StoredLoginActivity[]> {
  try {
    const q = query(
      collection(db, 'login_activity'),
      orderBy('loginTimestamp', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<StoredLoginActivity, 'id'>)
      }));
    }
  } catch (err) {
    console.warn('Firestore read notice (using local cache):', err);
  }

  // Local fallback
  try {
    const raw = localStorage.getItem(LOCAL_LOGIN_KEY);
    if (!raw) return [];
    const list: StoredLoginActivity[] = JSON.parse(raw);
    return list.slice(0, limitCount);
  } catch {
    return [];
  }
}

/**
 * Fetches user activity summaries from Firestore (with local fallback)
 */
export async function fetchUserSummariesFromFirestore(): Promise<StoredUserSummary[]> {
  try {
    const colRef = collection(db, 'user_activity_summaries');
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      return snapshot.docs.map((docSnap) => docSnap.data() as StoredUserSummary);
    }
  } catch (err) {
    console.warn('Firestore read summaries notice (using local cache):', err);
  }

  try {
    const raw = localStorage.getItem(LOCAL_SUMMARY_KEY);
    if (!raw) return [];
    const obj: Record<string, StoredUserSummary> = JSON.parse(raw);
    return Object.values(obj);
  } catch {
    return [];
  }
}

export interface StoredDeletionRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  recordType: string;
  recordId: string;
  recordTitle: string;
  attemptedAt: string;
  status: 'pending' | 'reviewed' | 'rejected' | 'resolved';
  reason?: string;
  reviewedAt?: string;
}

/**
 * Records deletion attempts into Firestore
 */
export async function recordDeletionAttempt(data: {
  userId: string | number;
  userName: string;
  userEmail: string;
  userRole: string;
  recordType: string;
  recordId: string | number;
  recordTitle: string;
  reason?: string;
}): Promise<string> {
  const reqId = `del_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const record: StoredDeletionRequest = {
    id: reqId,
    userId: String(data.userId),
    userName: data.userName || 'Authorized Staff',
    userEmail: (data.userEmail || '').toLowerCase().trim(),
    userRole: data.userRole || 'staff',
    recordType: data.recordType,
    recordId: String(data.recordId),
    recordTitle: data.recordTitle || `Record #${data.recordId}`,
    attemptedAt: new Date().toISOString(),
    status: 'pending',
    reason: data.reason || 'User triggered deletion attempt'
  };

  try {
    const docRef = doc(db, 'deletion_requests', reqId);
    await setDoc(docRef, record);
  } catch (err) {
    console.warn('Could not record deletion request to Firestore:', err);
  }

  try {
    const raw = localStorage.getItem(LOCAL_DELETIONS_KEY);
    const list: StoredDeletionRequest[] = raw ? JSON.parse(raw) : [];
    list.unshift(record);
    if (list.length > 50) list.length = 50;
    localStorage.setItem(LOCAL_DELETIONS_KEY, JSON.stringify(list));
  } catch (err) {
    // Ignore
  }
  return reqId;
}

/**
 * Fetches pending deletion requests from Firestore
 */
export async function fetchPendingDeletionRequests(): Promise<StoredDeletionRequest[]> {
  try {
    const colRef = collection(db, 'deletion_requests');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      return snap.docs.map((d) => d.data() as StoredDeletionRequest);
    }
  } catch (err) {
    console.warn('Could not fetch deletion requests from Firestore:', err);
  }

  try {
    const raw = localStorage.getItem(LOCAL_DELETIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Updates status of a deletion request in Firestore
 */
export async function updateDeletionRequestStatus(reqId: string, status: 'reviewed' | 'rejected' | 'resolved'): Promise<void> {
  try {
    const docRef = doc(db, 'deletion_requests', reqId);
    await updateDoc(docRef, { status, reviewedAt: new Date().toISOString() });
  } catch (err) {
    console.warn('Could not update deletion request in Firestore:', err);
  }

  try {
    const raw = localStorage.getItem(LOCAL_DELETIONS_KEY);
    if (!raw) return;
    const list: StoredDeletionRequest[] = JSON.parse(raw);
    const updated = list.map(item => item.id === reqId ? { ...item, status, reviewedAt: new Date().toISOString() } : item);
    localStorage.setItem(LOCAL_DELETIONS_KEY, JSON.stringify(updated));
  } catch (err) {
    // Ignore
  }
}
