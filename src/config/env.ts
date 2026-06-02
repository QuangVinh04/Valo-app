import type { SignOptions } from 'jsonwebtoken';


const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 4001),
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  CLIENT_URL: process.env.CLIENT_URL || '*',
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
  AI_PROVIDER: process.env.AI_PROVIDER || 'groq',
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  GROQ_BASE_URL: process.env.GROQ_BASE_URL || 'https://api.groq.com'
};

const requiredVars = ['DATABASE_URL', 'REDIS_URL', 'JWT_SECRET', 'MAIL_HOST', 'MAIL_PORT', 'MAIL_USER', 'MAIL_PASS'] as const;
const missingVars = requiredVars.filter((key) => !env[key]);

if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

export default env;
