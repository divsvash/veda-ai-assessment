// src/models/Assignment.ts
import mongoose, { Document, Schema } from 'mongoose';
import { QuestionTypeConfig, JobStatus } from '../types';

export interface IAssignment extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  subject: string;
  grade: string;
  schoolName: string;
  dueDate?: Date;
  timeAllowed?: number;
  questionTypes: QuestionTypeConfig[];
  additionalInstructions?: string;
  fileContent?: string;
  originalFileName?: string;
  status: JobStatus;
  jobId?: string;
  outputId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionTypeConfigSchema = new Schema({
  type: {
    type: String,
    enum: ['multiple_choice', 'short_answer', 'long_answer', 'diagram_based', 'numerical', 'true_false'],
    required: true,
  },
  label: { type: String, required: true },
  numberOfQuestions: { type: Number, required: true, min: 1 },
  marksPerQuestion: { type: Number, required: true, min: 1 },
});

const AssignmentSchema = new Schema<IAssignment>(
  {
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    grade: { type: String, required: true, trim: true },
    schoolName: { type: String, required: true, trim: true },
    dueDate: { type: Date },
    timeAllowed: { type: Number, min: 1 },
    questionTypes: { type: [QuestionTypeConfigSchema], required: true },
    additionalInstructions: { type: String },
    fileContent: { type: String },
    originalFileName: { type: String },
    status: {
      type: String,
      enum: ['queued', 'analyzing', 'generating', 'balancing', 'creating_answer_key', 'completed', 'failed'],
      default: 'queued',
    },
    jobId: { type: String },
    outputId: { type: Schema.Types.ObjectId, ref: 'AssignmentOutput' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
AssignmentSchema.index({ status: 1 });
AssignmentSchema.index({ createdAt: -1 });
AssignmentSchema.index({ jobId: 1 });

// Virtual: totalMarks
AssignmentSchema.virtual('totalMarks').get(function (this: IAssignment) {
  return this.questionTypes.reduce((sum, qt) => sum + qt.numberOfQuestions * qt.marksPerQuestion, 0);
});

AssignmentSchema.virtual('totalQuestions').get(function (this: IAssignment) {
  return this.questionTypes.reduce((sum, qt) => sum + qt.numberOfQuestions, 0);
});

export const Assignment = mongoose.model<IAssignment>('Assignment', AssignmentSchema);
