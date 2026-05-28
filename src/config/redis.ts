// src/config/redis.ts
import IORedis from 'ioredis';

let redisClient: IORedis | null = null;

export function getRedisClient(): IORedis {
  if (redisClient) return redisClient;

  redisClient = new IORedis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,

    maxRetriesPerRequest: null, // Required for BullMQ

    // Required for BullMQ
    enableReadyCheck: false,
    lazyConnect: true,
  });

  redisClient.on('connect', () => console.log('✅ Redis connected'));
  redisClient.on('error', (err) => console.error('❌ Redis error:', err));
  redisClient.on('reconnecting', () =>
    console.warn('⚠️  Redis reconnecting...')
  );

  return redisClient;
}

export async function connectRedis(): Promise<void> {
  const client = getRedisClient();

  if (client) {
    await client.connect();
  }
}

export default getRedisClient;