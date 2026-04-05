export const ADMIN_EMAILS = [
  "juuuno@naver.com",
  "juuuno1116@gmail.com",
  "designd@designd.co.kr",
  "designdlab@designdlab.co.kr",
  "admin@vibefolio.net",
  "duscontactus@gmail.com"
].map(email => email.toLowerCase());

const IS_DEV = process.env.NODE_ENV === 'development';

export const isAdminEmail = (userOrEmail?: any): boolean => {
  if (!userOrEmail) {
    if (IS_DEV) console.warn('[AdminCheck] No user/email provided');
    return false;
  }

  // If it's a string (email)
  if (typeof userOrEmail === 'string') {
    const normalizedEmail = userOrEmail.toLowerCase().trim();
    return ADMIN_EMAILS.includes(normalizedEmail);
  }

  // If it's a Supabase User object
  const email = userOrEmail.email || userOrEmail.user_metadata?.email;
  if (!email) {
    if (IS_DEV) console.warn('[AdminCheck] No email found in user object');
    return false;
  }

  const normalizedEmail = email.toLowerCase().trim();
  return ADMIN_EMAILS.includes(normalizedEmail);
};
