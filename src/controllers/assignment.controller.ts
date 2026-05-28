// src/controllers/assignment.controller.ts
import { Request, Response, NextFunction } from 'express';
import { Assignment } from '../models/Assignment';
import { AssignmentOutputModel } from '../models/AssignmentOutput';
import { getAssessmentQueue } from '../config/queue';
import { regenerateSection } from '../services/aiService';
import { cacheService } from '../services/cacheService';
import { wsManager } from '../config/websocket';
import { extractFileContent } from '../utils/fileExtractor';
import { successResponse, createdResponse } from '../utils/response';
import { AppError } from '../middleware/errorHandler';
import { CreateAssignmentDTO, JobProgressUpdate } from '../types';

// ─── Create Assignment ────────────────────────────────────────────────────────

export async function createAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      title, subject, grade, schoolName,
      dueDate, timeAllowed, questionTypes,
      additionalInstructions,
    } = req.body;

    const dto: CreateAssignmentDTO = {
      title,
      subject,
      grade,
      schoolName,
      dueDate,
      timeAllowed: timeAllowed ? parseInt(timeAllowed) : undefined,
      questionTypes,
      additionalInstructions,
    };

    // Extract file content if uploaded
    if (req.file) {
      try {
        dto.fileContent = await extractFileContent(req.file.path, req.file.mimetype);
        console.log(`📄 Extracted ${dto.fileContent.length} chars from ${req.file.originalname}`);
      } catch (err) {
        console.warn('File extraction failed:', err);
        // Non-fatal: continue without file content
      }
    }

    // Create assignment record in MongoDB
    const assignment = await Assignment.create({
      title: dto.title,
      subject: dto.subject,
      grade: dto.grade,
      schoolName: dto.schoolName,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      timeAllowed: dto.timeAllowed,
      questionTypes: dto.questionTypes,
      additionalInstructions: dto.additionalInstructions,
      fileContent: dto.fileContent,
      originalFileName: req.file?.originalname,
      status: 'queued',
    });

    const assignmentId = assignment._id.toString();

    // Enqueue generation job
    const queue = getAssessmentQueue();
    const job = await queue.add(
      'generate-assessment',
      { assignmentId, dto },
      {
        jobId: `assessment-${assignmentId}`,
        priority: 1,
      }
    );

    // Update assignment with job ID
    await Assignment.findByIdAndUpdate(assignmentId, { jobId: job.id });

    // Invalidate list cache
    await cacheService.invalidateAssignmentList();

    console.log(`✅ Assignment created: ${assignmentId}, Job: ${job.id}`);

    createdResponse(res, {
      assignment: {
        id: assignmentId,
        title: assignment.title,
        subject: assignment.subject,
        grade: assignment.grade,
        status: assignment.status,
        jobId: job.id,
      },
    }, 'Assignment created and queued for AI generation');
  } catch (err) {
    next(err);
  }
}

// ─── Get All Assignments ──────────────────────────────────────────────────────

export async function getAssignments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 10);
    const skip = (page - 1) * limit;

    const cacheKey = `page:${page}:limit:${limit}`;
    const cached = await cacheService.getAssignmentList(cacheKey);
    if (cached) {
      successResponse(res, cached, 'Assignments fetched (cached)');
      return;
    }

    const [assignments, total] = await Promise.all([
      Assignment.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-fileContent -__v'),
      Assignment.countDocuments(),
    ]);

    const result = {
      assignments: assignments.map((a) => ({
        id: a._id,
        title: a.title,
        subject: a.subject,
        grade: a.grade,
        schoolName: a.schoolName,
        status: a.status,
        dueDate: a.dueDate,
        createdAt: a.createdAt,
        hasOutput: !!a.outputId,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };

    await cacheService.setAssignmentList(cacheKey, result);
    successResponse(res, result);
  } catch (err) {
    next(err);
  }
}

// ─── Get Assignment by ID ─────────────────────────────────────────────────────

export async function getAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const assignment = await Assignment.findById(req.params.id).select('-fileContent -__v');
    if (!assignment) throw new AppError(404, 'Assignment not found');

    successResponse(res, { assignment });
  } catch (err) {
    next(err);
  }
}

// ─── Get Assignment Output ────────────────────────────────────────────────────

