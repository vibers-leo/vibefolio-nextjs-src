export const ADMIN_EMAILS = [
  "juuuno@naver.com",
  "juuuno1116@gmail.com",
  "designd@designd.co.kr",
  "designdlab@designdlab.co.kr",
  "admin@vibefolio.net",
  "duscontactus@gmail.com"
].map(email => email.toLowerCase());

export const isAdminEmail = (userOrEmail?: any): boolean => {
  if (!userOrEmail) {
    console.warn('[AdminCheck] No user/email provided');
    return false;
  }

  // If it's a string (email)
  if (typeof userOrEmail === 'string') {
    const normalizedEmail = userOrEmail.toLowerCase().trim();
    const result = ADMIN_EMAILS.includes(normalizedEmail);
    console.log(`[AdminCheck] string: ${userOrEmail} -> ${result ? 'ADMIN ✅' : 'USER ❌'}`);
    return result;
  }

  // If it's a Supabase User object
  const email = userOrEmail.email || userOrEmail.user_metadata?.email;
  if (!email) {
    console.warn('[AdminCheck] No email found in user object', userOrEmail);
    return false;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const result = ADMIN_EMAILS.includes(normalizedEmail);
  console.log(`[AdminCheck] object email: ${email} -> ${result ? 'ADMIN ✅' : 'USER ❌'}`);
  return result;
};
