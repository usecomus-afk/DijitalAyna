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
