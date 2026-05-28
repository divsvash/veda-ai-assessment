'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ArrowLeft, ArrowRight, Loader2, Mic } from 'lucide-react';
import { useAssignmentStore } from '@/store/assignmentStore';
import { createAssignment } from '@/lib/api';
import { wsManager } from '@/lib/websocket';
import QuestionTypeRow from './QuestionTypeRow';
import FileUploadZone from './FileUploadZone';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

/* ─── Step 1: Basic info ─────────────────────────────────────────────────────── */
function StepOne({ onNext }: { onNext: () => void }) {
  const { form, updateForm } = useAssignmentStore();
  const { title, subject, grade, schoolName, timeAllowed, errors } = form;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!subject.trim()) errs.subject = 'Subject is required';
    if (!grade.trim())   errs.grade   = 'Grade is required';
    if (!schoolName.trim()) errs.schoolName = 'School name is required';
    // Update errors without resetting question types
    if (Object.keys(errs).length > 0) {
      // Write only these errors
      const next = { ...form.errors, ...errs };
      updateForm({ errors: next } as never);
      toast.error('Please fill in all required fields');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validate()) onNext();
  };

  const field = (
    key: 'title' | 'subject' | 'grade' | 'schoolName' | 'timeAllowed',
    label: string,
    placeholder: string,
    required = true
  ) => (
    <div>
      <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
        {label} {required && <span className="text-red-400 normal-case font-normal">*</span>}
      </label>
      <input
        type="text"
        value={form[key] as string}
        onChange={(e) => updateForm({ [key]: e.target.value } as never)}
        placeholder={placeholder}
        className={cn(
          'w-full text-[13px] text-gray-700 border rounded-lg px-3.5 py-2.5 outline-none focus:border-gray-400 bg-white transition-colors placeholder-gray-400',
          (errors as Record<string,string>)[key] ? 'border-red-300 bg-red-50/40' : 'border-gray-200'
        )}
      />
      {(errors as Record<string,string>)[key] && (
        <p className="text-[11px] text-red-500 mt-1">{(errors as Record<string,string>)[key]}</p>
      )}
    </div>
  );

  return (
    <div className="flex flex-col p-6 bg-gray-50 min-h-[calc(100vh-56px)]">
      {/* Page header */}
      <div className="flex items-start gap-2 mb-5">
        <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
        <div>
          <h1 className="text-[14px] font-semibold text-gray-900 leading-tight">Create Assignment</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">Set up a new assignment for your students</p>
        </div>
      </div>

      {/* Step bar — 25% */}
      <div className="w-full max-w-[560px] h-[3px] bg-gray-200 rounded-full mb-5 overflow-hidden">
        <div className="h-full bg-gray-800 rounded-full" style={{ width: '25%' }} />
      </div>

      <div className="w-full max-w-[560px] bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-[13.5px] font-semibold text-gray-900">Assignment Details</h2>
          <p className="text-[11.5px] text-gray-400 mt-0.5">Basic information about your assignment</p>
        </div>

        <div className="px-6 pt-5 pb-4 space-y-4">
          {field('title',      'Assignment Title', 'e.g. Chapter 5 Quiz on Electric Current', false)}
          <div className="grid grid-cols-2 gap-3">
            {field('subject', 'Subject', 'e.g. Science')}
            {field('grade',   'Grade / Class', 'e.g. 8th')}
          </div>
          {field('schoolName', 'School Name', 'e.g. Delhi Public School, Bokaro')}
          <div>
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              Time Allowed (minutes)
            </label>
            <input
              type="number"
              value={timeAllowed}
              onChange={(e) => updateForm({ timeAllowed: e.target.value })}
              min={5} max={300}
              className="w-full text-[13px] border border-gray-200 rounded-lg px-3.5 py-2.5 outline-none focus:border-gray-400 bg-white"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => { window.history.back(); }}
            className="flex items-center gap-1.5 text-[13px] text-gray-600 hover:text-gray-900 border border-gray-200 rounded-full py-2 px-5 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={12} />
            Previous
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-1.5 text-[13px] font-medium bg-gray-900 hover:bg-gray-700 text-white rounded-full py-2.5 px-6 transition-colors"
          >
            Next
            <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Step 2: Upload material + question config ──────────────────────────────── */
