import { Worker, type Job } from 'bullmq';

import { getRedisClient } from '../config/redis.js';
import { userRepository } from '../repositories/user.repository.js';
import { EmailService } from '../services/email.service.js';
import logger from '../utils/logger.util.js';

import {
  EMAIL_QUEUE_NAME,
  SEND_ACCOUNT_LINK_JOB,
  SEND_OTP_JOB,
  type EmailJobData,
  type SendAccountLinkJobData,
  type SendOtpJobData
} from './email.queue.js';

const workerConnection = getRedisClient().duplicate();
const emailService = new EmailService();

async function handleSendOtpJob(job: Job<SendOtpJobData>): Promise<void> {
  const { to, fullName, otp } = job.data;

  logger.info('[EmailWorker] Sending OTP email', {
    jobId: job.id,
    to
  });

  await emailService.sendOtpEmail({
    to,
    fullName,
    otp
  });
}

async function handleSendAccountLinkJob(job: Job<SendAccountLinkJobData>): Promise<void> {
  const data = job.data;

  logger.info('[EmailWorker] Sending account link email', {
    jobId: job.id,
    userId: data.userId,
    type: data.type,
    to: data.to
  });

  await emailService.sendAccountLinkEmail(data);

  if (data.type === 'INVITE') {
    await userRepository.updateInvitationEmailFailed(data.userId, false);

    logger.info('[EmailWorker] Invitation email sent successfully', {
      jobId: job.id,
      userId: data.userId
    });
  }
}

function hasExhaustedAttempts(job: Job): boolean {
  const maxAttempts = job.opts.attempts ?? 1;

  return job.attemptsMade >= maxAttempts;
}

export const emailWorker = new Worker<EmailJobData>(
  EMAIL_QUEUE_NAME,
  async (job: Job<EmailJobData>): Promise<void> => {
    switch (job.name) {
      case SEND_OTP_JOB:
        await handleSendOtpJob(job as Job<SendOtpJobData>);
        return;

      case SEND_ACCOUNT_LINK_JOB:
        await handleSendAccountLinkJob(job as Job<SendAccountLinkJobData>);
        return;

      default:
        throw new Error(`Unsupported email job: ${job.name}`);
    }
  },
  {
    connection: workerConnection as any,
    concurrency: 5
  }
);

emailWorker.on('completed', (job) => {
  logger.info('[EmailWorker] Job completed', {
    jobId: job.id,
    jobName: job.name,
    attemptsMade: job.attemptsMade
  });
});

emailWorker.on('failed', (job, error) => {
  logger.error('[EmailWorker] Job attempt failed', {
    jobId: job?.id,
    jobName: job?.name,
    attemptsMade: job?.attemptsMade,
    maxAttempts: job?.opts.attempts ?? 1,
    message: error.message,
    stack: error.stack
  });

  if (!job || job.name !== SEND_ACCOUNT_LINK_JOB) {
    return;
  }

  const data = job.data as SendAccountLinkJobData;

  if (data.type !== 'INVITE' || !hasExhaustedAttempts(job)) {
    return;
  }

  logger.warn('[EmailWorker] Invitation email exhausted all attempts', {
    jobId: job.id,
    userId: data.userId,
    attemptsMade: job.attemptsMade
  });

  void userRepository
    .updateInvitationEmailFailed(data.userId, true)
    .catch((updateError: unknown) => {
      logger.error('[EmailWorker] Failed to update invitation email status', {
        userId: data.userId,
        message: updateError instanceof Error ? updateError.message : String(updateError)
      });
    });
});

emailWorker.on('error', (error) => {
  logger.error('[EmailWorker] Worker error', {
    message: error.message,
    stack: error.stack
  });
});
