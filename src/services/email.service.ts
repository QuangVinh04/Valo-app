
import env from '../config/env.js';
import { mailTransporter } from '../config/mail.js';
import { otpEmailTemplate } from '../templates/email/otp.js';
import {
  accountLinkEmailTemplate,
} from '../templates/email/account-link.js';
import { SendAccountLinkJobData } from '../queues/email.queue.js';

type OtpEmailInput = {
  to: string;
  fullName: string;
  otp: string;
};
export class EmailService {
  async sendOtpEmail(input: OtpEmailInput): Promise<void> {
    const template = otpEmailTemplate({
      fullName: input.fullName,
      otp: input.otp,
      expiresInMinutes: 5
    });

    await mailTransporter.sendMail({
      from: env.MAIL_FROM,
      to: input.to,
      subject: template.subject,
      text: template.text,
      html: template.html
    });
  }

  async sendAccountLinkEmail(input: SendAccountLinkJobData): Promise<void> {
    const template = accountLinkEmailTemplate(input);

    await mailTransporter.sendMail({
      from: env.MAIL_FROM,
      to: input.to,
      subject: template.subject,
      text: template.text,
      html: template.html
    });
  }
}

export default EmailService;
