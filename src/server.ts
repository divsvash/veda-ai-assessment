// src/server.ts
import 'dotenv/config';
import http from 'http';
import { createApp } from './app';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { getAssessmentQueue } from './config/queue';
import { wsManager } from './config/websocket';
import { processAssessmentJob } from './workers/assessment.worker';
import { Worker } from 'bullmq';
import { getRedisClient } from './config/redis';
import { ASSESSMENT_QUEUE } from './config/queue';

const PORT = parseInt(process.env.PORT || '4000');

async function bootstrap(): Promise<void> {
  console.log('\n🚀 Starting VedaAI Assessment Creator Server...\n');

  // ─── Connect Services ─────────────────────────────────────────────────────────
  await connectDatabase();
  await connectRedis();

  // ─── Initialize Queue ─────────────────────────────────────────────────────────
  getAssessmentQueue();

  // ─── Start Embedded Worker (for single-process dev/small deployments) ─────────
  // In production, run `npm run worker` in a separate process
  const workerConnection = getRedisClient();
  const worker = new Worker(ASSESSMENT_QUEUE, processAssessmentJob, {
    connection: workerConnection as any,
    concurrency: 3,
  });

  worker.on('completed', (job) => {
    console.log(`✅ Worker: Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ Worker: Job ${job?.id} failed:`, err.message);
  });

  console.log('✅ Embedded BullMQ Worker started (concurrency: 3)');

  // ─── HTTP Server ──────────────────────────────────────────────────────────────
  const app = createApp();
  const server = http.createServer(app);

  // ─── WebSocket Server ─────────────────────────────────────────────────────────
  wsManager.initialize(server);

  // ─── Start Listening ──────────────────────────────────────────────────────────
  server.listen(PORT, () => {
    console.log(`\n✅ Server running on http://localhost:${PORT}`);
    console.log(`✅ WebSocket on ws://localhost:${PORT}/ws`);
    console.log(`\n📋 API Endpoints:`);
    console.log(`   POST   /api/assignments              → Create & queue`);
    console.log(`   GET    /api/assignments              → List all`);
    console.log(`   GET    /api/assignments/:id          → Get assignment`);
    console.log(`   GET    /api/assignments/:id/output   → Get generated paper`);
    console.log(`   GET    /api/assignments/:id/status   → Job progress`);
    console.log(`   POST   /api/assignments/:id/regenerate-section`);
    console.log(`   DELETE /api/assignments/:id`);
    console.log(`   GET    /health                       → Health check\n`);
  });

  // ─── Graceful Shutdown ────────────────────────────────────────────────────────
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n${signal} received. Graceful shutdown...`);
    await worker.close();
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
  });

  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
