// src/config/queue.ts
import { Queue, QueueEvents } from 'bullmq';
import { getRedisClient } from './redis';

export const ASSESSMENT_QUEUE = 'assessment-generation';

let assessmentQueue: Queue | null = null;
let queueEvents: QueueEvents | null = null;

export function getAssessmentQueue(): Queue {
  if (assessmentQueue) return assessmentQueue;

  const connection = getRedisClient() as any;

  assessmentQueue = new Queue(ASSESSMENT_QUEUE, {
    connection,
    defaultJobOptions: {
      attempts: parseInt(process.env.JOB_ATTEMPTS || '3'),
      backoff: {
        type: 'exponential',
        delay: parseInt(process.env.JOB_BACKOFF_DELAY || '5000'),
      },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  });

  console.log(`✅ BullMQ Queue "${ASSESSMENT_QUEUE}" initialized`);
  return assessmentQueue;
}

export function getQueueEvents(): QueueEvents {
  if (queueEvents) return queueEvents;

  const connection = getRedisClient() as any;

  queueEvents = new QueueEvents(ASSESSMENT_QUEUE, {
    connection,
  });

  return queueEvents;
}
