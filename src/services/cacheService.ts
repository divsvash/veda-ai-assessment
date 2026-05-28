// src/services/cacheService.ts
import { getRedisClient } from '../config/redis';
import { AssignmentOutput, JobStatus } from '../types';

const CACHE_TTL = 60 * 60 * 24; // 24 hours
const JOB_STATE_TTL = 60 * 60 * 2; // 2 hours

export class CacheService {
  private redis = getRedisClient();

  // ─── Assignment Output ───────────────────────────────────────────────────────

  async setAssignmentOutput(assignmentId: string, output: AssignmentOutput): Promise<void> {
    const key = `assignment:output:${assignmentId}`;
    await this.redis.setex(key, CACHE_TTL, JSON.stringify(output));
  }

  async getAssignmentOutput(assignmentId: string): Promise<AssignmentOutput | null> {
    const key = `assignment:output:${assignmentId}`;
    const cached = await this.redis.get(key);
    if (!cached) return null;
    try {
      return JSON.parse(cached) as AssignmentOutput;
    } catch {
      return null;
    }
  }

  async invalidateAssignmentOutput(assignmentId: string): Promise<void> {
    await this.redis.del(`assignment:output:${assignmentId}`);
  }

  // ─── Job State ───────────────────────────────────────────────────────────────

  async setJobState(
    jobId: string,
    state: { status: JobStatus; progress: number; message: string }
  ): Promise<void> {
    const key = `job:state:${jobId}`;
    await this.redis.setex(key, JOB_STATE_TTL, JSON.stringify({ ...state, updatedAt: Date.now() }));
  }

  async getJobState(jobId: string): Promise<{
    status: JobStatus;
    progress: number;
    message: string;
    updatedAt: number;
  } | null> {
    const key = `job:state:${jobId}`;
    const cached = await this.redis.get(key);
    if (!cached) return null;
    try {
      return JSON.parse(cached);
    } catch {
      return null;
    }
  }

  // ─── Assignment List Cache ────────────────────────────────────────────────────

  async invalidateAssignmentList(): Promise<void> {
    const keys = await this.redis.keys('assignments:list:*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  async setAssignmentList(cacheKey: string, data: unknown): Promise<void> {
    const key = `assignments:list:${cacheKey}`;
    await this.redis.setex(key, 60 * 5, JSON.stringify(data)); // 5 min cache
  }

  async getAssignmentList(cacheKey: string): Promise<unknown | null> {
    const key = `assignments:list:${cacheKey}`;
    const cached = await this.redis.get(key);
    if (!cached) return null;
    try {
      return JSON.parse(cached);
    } catch {
      return null;
    }
  }

  // ─── Rate Limiting ────────────────────────────────────────────────────────────

  async checkRateLimit(identifier: string, maxRequests: number, windowSecs: number): Promise<boolean> {
    const key = `rate:${identifier}`;
    const current = await this.redis.incr(key);
    if (current === 1) {
      await this.redis.expire(key, windowSecs);
    }
    return current <= maxRequests;
  }
}

export const cacheService = new CacheService();
