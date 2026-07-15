import { Queue } from 'bullmq';
import { getRedisClient } from '../config/redis.js';
import { AccountLinkType } from '../constants/account-link.constant.js';


export type SendOtpJobData = {
  userId: string;
  to: string;
  fullName: string;
  otp: string;
};

export type SendAccountLinkJobData = {
  userId: string;
  to: string;
  fullName: string;
  link: string;
  type: AccountLinkType;
};

export type EmailJobData = SendOtpJobData | SendAccountLinkJobData;

export const EMAIL_QUEUE_NAME = 'EmailQueue';
export const SEND_OTP_JOB = 'send-otp-job';
export const SEND_ACCOUNT_LINK_JOB = 'send-account-link-job';

let emailQueue: Queue<EmailJobData> | null = null;

/**
 * Chỉ khởi tạo queue sau khi Redis đã kết nối thành công trong server.start().
 */
export const initializeEmailQueue = (): Queue<EmailJobData> => {
  if (emailQueue) {
    return emailQueue;
  }

  emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
    connection: getRedisClient() as any,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  });

  return emailQueue;
};

export const getEmailQueue = (): Queue<EmailJobData> => {
  if (!emailQueue) {
    throw new Error('Email queue has not been initialized');
  }

  return emailQueue;
};
