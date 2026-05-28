'use client';

import { X, Minus, Plus } from 'lucide-react';
import { QuestionTypeConfig, QUESTION_TYPE_OPTIONS } from '@/types';
import { useAssignmentStore } from '@/store/assignmentStore';
import { cn } from '@/lib/utils';

interface Props {
  qt: QuestionTypeConfig;
  index: number;
  canRemove: boolean;
  errors: Record<string, string>;
}

export default function QuestionTypeRow({ qt, index, canRemove, errors }: Props) {
  const { updateQuestionType, removeQuestionType } = useAssignmentStore();

  const countError = errors[`qt_${index}_count`];
  const marksError = errors[`qt_${index}_marks`];

  const adjustCount = (delta: number) => {
    const val = Math.max(1, Math.min(50, qt.numberOfQuestions + delta));
    updateQuestionType(qt.id, { numberOfQuestions: val });
  };

  const adjustMarks = (delta: number) => {
    const val = Math.max(1, Math.min(20, qt.marksPerQuestion + delta));
    updateQuestionType(qt.id, { marksPerQuestion: val });
  };

  return (
    <div className="flex items-center gap-2 py-2">
      {/* Type selector — flex-1, matches Figma width */}
      <div className="flex-1 relative min-w-0">
        <select
          value={qt.type}
          onChange={(e) => {
            const opt = QUESTION_TYPE_OPTIONS.find((o) => o.value === e.target.value);
            updateQuestionType(qt.id, {
              type: e.target.value as QuestionTypeConfig['type'],
              label: opt?.label || '',
            });
          }}
          className="w-full text-[12.5px] text-gray-700 border border-gray-200 rounded-lg px-3 py-2 pr-7 bg-white outline-none focus:border-gray-400 appearance-none cursor-pointer truncate"
        >
          {QUESTION_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <svg
          className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none flex-shrink-0"
          viewBox="0 0 12 12" fill="none"
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* X button — visible only if multiple rows */}
      {canRemove ? (
        <button
          type="button"
          onClick={() => removeQuestionType(qt.id)}
          className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-700 flex-shrink-0 transition-colors"
          title="Remove"
        >
          <X size={13} />
        </button>
      ) : (
        /* Placeholder so layout stays consistent */
        <div className="w-5 flex-shrink-0" />
      )}

      {/* No. of Questions stepper — matches Figma pill shape */}
      <div
        className={cn(
          'flex items-center border rounded-lg overflow-hidden flex-shrink-0',
          countError ? 'border-red-300' : 'border-gray-200'
        )}
        style={{ height: 32 }}
      >
        <button
          type="button"
          onClick={() => adjustCount(-1)}
          className="flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors border-r border-gray-200 flex-shrink-0"
          style={{ width: 28, height: 32 }}
        >
          <Minus size={10} />
        </button>
        <input
          type="number"
          min={1}
          max={50}
          value={qt.numberOfQuestions}
          onChange={(e) =>
            updateQuestionType(qt.id, {
              numberOfQuestions: Math.max(1, Math.min(50, parseInt(e.target.value) || 1)),
            })
          }
          className="text-center text-[12.5px] font-medium border-0 outline-none bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          style={{ width: 28, height: 32 }}
        />
        <button
          type="button"
          onClick={() => adjustCount(1)}
          className="flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors border-l border-gray-200 flex-shrink-0"
          style={{ width: 28, height: 32 }}
        >
          <Plus size={10} />
        </button>
      </div>

      {/* Marks stepper */}
      <div
        className={cn(
          'flex items-center border rounded-lg overflow-hidden flex-shrink-0',
          marksError ? 'border-red-300' : 'border-gray-200'
        )}
        style={{ height: 32 }}
      >
        <button
          type="button"
          onClick={() => adjustMarks(-1)}
          className="flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors border-r border-gray-200 flex-shrink-0"
          style={{ width: 28, height: 32 }}
        >
          <Minus size={10} />
        </button>
        <input
          type="number"
          min={1}
          max={20}
          value={qt.marksPerQuestion}
          onChange={(e) =>
            updateQuestionType(qt.id, {
              marksPerQuestion: Math.max(1, Math.min(20, parseInt(e.target.value) || 1)),
            })
          }
          className="text-center text-[12.5px] font-medium border-0 outline-none bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          style={{ width: 28, height: 32 }}
        />
        <button
          type="button"
          onClick={() => adjustMarks(1)}
          className="flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors border-l border-gray-200 flex-shrink-0"
          style={{ width: 28, height: 32 }}
        >
          <Plus size={10} />
        </button>
      </div>
    </div>
  );
}
