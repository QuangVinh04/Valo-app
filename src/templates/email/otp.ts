type OtpEmailTemplateInput = {
  fullName: string;
  otp: string;
  expiresInMinutes: number;
};

type OtpEmailTemplate = {
  subject: string;
  text: string;
  html: string;
};

const APP_NAME = 'MiniAgentHub';

const escapeHtml = (value: string): string => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

export function otpEmailTemplate(input: OtpEmailTemplateInput): OtpEmailTemplate {
  const fullName = escapeHtml(input.fullName);
  const otp = escapeHtml(input.otp);

  return {
    subject: 'Verify your account',
    text: [
      `Hello ${input.fullName},`,
      '',
      'Use the OTP below to verify your account.',
      `OTP: ${input.otp}`,
      '',
      `This OTP expires in ${input.expiresInMinutes} minutes.`,
      '',
      `If you did not request this code, please ignore this email.`,
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
                      <h2 style="margin:0 0 16px;">Hello ${fullName},</h2>

                      <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">
                        Use the OTP below to verify your account.
                      </p>

                      <div style="background:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;padding:18px;text-align:center;margin:24px 0;">
                        <span style="font-size:28px;font-weight:bold;letter-spacing:6px;color:#2563eb;">
                          ${otp}
                        </span>
                      </div>

                      <p style="font-size:14px;line-height:1.6;color:#6b7280;margin:0 0 8px;">
                        This OTP expires in ${input.expiresInMinutes} minutes.
                      </p>

                      <p style="font-size:14px;line-height:1.6;color:#6b7280;margin:0;">
                        If you did not request this code, please ignore this email.
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td style="background:#f9fafb;padding:20px;text-align:center;color:#6b7280;font-size:12px;">
                      &copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  };
}
