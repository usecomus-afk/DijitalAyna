import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '../authService';
import { db } from '../../db';
import { UserAccountRecord } from '../../types/user';

describe('AuthService - Username and Password Authentication', () => {
  const inMemoryUsers: UserAccountRecord[] = [];

  beforeEach(() => {
    inMemoryUsers.length = 0;

    // Mock db.users queries safely for in-memory unit tests
    vi.spyOn(db.users as any, 'clear').mockImplementation(async () => {
      inMemoryUsers.length = 0;
    });

    vi.spyOn(db.users as any, 'add').mockImplementation(async (user: any) => {
      inMemoryUsers.push(user);
      return inMemoryUsers.length;
    });

    vi.spyOn(db.users as any, 'where').mockImplementation((field: any) => {
      return {
        equals: (val: any) => ({
          first: async () => {
            return inMemoryUsers.find((u: any) => u[field] === val);
          },
        }),
      } as any;
    });
  });

  it('should register a new user account with hashed password', async () => {
    const profile = await AuthService.registerWithCredentials(
      'deniz',
      'secret123',
      'Deniz Yılmaz',
      'deniz@example.com'
    );

    expect(profile.name).toBe('Deniz Yılmaz');
    expect(profile.username).toBe('deniz');
    expect(profile.email).toBe('deniz@example.com');
    expect(profile.isPasswordAccount).toBe(true);

    const stored = inMemoryUsers.find((u) => u.username === 'deniz');
    expect(stored).toBeDefined();
    expect(stored!.passwordHash).not.toBe('secret123'); // Must be hashed!
    expect(stored!.passwordHash.length).toBe(64);
  });

  it('should prevent registration with duplicate username', async () => {
    await AuthService.registerWithCredentials('ahmet', 'pass123', 'Ahmet K.');

    await expect(
      AuthService.registerWithCredentials('ahmet', 'pass456', 'Ahmet 2')
    ).rejects.toThrow('zaten kullanılıyor');
  });

  it('should login successfully with registered username and password', async () => {
    await AuthService.registerWithCredentials('selin', 'selin2026', 'Selin Ak');

    const loggedIn = await AuthService.loginWithCredentials('selin', 'selin2026');
    expect(loggedIn.name).toBe('Selin Ak');
    expect(loggedIn.username).toBe('selin');
  });

  it('should reject login with wrong password', async () => {
    await AuthService.registerWithCredentials('can', 'canpass1', 'Can E.');

    await expect(
      AuthService.loginWithCredentials('can', 'wrongpassword')
    ).rejects.toThrow('Hatalı şifre');
  });

  it('should reject non-existent user credentials', async () => {
    await expect(
      AuthService.loginWithCredentials('nonexistent', 'pass123')
    ).rejects.toThrow('Kullanıcı bulunamadı');
  });
});
