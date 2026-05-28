// src/workers/assessment.worker.ts
import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { ASSESSMENT_QUEUE } from '../config/queue';
import { getRedisClient } from '../config/redis';
import { connectDatabase } from '../config/database';
import { wsManager } from '../config/websocket';
import { generateAssessment } from '../services/aiService';
import { cacheService } from '../services/cacheService';
import { Assignment } from '../models/Assignment';
import { AssignmentOutputModel } from '../models/AssignmentOutput';
import { CreateAssignmentDTO, JobProgressUpdate, JobStatus } from '../types';

export interface AssessmentJobData {
  assignmentId: string;
  dto: CreateAssignmentDTO;
}

// Staged progress simulation for premium UX
const STAGES: Array<{ status: JobStatus; progress: number; message: string; delayMs: number }> = [
  { status: 'analyzing', progress: 10, message: 'Analyzing syllabus and requirements...', delayMs: 1500 },
  { status: 'generating', progress: 35, message: 'Generating question sections...', delayMs: 0 }, // AI call here
  { status: 'balancing', progress: 75, message: 'Balancing difficulty distribution...', delayMs: 1200 },
  { status: 'creating_answer_key', progress: 90, message: 'Creating answer key...', delayMs: 1000 },
  { status: 'completed', progress: 100, message: 'Assessment ready!', delayMs: 0 },
];

async function broadcastProgress(
  assignmentId: string,
  jobId: string,
  status: JobStatus,
  progress: number,
  message: string,
  result?: AssessmentJobData['dto']
): Promise<void> {
  const update: JobProgressUpdate = {
    jobId,
    assignmentId,
    status,
    progress,
    message,
  };

  // Update Redis job state
  await cacheService.setJobState(jobId, { status, progress, message });

  // Update MongoDB assignment status
  await Assignment.findByIdAndUpdate(assignmentId, { status });

  // Broadcast via WebSocket
  wsManager.broadcastJobProgress(update);

  console.log(`📊 [${assignmentId}] ${status} (${progress}%) - ${message}`);
}

async function processAssessmentJob(job: Job<AssessmentJobData>): Promise<void> {
  const { assignmentId, dto } = job.data;
  const jobId = job.id || 'unknown';

  console.log(`\n🚀 Processing job ${jobId} for assignment ${assignmentId}`);

  try {
    // Stage 1: Analyzing
    await broadcastProgress(assignmentId, jobId, 'analyzing', 10, 'Analyzing syllabus and requirements...');
    await sleep(STAGES[0].delayMs);

    // Stage 2: Generating (actual AI call)
    await broadcastProgress(assignmentId, jobId, 'generating', 30, 'Generating question sections...');

    const result = await generateAssessment(dto);

    await broadcastProgress(assignmentId, jobId, 'generating', 60, 'Questions generated, parsing response...');

    // Stage 3: Balancing
    await broadcastProgress(assignmentId, jobId, 'balancing', 75, 'Balancing difficulty distribution...');
    await sleep(STAGES[2].delayMs);

    // Stage 4: Answer Key
    await broadcastProgress(assignmentId, jobId, 'creating_answer_key', 90, 'Creating comprehensive answer key...');
    await sleep(STAGES[3].delayMs);

    // Save output to MongoDB
    const outputDoc = await AssignmentOutputModel.create({
      assignmentId,
      output: result.output,
      rawPrompt: result.rawPrompt,
      rawResponse: result.rawResponse,
      generationTimeMs: result.generationTimeMs,
      tokenUsage: result.tokenUsage,
    });

    // Update assignment with output reference
    await Assignment.findByIdAndUpdate(assignmentId, {
      status: 'completed',
      outputId: outputDoc._id,
    });

    // Cache the output
    await cacheService.setAssignmentOutput(assignmentId, result.output);

    // Invalidate list cache
    await cacheService.invalidateAssignmentList();

    // Stage 5: Completed
    const finalUpdate: JobProgressUpdate = {
      jobId,
      assignmentId,
      status: 'completed',
      progress: 100,
      message: 'Assessment generated successfully!',
      result: result.output,
    };

    await cacheService.setJobState(jobId, { status: 'completed', progress: 100, message: 'Completed' });
    wsManager.broadcastJobProgress(finalUpdate);

    console.log(`✅ Job ${jobId} completed successfully`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Job ${jobId} failed:`, errorMessage);

    await Assignment.findByIdAndUpdate(assignmentId, { status: 'failed' });
    await cacheService.setJobState(jobId, { status: 'failed', progress: 0, message: errorMessage });

    wsManager.broadcastJobProgress({
      jobId,
      assignmentId,
      status: 'failed',
      progress: 0,
      message: `Generation failed: ${errorMessage}`,
      error: errorMessage,
    });

    throw error; // BullMQ will handle retry
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Worker Initialization ────────────────────────────────────────────────────

async function startWorker(): Promise<void> {
  // Connect to services
  await connectDatabase();

  const connection = getRedisClient();
  await connection.connect();

  const worker = new Worker<AssessmentJobData>(
    ASSESSMENT_QUEUE,
    processAssessmentJob,
    {
      connection,
      concurrency: 3, // Process 3 jobs concurrently
      limiter: {
        max: 10,
        duration: 60_000, // Max 10 jobs per minute (API rate limiting)
      },
    }
  );

  worker.on('active', (job) => {
    console.log(`▶️  Job ${job.id} started`);
  });

  worker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
  });

  worker.on('error', (err) => {
    console.error('Worker error:', err);
  });

  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing worker...');
    await worker.close();
    process.exit(0);
  });

  console.log(`\n🏭 Assessment Worker started`);
  console.log(`   Queue: ${ASSESSMENT_QUEUE}`);
  console.log(`   Concurrency: 3\n`);
}

// If run directly as worker process
if (require.main === module) {
  startWorker().catch((err) => {
    console.error('Worker startup failed:', err);
    process.exit(1);
  });
}

export { processAssessmentJob };
