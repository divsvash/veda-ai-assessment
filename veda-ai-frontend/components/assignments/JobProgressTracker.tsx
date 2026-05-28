'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { JobProgressUpdate, JobStatus } from '@/types';
import { wsManager } from '@/lib/websocket';
import { cn } from '@/lib/utils';

const stages = [
  { status: 'analyzing', label: 'Analyzing syllabus...' },
  { status: 'generating', label: 'Generating sections...' },
  { status: 'balancing', label: 'Balancing difficulty...' },
  { status: 'creating_answer_key', label: 'Creating answer key...' },
  { status: 'completed', label: 'Finalizing...' },
];

interface Props {
  assignmentId: string;
  onCompleted: (output: JobProgressUpdate) => void;
}

export default function JobProgressTracker({ assignmentId, onCompleted }: Props) {
  const [update, setUpdate] = useState<JobProgressUpdate>({
    jobId: '',
    assignmentId,
    status: 'queued',
    progress: 0,
    message: 'Queued for processing...',
  });

  useEffect(() => {
    const unsub = wsManager.subscribe(assignmentId, (u) => {
      setUpdate(u);
      if (u.status === 'completed') onCompleted(u);
    });
    wsManager.connect(assignmentId);
    return unsub;
  }, [assignmentId, onCompleted]);

  const activeStageIdx = stages.findIndex((s) => s.status === update.status);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 max-w-md w-full">
      <div className="mb-5">
        <h3 className="font-semibold text-gray-900 mb-1">Generating Question Paper</h3>
        <p className="text-sm text-gray-500">{update.message}</p>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-100 rounded-full mb-6 overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-700',
            update.status === 'failed' ? 'bg-red-500' : 'bg-gray-900'
          )}
          style={{ width: `${update.progress}%` }}
        />
      </div>

      {/* Stages */}
      <div className="space-y-2.5">
        {stages.map((stage, i) => {
          const isActive = stage.status === update.status;
          const isDone = i < activeStageIdx || update.status === 'completed';
          const isFailed = update.status === 'failed' && isActive;

          return (
            <div key={stage.status} className="flex items-center gap-3">
              <div className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
                isDone ? 'bg-green-500' : isActive ? 'bg-orange-100' : 'bg-gray-100'
              )}>
                {isFailed ? (
                  <XCircle size={12} className="text-red-500" />
                ) : isDone ? (
                  <CheckCircle2 size={12} className="text-white" />
                ) : isActive ? (
                  <Loader2 size={10} className="text-orange-500 animate-spin" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                )}
              </div>
              <span className={cn(
                'text-sm',
                isDone ? 'text-gray-500 line-through' : isActive ? 'text-gray-900 font-medium' : 'text-gray-300'
              )}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 text-right mt-4">{update.progress}%</p>
    </div>
  );
}
