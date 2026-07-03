import { Queue } from 'bullmq';
import { getRedisClient } from '../config/redis.js';

export type SendOtpJobData = {
  userId: string;
  to: string;
  fullName: string;
  otp: string;
};

export const EMAIL_QUEUE_NAME = 'EmailQueue';
export const SEND_OTP_JOB = 'send-otp-job';

export const emailQueue = new Queue<SendOtpJobData>(EMAIL_QUEUE_NAME, {
  connection: getRedisClient() as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: true,
    removeOnFail: false,
  },
});
