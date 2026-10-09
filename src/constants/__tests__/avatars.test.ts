import { describe, it, expect } from 'vitest';
import {
  AVATAR_IMAGES,
  getAvatarMap,
  getAvatarByScore,
} from '../avatars';

describe('avatars constants', () => {
  it('should return correct map', () => {
    expect(getAvatarMap()).toBe(AVATAR_IMAGES);
  });

  it('should return correct avatar by score', () => {
    expect(getAvatarByScore(1)).toBe(AVATAR_IMAGES.zorlu);
    expect(getAvatarByScore(2)).toBe(AVATAR_IMAGES.dusuk);
    expect(getAvatarByScore(3)).toBe(AVATAR_IMAGES.normal);
    expect(getAvatarByScore(4)).toBe(AVATAR_IMAGES.iyi);
    expect(getAvatarByScore(5)).toBe(AVATAR_IMAGES.harika);
  });

  it('should fallback to normal for invalid scores', () => {
    expect(getAvatarByScore(0 as any)).toBe(AVATAR_IMAGES.normal);
    expect(getAvatarByScore(99 as any)).toBe(AVATAR_IMAGES.normal);
  });
});
