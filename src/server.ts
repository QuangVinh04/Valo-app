import 'dotenv/config';
import http, { type Server as HttpServer } from 'http';
import { promisify } from 'util';

import app from './app.js';
import env from './config/env.js';
import { connectDB } from './database/db.js';
import { runDatabaseSeeders } from './database/seeder/index.js';
import { connectRedis, getRedisClient } from './config/redis.js';
import { PrismaService } from './config/prisma.js';
import logger from './utils/logger.util.js';

const SHUTDOWN_TIMEOUT_MS = 10_000;

class Server {
  private readonly port: number;
  private readonly prismaService: PrismaService;
  private readonly httpServer: HttpServer;
  private isShuttingDown = false;

  constructor(port: number) {
    this.port = port;
    this.prismaService = PrismaService.getInstance();
    this.httpServer = http.createServer(app);
  }

  public async start(): Promise<void> {
    this.registerProcessHandlers();
    this.registerServerErrorHandler();

    await connectDB();
    await connectRedis(env.REDIS_URL);
    await runDatabaseSeeders(this.prismaService.client);

    this.httpServer.listen(this.port, () => {
      logger.info(`Server running at http://localhost:${this.port}`);
    });
  }

  private registerServerErrorHandler(): void {
    this.httpServer.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${this.port} is already in use`);
      } else {
        logger.error('HTTP server error', { message: error.message, stack: error.stack });
      }
      process.exit(1);
    });
  }

  private registerProcessHandlers(): void {
    process.on('SIGTERM', () => void this.shutdown('SIGTERM'));
    process.on('SIGINT', () => void this.shutdown('SIGINT'));

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { message: error.message, stack: error.stack });
      void this.shutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled rejection', { reason: String(reason) });
      void this.shutdown('UNHANDLED_REJECTION');
    });
  }

  private async shutdown(signal: string): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    logger.info(`${signal} received. Starting graceful shutdown`);

    const forceShutdownTimer = setTimeout(() => {
      logger.error('Forced shutdown due to timeout');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);

    try {
      const closeServer = promisify(this.httpServer.close.bind(this.httpServer));
      await closeServer();
      logger.info('HTTP server closed');

      const redisClient = getRedisClient();
      if (redisClient?.isOpen) {
        await redisClient.quit();
        logger.info('Redis disconnected');
      }

      await this.prismaService.disconnect();
      logger.info('Prisma disconnected');

      clearTimeout(forceShutdownTimer);
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error: any) {
      clearTimeout(forceShutdownTimer);
      logger.error('Graceful shutdown failed', {
        message: error?.message,
        stack: error?.stack
      });
      process.exit(1);
    }
  }
}

const port = Number(env.PORT) || 4000;
const server = new Server(port);

server.start().catch((error: any) => {
  logger.error('Failed to start server', {
    message: error?.message,
    stack: error?.stack
  });
  process.exit(1);
});
