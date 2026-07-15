import 'dotenv/config';
import type { SignOptions } from 'jsonwebtoken';


const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 4001),
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  CLIENT_URL: process.env.CLIENT_URL || '*',
  APP_URL: process.env.APP_URL
    || (process.env.CLIENT_URL && process.env.CLIENT_URL !== '*'
      ? process.env.CLIENT_URL
      : 'http://localhost:5173'),
  LOG_LEVEL: process.env.LOG_LEVEL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_VALID_DURATION: process.env.JWT_VALID_DURATION as SignOptions['expiresIn'],
  JWT_REFRESH_DURATION: process.env.JWT_REFRESH_DURATION as SignOptions['expiresIn'],
  MAIL_HOST: process.env.SMTP_HOST,
  MAIL_PORT: Number(process.env.SMTP_PORT || 587),
  MAIL_SECURE: process.env.SMTP_SECURE === 'true',
  MAIL_USER: process.env.SMTP_USER,
  MAIL_PASS: process.env.SMTP_PASS,
  MAIL_FROM: process.env.SMTP_FROM,
  AI_PROVIDER: process.env.AI_PROVIDER || 'flowise',
  AI_STREAM_TIMEOUT_MS: Number(process.env.AI_STREAM_TIMEOUT_MS || 120000),
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  GROQ_BASE_URL: process.env.GROQ_BASE_URL || 'https://api.groq.com',
  FLOWISE_API_KEY: process.env.FLOWISE_API_KEY,
  FLOWISE_BASE_URL: process.env.FLOWISE_BASE_URL,
  FLOWISE_CHATFLOW_ID: process.env.FLOWISE_CHATFLOW_ID,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  LOCAL_FILE_STORAGE_DIR: process.env.LOCAL_FILE_STORAGE_DIR
};

const requiredVars = ['DATABASE_URL', 'REDIS_URL', 'JWT_SECRET', 'MAIL_HOST', 'MAIL_PORT', 'MAIL_USER', 'MAIL_PASS'] as const;
const missingVars = requiredVars.filter((key) => !env[key]);

if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

export default env;
