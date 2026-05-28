export function temporaryPasswordTemplate(input: {
  fullName: string;
  temporaryPassword: string;
}): string {
  return `
  <!DOCTYPE html>
  <html>
    <body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
              <tr>
                <td style="background:#2563eb;padding:24px;text-align:center;color:#ffffff;">
                  <h1 style="margin:0;font-size:24px;">MiniAgentHub</h1>
                </td>
              </tr>

              <tr>
                <td style="padding:32px;color:#111827;">
                  <h2 style="margin-top:0;">Hello ${input.fullName},</h2>

                  <p style="font-size:16px;line-height:1.6;">
                    Your account has been created successfully.
                  </p>

                  <p style="font-size:16px;line-height:1.6;">
                    Please use the temporary password below to log in:
                  </p>

                  <div style="background:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;padding:16px;text-align:center;margin:24px 0;">
                    <span style="font-size:24px;font-weight:bold;letter-spacing:2px;color:#2563eb;">
                      ${input.temporaryPassword}
                    </span>
                  </div>

                  <p style="font-size:14px;line-height:1.6;color:#6b7280;">
                    For security reasons, please change your password immediately after logging in.
                  </p>
                </td>
              </tr>

              <tr>
                <td style="background:#f9fafb;padding:20px;text-align:center;color:#6b7280;font-size:12px;">
                  © ${new Date().getFullYear()} MiniAgentHub. All rights reserved.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
}