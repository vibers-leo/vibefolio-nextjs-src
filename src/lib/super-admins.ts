export const SUPER_ADMINS = [
  'designd@designd.co.kr',
  'juuuno@naver.com',
  'juuuno1116@gmail.com',
  'duscontactus@gmail.com',
  'designdlab@designdlab.co.kr',
] as const;

export const isSuperAdmin = (email: string | null | undefined): boolean =>
  SUPER_ADMINS.includes(email as typeof SUPER_ADMINS[number]);
