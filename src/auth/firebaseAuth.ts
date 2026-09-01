import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut as fbSignOut,
  Auth,
  User,
} from 'firebase/auth';
import { UserProfile } from '../types/user';

export const firebaseConfig = {
  projectId: "comus-ai-duty",
  appId: "1:94491728408:web:66bc6cd17f999f4cf9816d",
  storageBucket: "comus-ai-duty.firebasestorage.app",
  apiKey: "AIzaSyDC1J4A-SgKyGFm6uUQ3F2oaDB5AAkq8nE",
  authDomain: "comus-ai-duty.firebaseapp.com",
  messagingSenderId: "94491728408",
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export function getFirebaseAuth(): Auth {
  if (!auth) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
  }
  return auth;
}

export function formatUserProfile(user: User): UserProfile {
  return {
    name: user.displayName || user.email?.split('@')[0] || 'Kullanıcı',
    email: user.email || undefined,
    picture: user.photoURL || undefined,
    isGoogleConnected: true,
    createdAt: Date.now(),
  };
}

/**
 * Listens to persistent Firebase Auth state changes
 */
export function subscribeToAuthState(onUser: (profile: UserProfile | null) => void): () => void {
  const authInstance = getFirebaseAuth();
  return onAuthStateChanged(authInstance, (user) => {
    if (user) {
      onUser(formatUserProfile(user));
    } else {
      onUser(null);
    }
  });
}

/**
 * Checks for any pending redirect result from mobile login flow
 */
export async function checkRedirectAuth(): Promise<UserProfile | null> {
  try {
    const authInstance = getFirebaseAuth();
    const result = await getRedirectResult(authInstance);
    if (result && result.user) {
      return formatUserProfile(result.user);
    }
  } catch (err) {
    console.warn('[FirebaseAuth] Redirect result check error:', err);
  }
  return null;
}

/**
 * Sign in with Google Account with Mobile Safari / Chrome Popup & Redirect fallback
 */
export async function signInWithGoogle(): Promise<UserProfile | null> {
  const authInstance = getFirebaseAuth();
  const googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({
    prompt: 'select_account',
  });

  const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // If on mobile / PWA, prefer redirect or handle popup blocked
  if (isMobile) {
    try {
      // First try popup
      const result = await signInWithPopup(authInstance, googleProvider);
      return formatUserProfile(result.user);
    } catch (popupErr: any) {
      console.warn('[FirebaseAuth] Mobile popup blocked/failed, switching to redirect:', popupErr);
      if (
        popupErr.code === 'auth/popup-blocked' ||
        popupErr.code === 'auth/popup-closed-by-user' ||
        popupErr.code === 'auth/cancelled-popup-request'
      ) {
        // Redirect to Google login
        await signInWithRedirect(authInstance, googleProvider);
        return null; // Will resume upon redirect
      }
      throw popupErr;
    }
  }

  // Desktop Flow
  try {
    const result = await signInWithPopup(authInstance, googleProvider);
    return formatUserProfile(result.user);
  } catch (error: any) {
    console.warn('[FirebaseAuth] Popup sign-in error:', error);

    if (error.code === 'auth/popup-blocked') {
      // Fallback to redirect if popup blocked on desktop
      await signInWithRedirect(authInstance, googleProvider);
      return null;
    } else if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Giriş penceresi kapatıldı.');
    } else if (error.code === 'auth/unauthorized-domain') {
      throw new Error('Bu domain Firebase Authentication için yetkilendirilmemiş.');
    } else if (error.code === 'auth/configuration-not-found' || error.code === 'auth/operation-not-allowed') {
      throw new Error('Firebase Console > Authentication sekmesinde Google sağlayıcısı henüz aktif edilmemiş.');
    }

    throw error;
  }
}

/**
 * Direct redirect login for browsers that restrict popups completely
 */
export async function signInWithGoogleRedirect(): Promise<void> {
  const authInstance = getFirebaseAuth();
  const googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({
    prompt: 'select_account',
  });
  await signInWithRedirect(authInstance, googleProvider);
}

/**
 * Sign out from Google Auth
 */
export async function signOutGoogle(): Promise<void> {
  try {
    const authInstance = getFirebaseAuth();
    await fbSignOut(authInstance);
  } catch (err) {
    console.error('[FirebaseAuth] Sign out error:', err);
  }
}
