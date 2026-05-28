// src/routes/health.routes.ts
import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { getRedisClient } from '../config/redis';
import { getAssessmentQueue } from '../config/queue';
import { wsManager } from '../config/websocket';

const router = Router();

/**
 * GET /health
 * System health check
 */
router.get('/', async (_req: Request, res: Response) => {
  const checks = {
    server: 'ok',
    mongodb: 'unknown' as string,
    redis: 'unknown' as string,
    queue: 'unknown' as string,
    websocket: `${wsManager.connectedClients} clients`,
  };

  try {
    checks.mongodb = mongoose.connection.readyState === 1 ? 'ok' : 'disconnected';
  } catch {
    checks.mongodb = 'error';
  }

  try {
    const redis = getRedisClient();
    await redis.ping();
    checks.redis = 'ok';
  } catch {
    checks.redis = 'error';
  }

  try {
    const queue = getAssessmentQueue();
    const counts = await queue.getJobCounts();
    checks.queue = `ok (active:${counts.active}, waiting:${counts.waiting}, completed:${counts.completed})`;
  } catch {
    checks.queue = 'error';
  }

  const allOk = checks.mongodb === 'ok' && checks.redis === 'ok';
  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  });
});

/**
 * GET /health/queue
 * Queue statistics
 */
router.get('/queue', async (_req: Request, res: Response) => {
  try {
    const queue = getAssessmentQueue();
    const [counts, workers] = await Promise.all([
      queue.getJobCounts(),
      queue.getWorkers(),
    ]);
    res.json({ success: true, data: { counts, workers: workers.length } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Queue stats unavailable' });
  }
});

export default router;
