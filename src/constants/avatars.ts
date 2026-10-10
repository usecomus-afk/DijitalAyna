import avatarZorlu from '../assets/avatars/avatar-zorlu.png';
import avatarDusuk from '../assets/avatars/avatar-dusuk.png';
import avatarNormal from '../assets/avatars/avatar-normal.png';
import avatarIyi from '../assets/avatars/avatar-iyi.png';
import avatarHarika from '../assets/avatars/avatar-harika.png';
import avatarMutsuz from '../assets/avatars/avatar-zorlu.png';
import avatarUzgun from '../assets/avatars/avatar-dusuk.png';
import avatarKaygili from '../assets/avatars/avatar-dusuk.png';
import avatarOfkeli from '../assets/avatars/avatar-zorlu.png';
import avatarUmutsuz from '../assets/avatars/avatar-zorlu.png';
import avatarMutlu from '../assets/avatars/avatar-iyi.png';
import avatarEnerjik from '../assets/avatars/avatar-harika.png';

export const AVATAR_IMAGES = {
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

export const getAvatarMap = () => {
  return AVATAR_IMAGES;
};

export const getAvatarByScore = (score: number): string => {
  switch (score) {
    case 1:
      return AVATAR_IMAGES.zorlu;
    case 2:
      return AVATAR_IMAGES.dusuk;
    case 3:
      return AVATAR_IMAGES.normal;
    case 4:
      return AVATAR_IMAGES.iyi;
    case 5:
      return AVATAR_IMAGES.harika;
    default:
      return AVATAR_IMAGES.normal;
  }
};
