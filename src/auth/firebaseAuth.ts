import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
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
  const isApple = user.providerData?.some((p) => p.providerId === 'apple.com') || false;
  let photo = user.photoURL || undefined;
  if (photo && photo.includes('googleusercontent.com')) {
    photo = photo.replace(/=s\d+(-c)?$/, '=s400-c');
  }
  return {
    name: user.displayName || user.email?.split('@')[0] || (isApple ? 'Apple Kullanıcısı' : 'Google Kullanıcısı'),
    email: user.email || undefined,
    picture: photo || (user.email ? `https://unavatar.io/${encodeURIComponent(user.email)}` : undefined),
    isGoogleConnected: !isApple,
    isAppleConnected: isApple,
    createdAt: Date.now(),
  };
}

/**
 * Parses deep link callback URL received from auth-bridge.html in Safari
 */
export function handleAuthDeepLink(urlStr: string): UserProfile | null {
  try {
    const isGoogleReversed = urlStr.includes('googleusercontent.apps');
    const parsed = new URL(urlStr.replace(/^com\.googleusercontent\.apps\.[^:]+:/, 'https://localhost/'));
    const provider = parsed.searchParams.get('provider') || (urlStr.includes('apple') ? 'apple' : 'google');
    const isApple = !isGoogleReversed && provider === 'apple';

    const nameParam = parsed.searchParams.get('name');
    const emailParam = parsed.searchParams.get('email');
    const pictureParam = parsed.searchParams.get('picture');

    const defaultName = isApple ? 'Apple Kullanıcısı' : 'Google Kullanıcısı';
    const name = nameParam ? decodeURIComponent(nameParam) : defaultName;
    const email = emailParam ? decodeURIComponent(emailParam) : undefined;
    const picture = pictureParam ? decodeURIComponent(pictureParam) : undefined;

    return {
      name,
      email: email || undefined,
      picture: picture || undefined,
      isGoogleConnected: !isApple,
      isAppleConnected: isApple,
      createdAt: Date.now(),
    };
  } catch (err) {
    console.error('[FirebaseAuth] Error parsing auth deep link URL:', err);
    return null;
  }
}

import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

/**
 * Native iOS Google Sign In using official Capacitor plugin
 */
export async function signInWithGoogleNative(onSuccess: (profile: UserProfile) => void): Promise<void> {
  try {
    const result = await FirebaseAuthentication.signInWithGoogle();
    if (result.user) {
      onSuccess(formatUserProfile(result.user as any));
    }
  } catch (err) {
    console.error('[FirebaseAuth] Google native error:', err);
    throw err;
  }
}

/**
 * Native iOS Apple Sign In using official Capacitor plugin
 */
export async function signInWithAppleNative(onSuccess: (profile: UserProfile) => void): Promise<void> {
  try {
    const result = await FirebaseAuthentication.signInWithApple();
    if (result.user) {
      onSuccess(formatUserProfile(result.user as any));
    }
  } catch (err) {
    console.error('[FirebaseAuth] Apple native error:', err);
    throw err;
  }
}

/**
 * Web Sign in with Apple via Firebase OAuthProvider
 */
export async function signInWithApple(): Promise<UserProfile | null> {
  const authInstance = getFirebaseAuth();
  const appleProvider = new OAuthProvider('apple.com');
  appleProvider.addScope('email');
  appleProvider.addScope('name');

  try {
    const result = await signInWithPopup(authInstance, appleProvider);
    return formatUserProfile(result.user);
  } catch (err: any) {
    if (err?.code === 'auth/popup-closed-by-user') {
      console.log('[FirebaseAuth] Apple popup closed by user.');
      return null;
    }
    console.warn('[FirebaseAuth] Apple popup error, trying redirect:', err);
    await signInWithRedirect(authInstance, appleProvider);
    return null;
  }
}

/**
 * Web Sign in with Google via Firebase GoogleAuthProvider
 */
export async function signInWithGoogle(): Promise<UserProfile | null> {
  const authInstance = getFirebaseAuth();
  const googleProvider = new GoogleAuthProvider();
  googleProvider.addScope('profile');
  googleProvider.addScope('email');
  googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');
  googleProvider.setCustomParameters({
    prompt: 'select_account',
  });

  try {
    const result = await signInWithPopup(authInstance, googleProvider);
    return formatUserProfile(result.user);
  } catch (err: any) {
    if (err?.code === 'auth/popup-closed-by-user') {
      console.log('[FirebaseAuth] Google popup closed by user.');
      return null;
    }
    console.warn('[FirebaseAuth] Google popup error, trying redirect:', err);
    await signInWithRedirect(authInstance, googleProvider);
    return null;
  }
}

/**
 * Checks for any pending redirect result from web OAuth flow
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
 * Signs out from Firebase Auth
 */
export async function signOutFromFirebase(): Promise<void> {
  const authInstance = getFirebaseAuth();
  await fbSignOut(authInstance);
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

export const signOutGoogle = signOutFromFirebase;
export const signInWithGoogleRedirect = signInWithGoogle;