export async function getAssignmentOutput(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    // Check cache first
    const cached = await cacheService.getAssignmentOutput(id);
    if (cached) {
      successResponse(res, { output: cached, cached: true });
      return;
    }

    const outputDoc = await AssignmentOutputModel.findOne({ assignmentId: id });
    if (!outputDoc) {
      const assignment = await Assignment.findById(id).select('status');
      if (!assignment) throw new AppError(404, 'Assignment not found');

      res.status(404).json({
        success: false,
        message: 'Output not yet available',
        status: assignment.status,
      });
      return;
    }

    // Cache the result
    await cacheService.setAssignmentOutput(id, outputDoc.output);

    successResponse(res, {
      output: outputDoc.output,
      meta: {
        generationTimeMs: outputDoc.generationTimeMs,
        tokenUsage: outputDoc.tokenUsage,
        createdAt: outputDoc.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Get Job Status ───────────────────────────────────────────────────────────

export async function getJobStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const assignment = await Assignment.findById(id).select('status jobId');
    if (!assignment) throw new AppError(404, 'Assignment not found');

    let jobState = null;
    if (assignment.jobId) {
      jobState = await cacheService.getJobState(assignment.jobId);
    }

    successResponse(res, {
      assignmentId: id,
      status: assignment.status,
      jobId: assignment.jobId,
      progress: jobState?.progress ?? 0,
      message: jobState?.message ?? assignment.status,
      updatedAt: jobState?.updatedAt,
    });
  } catch (err) {
    next(err);
  }
}

// ─── Delete Assignment ────────────────────────────────────────────────────────

export async function deleteAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const assignment = await Assignment.findByIdAndDelete(id);
    if (!assignment) throw new AppError(404, 'Assignment not found');

    // Clean up output
    await AssignmentOutputModel.deleteOne({ assignmentId: id });
    await cacheService.invalidateAssignmentOutput(id);
    await cacheService.invalidateAssignmentList();

    successResponse(res, { id }, 'Assignment deleted');
  } catch (err) {
    next(err);
  }
}

// ─── Regenerate Section ───────────────────────────────────────────────────────

export async function regenerateSectionHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { sectionIndex } = req.body;

    const assignment = await Assignment.findById(id);
    if (!assignment) throw new AppError(404, 'Assignment not found');
    if (assignment.status !== 'completed') throw new AppError(400, 'Assignment must be completed before regenerating sections');

    const outputDoc = await AssignmentOutputModel.findOne({ assignmentId: id });
    if (!outputDoc) throw new AppError(404, 'Output not found');

    const dto: CreateAssignmentDTO = {
      title: assignment.title,
      subject: assignment.subject,
      grade: assignment.grade,
      schoolName: assignment.schoolName,
      timeAllowed: assignment.timeAllowed,
      questionTypes: assignment.questionTypes,
      additionalInstructions: assignment.additionalInstructions,
      fileContent: assignment.fileContent,
    };

    // Notify frontend of regeneration start
    const startUpdate: JobProgressUpdate = {
      jobId: `regen-${id}-section-${sectionIndex}`,
      assignmentId: id,
      status: 'generating',
      progress: 30,
      message: `Regenerating Section ${String.fromCharCode(65 + sectionIndex)}...`,
    };
    wsManager.broadcastJobProgress(startUpdate);

    // Generate new section
    const newSection = await regenerateSection(dto, sectionIndex, outputDoc.output.sections);

    // Update the section in MongoDB
    const sections = [...outputDoc.output.sections];
    sections[sectionIndex] = newSection;
    const updatedOutput = {
      ...outputDoc.output,
      sections,
      maximumMarks: sections.reduce((sum, s) => sum + s.totalMarks, 0),
    };

    await AssignmentOutputModel.findByIdAndUpdate(outputDoc._id, {
      'output.sections': sections,
      'output.maximumMarks': updatedOutput.maximumMarks,
    });

    // Update cache
    await cacheService.setAssignmentOutput(id, updatedOutput);

    // Notify frontend of completion
    wsManager.broadcastJobProgress({
      jobId: `regen-${id}-section-${sectionIndex}`,
      assignmentId: id,
      status: 'completed',
      progress: 100,
      message: `Section ${String.fromCharCode(65 + sectionIndex)} regenerated!`,
      result: updatedOutput,
    });

    successResponse(res, { section: newSection, fullOutput: updatedOutput }, 'Section regenerated');
  } catch (err) {
    next(err);
  }
}
