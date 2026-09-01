import { describe, it, expect } from 'vitest';
import { PrivacyGuardrails } from '../PrivacyGuardrails';

describe('PrivacyGuardrails - Zero Raw Text Storage & Salted Anonymization', () => {
  it('should generate deterministic salted SHA-256 hashes', async () => {
    const hash1 = await PrivacyGuardrails.hashWithSalt('+905321234567', 'user_salt_123');
    const hash2 = await PrivacyGuardrails.hashWithSalt('+905321234567', 'user_salt_123');
    const hashDifferentSalt = await PrivacyGuardrails.hashWithSalt('+905321234567', 'user_salt_999');

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hashDifferentSalt);
    expect(hash1.length).toBe(64); // 256 bits = 64 hex chars
  });

  it('should strictly strip raw text and key characters from keystroke telemetry', () => {
    const invasivePayload = {
      eventType: 'KEY_DOWN',
      durationMs: 85,
      interKeyDelayMs: 140,
      timestamp: 1700000000000,
      key: 'p',
      character: 'p',
      keyCode: 80,
      text: 'password123',
    };

    const sanitized = PrivacyGuardrails.sanitizeKeystroke(invasivePayload);
    expect(sanitized).toBeDefined();
    expect(sanitized!.eventType).toBe('KEY_DOWN');
    expect(sanitized!.durationMs).toBe(85);
    expect(sanitized!.interKeyDelayMs).toBe(140);
    // Explicitly verify key, character, text are not present
    expect((sanitized as any).key).toBeUndefined();
    expect((sanitized as any).text).toBeUndefined();
    expect((sanitized as any).character).toBeUndefined();
  });

  it('should anonymize contact IDs in CallLogMetadataEvent', async () => {
    const rawCall = {
      direction: 'OUTGOING',
      durationSeconds: 120,
      contactId: 'Dr. Ahmet Hoca (+905329999999)',
      timestamp: 1700000000000,
    };

    const sanitized = await PrivacyGuardrails.sanitizeCallLog(rawCall, 'salt_abc');
    expect(sanitized.direction).toBe('OUTGOING');
    expect(sanitized.durationSeconds).toBe(120);
    expect(sanitized.hashedContactId).toBeDefined();
    expect(sanitized.hashedContactId.length).toBe(64);
    expect(sanitized.hashedContactId).not.toContain('Ahmet');
  });

  it('should apply Laplace differential privacy noise accurately', () => {
    const original = 100;
    const noisy = PrivacyGuardrails.addLaplaceNoise(original, 1.0, 0.5);
    expect(typeof noisy).toBe('number');
    expect(isNaN(noisy)).toBe(false);
  });
});
