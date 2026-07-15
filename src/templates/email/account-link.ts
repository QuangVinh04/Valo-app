import { ACCOUNT_LINK_TYPE, type AccountLinkType } from '../../constants/account-link.constant.js';
import type { SendAccountLinkJobData } from '../../queues/email.queue.js';

type AccountLinkEmailTemplate = {
  subject: string;
  text: string;
  html: string;
};

const APP_NAME = 'MiniAgentHub';
const EXPIRATION_TEXT: Record<AccountLinkType, string> = {
  [ACCOUNT_LINK_TYPE.INVITE]: '24 hours',
  [ACCOUNT_LINK_TYPE.RESET_PASSWORD]: '15 minutes'
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function accountLinkEmailTemplate(input: SendAccountLinkJobData): AccountLinkEmailTemplate {
  const isInvitation = input.type === ACCOUNT_LINK_TYPE.INVITE;
  const expiresInText = EXPIRATION_TEXT[input.type];
  const subject = isInvitation ? 'Activate your account' : 'Reset your password';
  const action = isInvitation ? 'Activate account' : 'Reset password';
  const description = isInvitation
    ? 'An administrator created an account for you. Use the button below to set your password and activate the account.'
    : 'We received a request to reset your password. Use the button below to create a new password.';
  const safeName = escapeHtml(input.fullName);
  const safeLink = escapeHtml(input.link);

  return {
    subject,
    text: [
      `Hello ${input.fullName},`,
      '',
      description,
      input.link,
      '',
      `This link expires in ${expiresInText} and can only be used once.`,
      'If you did not expect this email, you can safely ignore it.'
    ].join('\n'),
    html: `
      <!DOCTYPE html>
      <html>
        <body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
                  <tr>
                    <td style="background:#2563eb;padding:24px;text-align:center;color:#ffffff;">
                      <h1 style="margin:0;font-size:24px;">${APP_NAME}</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:32px;color:#111827;">
                      <h2 style="margin:0 0 16px;">Hello ${safeName},</h2>
                      <p style="font-size:16px;line-height:1.6;margin:0 0 24px;">${description}</p>
                      <p style="margin:0 0 24px;text-align:center;">
                        <a href="${safeLink}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;">${action}</a>
                      </p>
                      <p style="font-size:14px;line-height:1.6;color:#6b7280;margin:0 0 8px;">
                        This link expires in ${expiresInText} and can only be used once.
                      </p>
                      <p style="font-size:14px;line-height:1.6;color:#6b7280;margin:0;">
                        If you did not expect this email, you can safely ignore it.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `
  };
}
