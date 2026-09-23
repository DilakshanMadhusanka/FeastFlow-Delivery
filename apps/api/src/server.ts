import http from 'http';
import { createApp } from './app';
import { initSocketServer } from './sockets';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { getRedisClient } from './config/redis';

async function bootstrap(): Promise<void> {
  // 1. Connect to PostgreSQL via Prisma
  await connectDatabase();

  // 2. Initialize Redis client (non-blocking lazy connect)
  const redis = getRedisClient();
  redis.ping().catch(() => {
    // Handled in redis.ts
  });

  // 3. Initialize Express App & HTTP Server
  const app = createApp();
  const httpServer = http.createServer(app);

  // 4. Initialize Socket.IO Server
  const io = initSocketServer(httpServer);

  // 5. Start Listening
  httpServer.listen(env.PORT, () => {
    console.log(`🚀 FeastFlow API Server running on port ${env.PORT} in [${env.NODE_ENV}] mode`);
    console.log(`📡 Healthcheck available at: http://localhost:${env.PORT}/health`);
    console.log(`📘 API Base Route at: http://localhost:${env.PORT}/api/v1`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
    httpServer.close(async () => {
      console.log('HTTP Server closed.');
      io.close(() => console.log('Socket.IO connections closed.'));
      await disconnectDatabase();
      process.exit(0);
    });

    setTimeout(() => {
      console.error('⚠️ Forcefully shutting down after timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('❌ Application bootstrap failed:', err);
  process.exit(1);
});
