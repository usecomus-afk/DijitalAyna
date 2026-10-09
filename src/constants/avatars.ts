import avatarZorlu from '../assets/avatars/avatar-zorlu.jpg';
import avatarDusuk from '../assets/avatars/avatar-dusuk.jpg';
import avatarNormal from '../assets/avatars/avatar-normal.jpg';
import avatarIyi from '../assets/avatars/avatar-iyi.jpg';
import avatarHarika from '../assets/avatars/avatar-harika.jpg';
import avatarMutsuz from '../assets/avatars/avatar-mutsuz.jpg';
import avatarUzgun from '../assets/avatars/avatar-uzgun.jpg';
import avatarKaygili from '../assets/avatars/avatar-kaygili.jpg';
import avatarOfkeli from '../assets/avatars/avatar-ofkeli.jpg';
import avatarUmutsuz from '../assets/avatars/avatar-umutsuz.jpg';
import avatarMutlu from '../assets/avatars/avatar-mutlu.jpg';
import avatarEnerjik from '../assets/avatars/avatar-enerjik.jpg';

import avatarKadinZorlu from '../assets/avatars/avatar-zorlu.jpg';
import avatarKadinDusuk from '../assets/avatars/avatar-dusuk.jpg';
import avatarKadinNormal from '../assets/avatars/avatar-normal.jpg';
import avatarKadinIyi from '../assets/avatars/avatar-iyi.jpg';
import avatarKadinHarika from '../assets/avatars/avatar-harika.jpg';

export const AVATAR_IMAGES_MALE = {
  zorlu: avatarZorlu,
  dusuk: avatarDusuk,
  normal: avatarNormal,
  iyi: avatarIyi,
  harika: avatarHarika,
  mutsuz: avatarMutsuz,
  uzgun: avatarUzgun,
  kaygili: avatarKaygili,
  ofkeli: avatarOfkeli,
  umutsuz: avatarUmutsuz,
  mutlu: avatarMutlu,
  enerjik: avatarEnerjik,
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
  mutsuz: avatarMutsuz, // using same neutral ones
  uzgun: avatarUzgun,
  kaygili: avatarKaygili,
  ofkeli: avatarOfkeli,
  umutsuz: avatarUmutsuz,
  mutlu: avatarMutlu,
  enerjik: avatarEnerjik,
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
