// src/middleware/validation.ts
import { Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';

export function handleValidationErrors(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.type, message: e.msg })),
    });
    return;
  }
  next();
}

export const validateCreateAssignment = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ max: 200 }).withMessage('Title must be under 200 characters'),

  body('subject')
    .trim()
    .notEmpty().withMessage('Subject is required'),

  body('grade')
    .trim()
    .notEmpty().withMessage('Grade is required'),

  body('schoolName')
    .trim()
    .notEmpty().withMessage('School name is required'),

  body('questionTypes')
    .isArray({ min: 1 }).withMessage('At least one question type is required'),

  body('questionTypes.*.type')
    .isIn(['multiple_choice', 'short_answer', 'long_answer', 'diagram_based', 'numerical', 'true_false'])
    .withMessage('Invalid question type'),

  body('questionTypes.*.numberOfQuestions')
    .isInt({ min: 1, max: 50 }).withMessage('Number of questions must be between 1 and 50'),

  body('questionTypes.*.marksPerQuestion')
    .isInt({ min: 1, max: 20 }).withMessage('Marks per question must be between 1 and 20'),

  body('timeAllowed')
    .optional()
    .isInt({ min: 5, max: 300 }).withMessage('Time allowed must be between 5 and 300 minutes'),

  body('dueDate')
    .optional()
    .isISO8601().withMessage('Due date must be a valid date'),

  handleValidationErrors,
];

export const validateAssignmentId = [
  param('id')
    .isMongoId().withMessage('Invalid assignment ID'),
  handleValidationErrors,
];

export const validateRegenerateSection = [
  param('id')
    .isMongoId().withMessage('Invalid assignment ID'),
  body('sectionIndex')
    .isInt({ min: 0, max: 25 }).withMessage('Section index must be a non-negative integer'),
  handleValidationErrors,
];
