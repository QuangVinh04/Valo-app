import { Worker, type Job } from 'bullmq';
import { getRedisClient } from '../config/redis.js';
import { EmailService } from '../services/email.service.js';
import logger from '../utils/logger.util.js';
import { EMAIL_QUEUE_NAME, SEND_OTP_JOB, type SendOtpJobData } from './email.queue.js';

const workerConnection = getRedisClient().duplicate();
const emailService = new EmailService();

export const emailWorker = new Worker<SendOtpJobData>(
  EMAIL_QUEUE_NAME,
  async (job: Job<SendOtpJobData>) => {
    if (job.name === SEND_OTP_JOB) {
      const { to, fullName, otp } = job.data;

      logger.info(`[Worker] Sending OTP to: ${to}`);
      await emailService.sendOtpEmail({ to, fullName, otp });
    }
  },
  {
    connection: workerConnection as any,
    concurrency: 5,
  }
);

emailWorker.on('completed', (job) => {
  logger.info(`OTP email job completed: ID ${job.id}`);
});

emailWorker.on('failed', (job, err) => {
  logger.error(`OTP email job failed: ID ${job?.id}. Error: ${err.message}`);
});

emailWorker.on('error', (error) => {
  logger.error('OTP email worker error', { message: error.message, stack: error.stack });
});
