import { describe, it, expect } from 'vitest';
import {
  getAvatarByScore,
  getAvatarMap,
  AVATAR_IMAGES_MALE,
  AVATAR_IMAGES_FEMALE,
  AVATAR_IMAGES,
} from '../avatars';

describe('Avatar Selection & Gender Adaptation', () => {
  it('should return female avatars when gender is female', () => {
    const femaleMap = getAvatarMap('female');
    expect(femaleMap).toBe(AVATAR_IMAGES_FEMALE);

    expect(getAvatarByScore(1, 'female')).toBe(AVATAR_IMAGES_FEMALE.zorlu);
    expect(getAvatarByScore(2, 'female')).toBe(AVATAR_IMAGES_FEMALE.dusuk);
    expect(getAvatarByScore(3, 'female')).toBe(AVATAR_IMAGES_FEMALE.normal);
    expect(getAvatarByScore(4, 'female')).toBe(AVATAR_IMAGES_FEMALE.iyi);
    expect(getAvatarByScore(5, 'female')).toBe(AVATAR_IMAGES_FEMALE.harika);
  });

  it('should return male avatars when gender is male or unspecified', () => {
    const maleMap = getAvatarMap('male');
    expect(maleMap).toBe(AVATAR_IMAGES_MALE);

    expect(getAvatarByScore(1, 'male')).toBe(AVATAR_IMAGES_MALE.zorlu);
    expect(getAvatarByScore(2, 'male')).toBe(AVATAR_IMAGES_MALE.dusuk);
    expect(getAvatarByScore(3, 'male')).toBe(AVATAR_IMAGES_MALE.normal);
    expect(getAvatarByScore(4, 'male')).toBe(AVATAR_IMAGES_MALE.iyi);
    expect(getAvatarByScore(5, 'male')).toBe(AVATAR_IMAGES_MALE.harika);

    // Default when undefined
    expect(getAvatarByScore(3)).toBe(AVATAR_IMAGES_MALE.normal);
    expect(getAvatarByScore(1, undefined)).toBe(AVATAR_IMAGES_MALE.zorlu);
    expect(AVATAR_IMAGES).toBe(AVATAR_IMAGES_MALE);
  });

  it('should differentiate between female and male avatar images', () => {
    expect(AVATAR_IMAGES_FEMALE.zorlu).not.toBe(AVATAR_IMAGES_MALE.zorlu);
    expect(AVATAR_IMAGES_FEMALE.dusuk).not.toBe(AVATAR_IMAGES_MALE.dusuk);
    expect(AVATAR_IMAGES_FEMALE.normal).not.toBe(AVATAR_IMAGES_MALE.normal);
    expect(AVATAR_IMAGES_FEMALE.iyi).not.toBe(AVATAR_IMAGES_MALE.iyi);
    expect(AVATAR_IMAGES_FEMALE.harika).not.toBe(AVATAR_IMAGES_MALE.harika);
  });

  it('should default to normal avatar for invalid scores', () => {
    expect(getAvatarByScore(0 as any, 'female')).toBe(AVATAR_IMAGES_FEMALE.normal);
    expect(getAvatarByScore(99 as any, 'male')).toBe(AVATAR_IMAGES_MALE.normal);
  });
});
