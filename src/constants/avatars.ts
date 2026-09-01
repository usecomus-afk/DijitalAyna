import avatarZorlu from '../assets/avatars/avatar-zorlu.png';
import avatarDusuk from '../assets/avatars/avatar-dusuk.png';
import avatarNormal from '../assets/avatars/avatar-normal.png';
import avatarIyi from '../assets/avatars/avatar-iyi.png';
import avatarHarika from '../assets/avatars/avatar-harika.png';

export const AVATAR_IMAGES = {
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

export const getAvatarByScore = (score: number): string => {
  switch (score) {
    case 1:
      return avatarZorlu;
    case 2:
      return avatarDusuk;
    case 3:
      return avatarNormal;
    case 4:
      return avatarIyi;
    case 5:
      return avatarHarika;
    default:
      return avatarNormal;
  }
};
