// src/services/responseParser.ts
import { AssignmentOutput, Section, Question, QuestionType, Difficulty } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class ParseError extends Error {
  constructor(
    message: string,
    public readonly rawResponse: string
  ) {
    super(message);
    this.name = 'ParseError';
  }
}

/**
 * Extracts JSON from LLM response that may contain markdown, preamble, etc.
 */
function extractJSON(raw: string): string {
  // Try direct parse first
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) return trimmed;

  // Strip markdown code fences
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch?.[1]) return fenceMatch[1].trim();

  // Find first { ... } block
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  throw new ParseError('No JSON object found in response', raw);
}

function validateDifficulty(val: unknown): Difficulty {
  if (val === 'easy' || val === 'moderate' || val === 'hard') return val;
  // Normalize common variants
  const str = String(val).toLowerCase();
  if (str.includes('easy')) return 'easy';
  if (str.includes('hard') || str.includes('challeng')) return 'hard';
  return 'moderate';
}

function validateQuestionType(val: unknown): QuestionType {
  const valid: QuestionType[] = [
    'multiple_choice', 'short_answer', 'long_answer',
    'diagram_based', 'numerical', 'true_false',
  ];
  if (valid.includes(val as QuestionType)) return val as QuestionType;
  return 'short_answer';
}

function parseQuestion(raw: Record<string, unknown>, idx: number): Question {
  const id = (typeof raw.id === 'string' && raw.id) ? raw.id : `q_${uuidv4().slice(0, 8)}`;
  const text = typeof raw.text === 'string' ? raw.text.trim() : `Question ${idx + 1}`;
  const type = validateQuestionType(raw.type);
  const difficulty = validateDifficulty(raw.difficulty);
  const marks = typeof raw.marks === 'number' && raw.marks > 0 ? raw.marks : 1;

  const question: Question = { id, text, type, difficulty, marks };

  if (Array.isArray(raw.options) && raw.options.length >= 2) {
    question.options = raw.options.map((o: unknown) => String(o));
  }
  if (typeof raw.answer === 'string' && raw.answer) {
    question.answer = raw.answer.trim();
  }
  if (typeof raw.hint === 'string' && raw.hint) {
    question.hint = raw.hint.trim();
  }

  return question;
}

function parseSection(raw: Record<string, unknown>, idx: number): Section {
  const sectionLabel = String.fromCharCode(65 + idx);
  const id = (typeof raw.id === 'string' && raw.id) ? raw.id : `section_${sectionLabel.toLowerCase()}`;
  const title = (typeof raw.title === 'string' && raw.title) ? raw.title : `Section ${sectionLabel}`;
  const instruction = (typeof raw.instruction === 'string' && raw.instruction)
    ? raw.instruction
    : 'Attempt all questions.';
  const questionType = validateQuestionType(raw.questionType);

  const rawQuestions = Array.isArray(raw.questions) ? raw.questions : [];
  const questions = rawQuestions.map((q: unknown, qIdx: number) =>
    parseQuestion(q as Record<string, unknown>, qIdx)
  );

  const totalMarks = typeof raw.totalMarks === 'number'
    ? raw.totalMarks
    : questions.reduce((sum, q) => sum + q.marks, 0);

  return { id, title, instruction, questionType, questions, totalMarks };
}

/**
 * Main parser: takes raw LLM response string → structured AssignmentOutput
 * Throws ParseError if fundamentally unrecoverable.
 */
export function parseAssessmentResponse(raw: string): AssignmentOutput {
  let jsonStr: string;
  try {
    jsonStr = extractJSON(raw);
  } catch (e) {
    throw new ParseError('Failed to extract JSON from response', raw);
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    // Attempt to fix common JSON issues: trailing commas
    const fixed = jsonStr
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']');
    try {
      parsed = JSON.parse(fixed);
    } catch {
      throw new ParseError('Invalid JSON in response', raw);
    }
  }

  const sections = Array.isArray(parsed.sections)
    ? parsed.sections.map((s: unknown, i: number) => parseSection(s as Record<string, unknown>, i))
    : [];

  if (sections.length === 0) {
    throw new ParseError('No sections found in parsed response', raw);
  }

  const generalInstructions: string[] = Array.isArray(parsed.generalInstructions)
    ? parsed.generalInstructions.map((s: unknown) => String(s))
    : [
        'All questions are compulsory unless stated otherwise.',
        'Write clearly and legibly.',
        'Answers should be written in the answer booklet.',
      ];

  return {
    schoolName: typeof parsed.schoolName === 'string' ? parsed.schoolName : 'School',
    subject: typeof parsed.subject === 'string' ? parsed.subject : 'Subject',
    grade: typeof parsed.grade === 'string' ? parsed.grade : 'Grade',
    timeAllowed: typeof parsed.timeAllowed === 'number' ? parsed.timeAllowed : 45,
    maximumMarks: typeof parsed.maximumMarks === 'number'
      ? parsed.maximumMarks
      : sections.reduce((sum, s) => sum + s.totalMarks, 0),
    sections,
    generalInstructions,
  };
}

/**
 * Parses a single regenerated section
 */
export function parseSectionResponse(raw: string): Section {
  let jsonStr: string;
  try {
    jsonStr = extractJSON(raw);
  } catch {
    throw new ParseError('Failed to extract section JSON', raw);
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new ParseError('Invalid section JSON', raw);
  }

  return parseSection(parsed, 0);
}
