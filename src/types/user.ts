export type UserGender = 'female' | 'male' | 'other' | 'prefer_not_to_say';

export interface UserProfile {
  name: string;
  username?: string;
  email?: string;
  picture?: string;
  age?: number;
  gender?: UserGender;
  isGoogleConnected: boolean;
  isAppleConnected?: boolean;
  isPasswordAccount?: boolean;
  createdAt: number;
}

export interface UserAccountRecord {
  id?: number;
  username: string;
  email?: string;
  passwordHash: string;
  name: string;
  age?: number;
  gender?: UserGender;
  avatarUrl?: string;
  createdAt: number;
}

export interface UserSettings {
  onboardingCompleted: boolean;
  sensorsEnabled: {
    motion: boolean;
    typing: boolean;
    touch: boolean;
    session: boolean;
    light: boolean;
    battery: boolean;
    network: boolean;
    voice: boolean;
    location: boolean;
  };
  notificationsEnabled: boolean;
  lastAnalysisTimestamp: number;
}

export interface GoogleCredentialPayload {
  sub: string;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  email?: string;
  email_verified?: boolean;
}
