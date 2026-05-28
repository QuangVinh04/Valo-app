
import env from '../config/env.js';
import { mailTransporter } from '../config/mail.js';
import { temporaryPasswordTemplate } from '../templates/email/temporary-password.js';

type TemporaryPasswordEmailInput = {
  to: string;
  fullName: string;
  temporaryPassword: string;
};

export class EmailService {
  
  async sendTemporaryPasswordEmail(input: TemporaryPasswordEmailInput): Promise<void> {

    await mailTransporter.sendMail({
      from: env.MAIL_FROM,
      to: input.to,
      subject: 'Your temporary password',
      text: [
        `Hello ${input.fullName},`,
        '',
        'Your account has been created.',
        `Temporary password: ${input.temporaryPassword}`,
        '',
        'Please log in and change your password immediately.',
      ].join('\n'),
      html: temporaryPasswordTemplate({
        fullName: input.fullName,
        temporaryPassword: input.temporaryPassword
      })
    });
  }
}

export default EmailService;
