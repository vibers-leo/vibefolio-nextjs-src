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
    return ADMIN_EMAILS.includes(userOrEmail.toLowerCase());
  }
  
  // If it's a Supabase User object
  const email = userOrEmail.email || userOrEmail.user_metadata?.email;
  if (!email) return false;
  
  return ADMIN_EMAILS.includes(email.toLowerCase());
};
