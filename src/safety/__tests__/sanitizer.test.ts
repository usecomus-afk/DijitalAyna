import { describe, it, expect } from 'vitest';
import { sanitizeSensorEvent, sanitizeMoodInput } from '../sanitizer';

describe('Safety & Ethics - Sanitizer Gateway', () => {
  it('should strip non-numeric and text properties from payload', () => {
    const dangerousEvent: any = {
      type: 'typing',
      timestamp: 1724500000000,
      payload: {
        typing_wpm: 45.234,
        raw_text_typed: 'This is my private password and confidential diary message',
        user_id: 'secret_123',
        nested_data: { foo: 'bar' },
      }
    };

    const sanitized = sanitizeSensorEvent(dangerousEvent);
    expect(sanitized).toBeDefined();
    expect(sanitized?.type).toBe('typing');
    expect(sanitized?.payload).toEqual({
      typing_wpm: 45.234
    });
    expect((sanitized?.payload as any).raw_text_typed).toBeUndefined();
    expect((sanitized?.payload as any).user_id).toBeUndefined();
  });

  it('should reject invalid sensor event types', () => {
    const invalidEvent: any = {
      type: 'unauthorized_camera_feed',
      payload: { value: 123 }
    };
    expect(sanitizeSensorEvent(invalidEvent)).toBeNull();
  });

  it('should sanitize and truncate mood notes', () => {
    const rawNote = '  <b>Kendimi</b> biraz yorgun hissediyorum...  ';
    expect(sanitizeMoodInput(rawNote)).toBe('Kendimi biraz yorgun hissediyorum...');
  });
});
