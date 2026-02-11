export const ADMIN_EMAILS = [
  "juuuno@naver.com",
  "juuuno1116@gmail.com",
  "designd@designd.co.kr",
  "designdlab@designdlab.co.kr",
  "admin@vibefolio.net",
  "duscontactus@gmail.com"
];

export const isAdminEmail = (userOrEmail?: any) => {
  if (!userOrEmail) return false;
  
  // If it's a string (email)
  if (typeof userOrEmail === 'string') {
    const result = ADMIN_EMAILS.includes(userOrEmail.toLowerCase());
    console.log(`[AdminCheck] string: ${userOrEmail} -> ${result}`);
    return result;
  }
  
  // If it's a Supabase User object
  const email = userOrEmail.email || userOrEmail.user_metadata?.email;
  if (!email) {
    console.log(`[AdminCheck] No email found in user object`, userOrEmail);
    return false;
  }
  
  const result = ADMIN_EMAILS.includes(email.toLowerCase());
  console.log(`[AdminCheck] object email: ${email} -> ${result}`);
  return result;
};
