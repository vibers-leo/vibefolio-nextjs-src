// lib/email/resend.ts
// Resend Email Service

import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  console.warn('[Resend] API Key not found. Email features will be disabled.');
}

export const resend = resendApiKey ? new Resend(resendApiKey) : null;

/**
 * 이메일 발송
 */
export async function sendEmail({
  from = 'Vibefolio <noreply@vibefolio.net>',
  to,
  subject,
  html,
  text,
  replyTo,
}: {
  from?: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
}) {
  if (!resend) {
    throw new Error('Resend API Key not configured');
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text,
      replyTo,
    });

    if (error) {
      console.error('[Resend] Send error:', error);
      throw error;
    }

    console.log('[Resend] Email sent:', data?.id);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error('[Resend] Send failed:', error);
    throw error;
  }
}

/**
 * 템플릿 이메일 발송
 */
export async function sendTemplateEmail({
  to,
  subject,
  template,
  data,
  from = 'Vibefolio <noreply@vibefolio.net>',
}: {
  to: string | string[];
  subject: string;
  template: 'welcome' | 'notification' | 'support' | 'project-update';
  data: Record<string, any>;
  from?: string;
}) {
  const html = renderTemplate(template, data);
  return sendEmail({ from, to, subject, html });
}

/**
 * 간단한 템플릿 렌더러
 */
function renderTemplate(template: string, data: Record<string, any>): string {
  const templates = {
    welcome: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #16a34a;">환영합니다! 👋</h1>
        <p>안녕하세요, ${data.name || '회원'}님!</p>
        <p>${data.message || 'Vibefolio에 가입해주셔서 감사합니다.'}</p>
        <a href="${data.link || '#'}" style="display: inline-block; padding: 12px 24px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0;">
          시작하기
        </a>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px;">© 2026 Vibefolio. All rights reserved.</p>
      </div>
    `,
    notification: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">${data.title || '알림'}</h2>
        <p>${data.message || ''}</p>
        ${data.link ? `<a href="${data.link}" style="color: #16a34a;">자세히 보기 →</a>` : ''}
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px;">© 2026 Vibefolio. All rights reserved.</p>
      </div>
    `,
    support: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">문의 접수 완료</h2>
        <p>안녕하세요, ${data.name || '고객'}님!</p>
        <p>문의하신 내용이 접수되었습니다. 빠른 시일 내에 답변드리겠습니다.</p>
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;"><strong>문의 내용:</strong></p>
          <p style="margin: 10px 0 0 0;">${data.message || ''}</p>
        </div>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px;">© 2026 Vibefolio. All rights reserved.</p>
      </div>
    `,
    'project-update': `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 30px; border-radius: 12px 12px 0 0;">
          <h2 style="color: white; margin: 0;">프로젝트 변경 감지</h2>
        </div>
        <div style="padding: 30px; background: #ffffff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="font-size: 16px; color: #1f2937; margin-top: 0;">
            <strong>${data.projectTitle || '프로젝트'}</strong>에서 변경사항이 감지되었습니다.
          </p>
          <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <p style="margin: 0; color: #065f46; font-size: 14px;">${data.changesSummary || ''}</p>
          </div>
          <a href="${data.updateUrl || '#'}" style="display: inline-block; padding: 14px 28px; background-color: #059669; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px 0;">
            버전 업데이트하기
          </a>
          <p style="color: #6b7280; font-size: 13px; margin-top: 20px;">
            AI가 분석한 변경사항을 바탕으로 버전 업데이트를 작성할 수 있습니다.
          </p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px;">&copy; 2026 Vibefolio. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  return templates[template as keyof typeof templates] || templates.notification;
}
