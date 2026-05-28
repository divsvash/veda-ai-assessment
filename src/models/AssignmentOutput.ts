// src/models/AssignmentOutput.ts
import mongoose, { Document, Schema } from 'mongoose';
import { AssignmentOutput, Section, Question } from '../types';

export interface IAssignmentOutput extends Document {
  _id: mongoose.Types.ObjectId;
  assignmentId: mongoose.Types.ObjectId;
  output: AssignmentOutput;
  rawPrompt: string;
  rawResponse: string;
  generationTimeMs: number;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
  };
  createdAt: Date;
}

const QuestionSchema = new Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  type: { type: String, required: true },
  difficulty: { type: String, enum: ['easy', 'moderate', 'hard'], required: true },
  marks: { type: Number, required: true },
  options: [String],
  answer: String,
  hint: String,
});

const SectionSchema = new Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  instruction: { type: String, required: true },
  questionType: { type: String, required: true },
  questions: [QuestionSchema],
  totalMarks: { type: Number, required: true },
});

const AssignmentOutputSchema = new Schema<IAssignmentOutput>(
  {
    assignmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Assignment',
      required: true,
      index: true,
    },
    output: {
      schoolName: String,
      subject: String,
      grade: String,
      timeAllowed: Number,
      maximumMarks: Number,
      sections: [SectionSchema],
      generalInstructions: [String],
    },
    rawPrompt: { type: String },
    rawResponse: { type: String },
    generationTimeMs: { type: Number },
    tokenUsage: {
      inputTokens: Number,
      outputTokens: Number,
    },
  },
  {
    timestamps: true,
  }
);

export const AssignmentOutputModel = mongoose.model<IAssignmentOutput>(
  'AssignmentOutput',
  AssignmentOutputSchema
);