function StepTwo({ onBack, onSubmit, submitting }: {
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const { form, updateForm, addQuestionType } = useAssignmentStore();
  const { dueDate, questionTypes, additionalInstructions, errors } = form;

  const totalQuestions = questionTypes.reduce((s, qt) => s + qt.numberOfQuestions, 0);
  const totalMarks     = questionTypes.reduce((s, qt) => s + qt.numberOfQuestions * qt.marksPerQuestion, 0);

  return (
    <div className="flex flex-col p-6 bg-gray-50 min-h-[calc(100vh-56px)]">
      {/* Page header */}
      <div className="flex items-start gap-2 mb-5">
        <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
        <div>
          <h1 className="text-[14px] font-semibold text-gray-900 leading-tight">Create Assignment</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">Set up a new assignment for your students</p>
        </div>
      </div>

      {/* Step bar — 50% (step 2 of 2 visible) */}
      <div className="w-full max-w-[560px] h-[3px] bg-gray-200 rounded-full mb-5 overflow-hidden">
        <div className="h-full bg-gray-800 rounded-full transition-all" style={{ width: '50%' }} />
      </div>

      {/* Main card */}
      <div className="w-full max-w-[560px] bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Card header */}
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-[13.5px] font-semibold text-gray-900">Assignment Details</h2>
          <p className="text-[11.5px] text-gray-400 mt-0.5">Basic information about your assignment</p>
        </div>

        {/* Card body */}
        <div className="px-6 pt-5 pb-4 space-y-4">

          {/* File Upload */}
          <div>
            <FileUploadZone />
            <p className="text-[11px] text-gray-400 mt-1.5 text-center">
              Upload images of your preferred document/image
            </p>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              Due Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => updateForm({ dueDate: e.target.value })}
                placeholder="DD-MM-YYYY"
                className="w-full text-[13px] text-gray-500 border border-gray-200 rounded-lg px-3.5 py-2.5 outline-none focus:border-gray-400 pr-10 bg-white"
              />
              {/* Calendar icon */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="1" y="2.5" width="12" height="10.5" rx="1.5" stroke="#9CA3AF" strokeWidth="1.2"/>
                  <path d="M4.5 1V4M9.5 1V4" stroke="#9CA3AF" strokeWidth="1.2" strokeLinecap="round"/>
                  <path d="M1 6H13" stroke="#9CA3AF" strokeWidth="1.2"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Question Type section */}
          <div>
            {/* Column headers — aligned exactly with steppers */}
            <div className="flex items-center mb-1.5">
              <span className="flex-1 text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                Question Type
              </span>
              {/* spacer matching X button width */}
              <div style={{ width: 20, flexShrink: 0 }} />
              <div
                className="text-[11px] font-medium text-gray-500 text-center"
                style={{ width: 84, flexShrink: 0 }}
              >
                No. of Questions
              </div>
              <div
                className="text-[11px] font-medium text-gray-500 text-center"
                style={{ width: 84, flexShrink: 0 }}
              >
                Marks
              </div>
            </div>

            {/* Rows */}
            <div className="space-y-0.5">
              {questionTypes.map((qt, i) => (
                <QuestionTypeRow
                  key={qt.id}
                  qt={qt}
                  index={i}
                  canRemove={questionTypes.length > 1}
                  errors={errors}
                />
              ))}
            </div>

            {errors.questionTypes && (
              <p className="text-[11px] text-red-500 mt-1">{errors.questionTypes}</p>
            )}

            {/* Add Question Type */}
            <button
              type="button"
              onClick={addQuestionType}
              className="mt-3.5 flex items-center gap-2 text-[12.5px] text-gray-700 hover:text-gray-900 font-medium group"
            >
              <span className="w-[22px] h-[22px] rounded-full bg-gray-900 group-hover:bg-gray-700 flex items-center justify-center flex-shrink-0 transition-colors">
                <Plus size={11} className="text-white" />
              </span>
              Add Question Type
            </button>

            {/* Totals */}
            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end items-center gap-5">
              <span className="text-[12px] text-gray-500">
                Total Questions : <span className="font-semibold text-gray-800">{totalQuestions}</span>
              </span>
              <span className="text-[12px] text-gray-500">
                Total Marks : <span className="font-semibold text-gray-800">{totalMarks}</span>
              </span>
            </div>
          </div>

          {/* Additional Information */}
          <div>
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              Additional Information{' '}
              <span className="normal-case font-normal text-gray-400">(For better output)</span>
            </label>
            <div className="relative">
              <textarea
                value={additionalInstructions}
                onChange={(e) => updateForm({ additionalInstructions: e.target.value })}
                rows={3}
                placeholder="e.g Generate a question paper for 3 hour exam duration..."
                className="w-full text-[13px] text-gray-700 border border-gray-200 rounded-xl px-3.5 py-3 outline-none focus:border-gray-400 resize-none placeholder-gray-400 pb-7"
              />
              <div className="absolute bottom-2.5 right-3 text-gray-300 hover:text-gray-500 cursor-pointer transition-colors">
                <Mic size={13} />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-[13px] text-gray-600 hover:text-gray-900 border border-gray-200 rounded-full py-2 px-5 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={12} />
            Previous
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className={cn(
              'flex items-center gap-1.5 text-[13px] font-medium rounded-full py-2.5 px-6 transition-colors',
              submitting
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-gray-900 hover:bg-gray-700 text-white'
            )}
          >
            {submitting ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                Next
                <ArrowRight size={12} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Root component ─────────────────────────────────────────────────────────── */
export default function CreateAssignmentForm() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);

  const {
    form,
    validateForm,
    resetForm,
    addAssignment,
    setJobProgress,
    updateAssignmentStatus,
    setOutput,
  } = useAssignmentStore();

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors below');
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      const { title, subject, grade, schoolName, dueDate, timeAllowed, additionalInstructions, questionTypes, file } = form;
      fd.append('title',   title || `${subject} Assessment`);
      fd.append('subject', subject);
      fd.append('grade',   grade);
      fd.append('schoolName', schoolName);
      if (dueDate) fd.append('dueDate', dueDate);
      if (timeAllowed) fd.append('timeAllowed', timeAllowed);
      if (additionalInstructions) fd.append('additionalInstructions', additionalInstructions);
      fd.append('questionTypes', JSON.stringify(questionTypes));
      if (file) fd.append('file', file);

      const data = await createAssignment(fd);
      const assignmentId = data.assignment.id;

      addAssignment({
        id: assignmentId,
        title: data.assignment.title,
        subject, grade, schoolName, dueDate,
        status: 'queued',
        jobId: data.assignment.jobId,
        hasOutput: false,
        createdAt: new Date().toISOString(),
      });

      toast.success('Assignment queued for AI generation!');
      resetForm();

      wsManager.subscribe(assignmentId, (update) => {
        setJobProgress(update);
        if (update.status === 'completed') {
          updateAssignmentStatus(assignmentId, 'completed');
          if (update.result) setOutput(assignmentId, update.result);
          toast.success('Question paper ready! 🎉', { duration: 5000 });
        } else if (update.status === 'failed') {
          updateAssignmentStatus(assignmentId, 'failed');
          toast.error('Generation failed. Please try again.');
        }
      });

      router.push('/assignments');
    } catch (err) {
      toast.error((err as Error).message || 'Failed to create assignment');
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 1) {
    return <StepOne onNext={() => setStep(2)} />;
  }

  return (
    <StepTwo
      onBack={() => setStep(1)}
      onSubmit={handleSubmit}
      submitting={submitting}
    />
  );
}
