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
  id: string;
  type: QuestionType;
  label: string;
  numberOfQuestions: number;
  marksPerQuestion: number;
}

export interface Assignment {
  id: string;
  title: string;
  subject: string;
  grade: string;
  schoolName: string;
  dueDate?: string;
  timeAllowed?: number;
  status: JobStatus;
  jobId?: string;
  hasOutput?: boolean;
  createdAt: string;
}

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  difficulty: Difficulty;
  marks: number;
  options?: string[];
  answer?: string;
  hint?: string;
}

export interface Section {
  id: string;
  title: string;
  instruction: string;
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
  progress: number;
  message: string;
  result?: AssignmentOutput;
  error?: string;
}

export interface WSMessage {
  type: 'progress' | 'completed' | 'error' | 'ping';
  data: JobProgressUpdate | { message: string };
}

export const QUESTION_TYPE_OPTIONS: { value: QuestionType; label: string }[] = [
  { value: 'multiple_choice', label: 'Multiple Choice Questions' },
  { value: 'short_answer', label: 'Short Answer Questions' },
  { value: 'long_answer', label: 'Long Answer Questions' },
  { value: 'diagram_based', label: 'Diagram/Graph-Based Questions' },
  { value: 'numerical', label: 'Numerical Problems' },
  { value: 'true_false', label: 'True/False Questions' },
];
