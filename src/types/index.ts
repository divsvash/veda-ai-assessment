// src/types/index.ts

export type Difficulty = 'easy' | 'moderate' | 'hard';
export type QuestionType =
  | 'multiple_choice'
  | 'short_answer'
  | 'long_answer'
  | 'diagram_based'
  | 'numerical'
  | 'true_false';

export type JobStatus =
  | 'queued'
  | 'analyzing'
  | 'generating'
  | 'balancing'
  | 'creating_answer_key'
  | 'completed'
  | 'failed';

export interface QuestionTypeConfig {
  type: QuestionType;
  label: string;
  numberOfQuestions: number;
  marksPerQuestion: number;
}

export interface CreateAssignmentDTO {
  title: string;
  subject: string;
  grade: string;
  schoolName: string;
  dueDate?: string;
  timeAllowed?: number; // in minutes
  questionTypes: QuestionTypeConfig[];
  additionalInstructions?: string;
  fileContent?: string; // extracted text from uploaded PDF/image
}

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  difficulty: Difficulty;
  marks: number;
  options?: string[]; // for MCQ
  answer?: string;
  hint?: string;
}

export interface Section {
  id: string;
  title: string; // "Section A", "Section B", etc.
  instruction: string; // "Attempt all questions"
  questionType: QuestionType;
  questions: Question[];
  totalMarks: number;
}

export interface AssignmentOutput {
  schoolName: string;
  subject: string;
  grade: string;
  timeAllowed: number;
  maximumMarks: number;
  sections: Section[];
  generalInstructions: string[];
}

export interface JobProgressUpdate {
  jobId: string;
  assignmentId: string;
  status: JobStatus;
  progress: number; // 0-100
  message: string;
  result?: AssignmentOutput;
  error?: string;
}

export interface WSMessage {
  type: 'progress' | 'completed' | 'error' | 'ping';
  data: JobProgressUpdate | { message: string };
}
