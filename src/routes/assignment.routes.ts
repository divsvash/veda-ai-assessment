// src/routes/assignment.routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import {
  createAssignment,
  getAssignments,
  getAssignment,
  getAssignmentOutput,
  getJobStatus,
  deleteAssignment,
  regenerateSectionHandler,
} from '../controllers/assignment.controller';
import {
  validateCreateAssignment,
  validateAssignmentId,
  validateRegenerateSection,
} from '../middleware/validation';
import { uploadMiddleware } from '../middleware/upload';

const router = Router();

/**
 * POST /api/assignments
 * Create a new assignment and queue AI generation
 * Accepts multipart/form-data (optional file upload)
 */
router.post(
  '/',
  (req: Request, res: Response, next: NextFunction) => {
    uploadMiddleware(req, res, (err) => {
      if (err) return next(err);
      next();
    });
  },
  validateCreateAssignment,
  createAssignment
);

/**
 * GET /api/assignments
 * List all assignments with pagination
 */
router.get('/', getAssignments);

/**
 * GET /api/assignments/:id
 * Get a specific assignment
 */
router.get('/:id', validateAssignmentId, getAssignment);

/**
 * GET /api/assignments/:id/output
 * Get the generated question paper output
 */
router.get('/:id/output', validateAssignmentId, getAssignmentOutput);

/**
 * GET /api/assignments/:id/status
 * Get real-time job status and progress
 */
router.get('/:id/status', validateAssignmentId, getJobStatus);

/**
 * DELETE /api/assignments/:id
 * Delete assignment and its output
 */
router.delete('/:id', validateAssignmentId, deleteAssignment);

/**
 * POST /api/assignments/:id/regenerate-section
 * Regenerate a specific section of the question paper
 */
router.post(
  '/:id/regenerate-section',
  validateRegenerateSection,
  regenerateSectionHandler
);

export default router;
