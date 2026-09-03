import { db } from '../db';
import { UserProfile, UserAccountRecord } from '../types/user';
import { PrivacyGuardrails } from '../privacy/PrivacyGuardrails';
import {
  signInWithGoogle as fbSignInWithGoogle,
  signInWithGoogleRedirect as fbSignInWithGoogleRedirect,
  signOutGoogle as fbSignOutGoogle,
} from './firebaseAuth';

const AUTH_SALT = 'comus_duty_client_auth_salt_v1';

export class AuthService {
  /**
   * Hashes password using salted SHA-256
   */
  private static async hashPassword(password: string): Promise<string> {
    return await PrivacyGuardrails.hashWithSalt(password, AUTH_SALT);
  }

  /**
   * Authenticates user using Username or Email and Password
   */
  static async loginWithCredentials(
    usernameOrEmail: string,
    password: string
  ): Promise<UserProfile> {
    const cleanIdentifier = usernameOrEmail.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanIdentifier || !cleanPassword) {
      throw new Error('Lütfen kullanıcı adı/e-posta ve şifrenizi girin.');
    }

    const passwordHash = await AuthService.hashPassword(cleanPassword);

    // Search by username or email
    const userByUsername = await db.users.where('username').equals(cleanIdentifier).first();
    const userByEmail = !userByUsername && cleanIdentifier.includes('@')
      ? await db.users.where('email').equals(cleanIdentifier).first()
      : null;

    const user: UserAccountRecord | undefined = userByUsername || userByEmail || undefined;

    if (!user) {
      throw new Error('Kullanıcı bulunamadı. Lütfen kullanıcı adı ve şifrenizi kontrol edin veya yeni hesap oluşturun.');
    }

    if (user.passwordHash !== passwordHash) {
      throw new Error('Hatalı şifre. Lütfen şifrenizi tekrar kontrol edin.');
    }

    const profile: UserProfile = {
      name: user.name,
      username: user.username,
      email: user.email,
      picture: user.avatarUrl,
      isGoogleConnected: false,
      isPasswordAccount: true,
      createdAt: user.createdAt,
    };

    return profile;
  }

  /**
   * Registers a new user account with Username, Password, and Display Name
   */
  static async registerWithCredentials(
    username: string,
    password: string,
    name: string,
    email?: string
  ): Promise<UserProfile> {
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
    const cleanPassword = password.trim();
    const cleanName = name.trim();
    const cleanEmail = email ? email.trim().toLowerCase() : undefined;

    if (cleanUsername.length < 3) {
      throw new Error('Kullanıcı adı en az 3 karakterden oluşmalıdır.');
    }
    if (cleanPassword.length < 4) {
      throw new Error('Şifre en az 4 karakter olmalıdır.');
    }
    if (!cleanName) {
      throw new Error('Lütfen adınızı veya takma adınızı girin.');
    }

    // Check if username already exists
    const existing = await db.users.where('username').equals(cleanUsername).first();
    if (existing) {
      throw new Error('Bu kullanıcı adı zaten kullanılıyor. Lütfen başka bir kullanıcı adı seçin.');
    }

    const passwordHash = await AuthService.hashPassword(cleanPassword);
    const createdAt = Date.now();

    await db.users.add({
      username: cleanUsername,
      email: cleanEmail,
      passwordHash,
      name: cleanName,
      createdAt,
    });

    const profile: UserProfile = {
      name: cleanName,
      username: cleanUsername,
      email: cleanEmail,
      isGoogleConnected: false,
      isPasswordAccount: true,
      createdAt,
    };

    return profile;
  }

  /**
   * Sign In With Google Proxy
   */
  static async loginWithGoogle(): Promise<UserProfile | null> {
    return await fbSignInWithGoogle();
  }

  /**
   * Redirect Google Sign In
   */
  static async loginWithGoogleRedirect(): Promise<void> {
    await fbSignInWithGoogleRedirect();
  }

  /**
   * Sign out
   */
  static async logout(): Promise<void> {
    await fbSignOutGoogle();
  }
}
