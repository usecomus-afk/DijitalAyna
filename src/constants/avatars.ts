import avatarZorlu from '../assets/avatars/avatar-zorlu.png';
import avatarDusuk from '../assets/avatars/avatar-dusuk.png';
import avatarNormal from '../assets/avatars/avatar-normal.png';
import avatarIyi from '../assets/avatars/avatar-iyi.png';
import avatarHarika from '../assets/avatars/avatar-harika.png';

import avatarKadinZorlu from '../assets/avatars/avatar-kadin-zorlu.png';
import avatarKadinDusuk from '../assets/avatars/avatar-kadin-dusuk.png';
import avatarKadinNormal from '../assets/avatars/avatar-kadin-normal.png';
import avatarKadinIyi from '../assets/avatars/avatar-kadin-iyi.png';
import avatarKadinHarika from '../assets/avatars/avatar-kadin-harika.png';

export const AVATAR_IMAGES_MALE = {
  zorlu: avatarZorlu,
  dusuk: avatarDusuk,
  normal: avatarNormal,
  iyi: avatarIyi,
  harika: avatarHarika,
  1: avatarZorlu,
  2: avatarDusuk,
  3: avatarNormal,
  4: avatarIyi,
  5: avatarHarika,
} as const;

export const AVATAR_IMAGES_FEMALE = {
  zorlu: avatarKadinZorlu,
  dusuk: avatarKadinDusuk,
  normal: avatarKadinNormal,
  iyi: avatarKadinIyi,
  harika: avatarKadinHarika,
  1: avatarKadinZorlu,
  2: avatarKadinDusuk,
  3: avatarKadinNormal,
  4: avatarKadinIyi,
  5: avatarKadinHarika,
} as const;

export const getAvatarMap = (gender?: string) => {
  return gender === 'female' ? AVATAR_IMAGES_FEMALE : AVATAR_IMAGES_MALE;
};

// Default fallback for legacy usages
export const AVATAR_IMAGES = AVATAR_IMAGES_MALE;

export const getAvatarByScore = (score: number, gender?: string): string => {
  const avatarSet = gender === 'female' ? AVATAR_IMAGES_FEMALE : AVATAR_IMAGES_MALE;
  switch (score) {
    case 1:
      return avatarSet.zorlu;
    case 2:
      return avatarSet.dusuk;
    case 3:
      return avatarSet.normal;
    case 4:
      return avatarSet.iyi;
    case 5:
      return avatarSet.harika;
    default:
      return avatarSet.normal;
  }
};

