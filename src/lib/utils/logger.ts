// activity_logs는 Prisma 스키마에 없음 — 콘솔 로그만 기록
export type ActivityAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'APPROVE' | 'REJECT';
export type TargetType = 'PROJECT' | 'BANNER' | 'RECRUIT' | 'USER' | 'SETTINGS' | 'NOTICE' | 'FAQ' | 'INQUIRY';

interface LogActivityParams {
  action: ActivityAction;
  targetType: TargetType;
  targetId?: string | number;
  details?: any;
  userId: string;
  userEmail?: string;
  ipAddress?: string;
}

/**
 * 관리자 활동 로그를 기록하는 함수
 */
export async function logActivity({
  action,
  targetType,
  targetId,
  details,
  userId,
  userEmail,
  ipAddress
}: LogActivityParams) {
  console.log('[ActivityLog]', { action, targetType, targetId, details, userId, userEmail, ipAddress });
}
