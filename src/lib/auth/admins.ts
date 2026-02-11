export const ADMIN_EMAILS = [
  "juuuno@naver.com",
  "juuuno1116@gmail.com",
  "designd@designd.co.kr",
  "designdlab@designdlab.co.kr",
  "admin@vibefolio.net",
  "duscontactus@gmail.com"
];

export const isAdminEmail = (email?: string | null) => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
};
