'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreVertical, Eye, Trash2, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Assignment, JobStatus } from '@/types';
import { useAssignmentStore } from '@/store/assignmentStore';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

const statusConfig: Record<JobStatus, { label: string; color: string; icon: React.ReactNode }> = {
  queued: { label: 'Queued', color: 'text-gray-400', icon: <Clock size={12} /> },
  analyzing: { label: 'Analyzing...', color: 'text-blue-500', icon: <Loader2 size={12} className="animate-spin" /> },
  generating: { label: 'Generating...', color: 'text-orange-500', icon: <Loader2 size={12} className="animate-spin" /> },
  balancing: { label: 'Balancing...', color: 'text-purple-500', icon: <Loader2 size={12} className="animate-spin" /> },
  creating_answer_key: { label: 'Answer key...', color: 'text-indigo-500', icon: <Loader2 size={12} className="animate-spin" /> },
  completed: { label: 'Completed', color: 'text-green-600', icon: <CheckCircle2 size={12} /> },
  failed: { label: 'Failed', color: 'text-red-500', icon: <XCircle size={12} /> },
};

interface AssignmentCardProps {
  assignment: Assignment;
}

export default function AssignmentCard({ assignment }: AssignmentCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { deleteAssignment, jobProgress, setShowOutputId } = useAssignmentStore();

  const progress = jobProgress.get(assignment.id);
  const currentStatus = progress?.status || assignment.status;
  const status = statusConfig[currentStatus];

  const isProcessing = ['queued', 'analyzing', 'generating', 'balancing', 'creating_answer_key'].includes(currentStatus);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleViewOutput = () => {
    setMenuOpen(false);
    router.push(`/assignments/${assignment.id}/output`);
  };

  const handleDelete = async () => {
    setMenuOpen(false);
    if (confirm('Delete this assignment?')) {
      await deleteAssignment(assignment.id);
    }
  };

  const formatDate = (d?: string) => {
    if (!d) return '';
    try { return format(new Date(d), 'dd-MM-yyyy'); }
    catch { return d; }
  };

  return (
    <div className={cn(
      'bg-white rounded-xl border p-5 relative group transition-all',
      isProcessing ? 'border-orange-200 shadow-sm' : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'
    )}>
      {/* Progress bar for active jobs */}
      {isProcessing && progress && (
        <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl overflow-hidden bg-orange-100">
          <div
            className="h-full bg-orange-500 transition-all duration-700"
            style={{ width: `${progress.progress}%` }}
          />
        </div>
      )}

      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm truncate pr-2">
            {assignment.title}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">{assignment.subject} · Grade {assignment.grade}</p>
        </div>

        {/* 3-dot menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 rounded-md hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical size={16} className="text-gray-400" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-7 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 min-w-[150px]">
              {assignment.status === 'completed' && (
                <button
                  onClick={handleViewOutput}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Eye size={14} />
                  View Assignment
                </button>
              )}
              <button
                onClick={handleDelete}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Status */}
      <div className={cn('flex items-center gap-1 mt-3 text-xs font-medium', status.color)}>
        {status.icon}
        <span>
          {isProcessing && progress ? progress.message : status.label}
        </span>
      </div>

      {/* Footer dates */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
        <span className="text-[11px] text-gray-400">
          <span className="font-medium text-gray-500">Assigned on :</span>{' '}
          {formatDate(assignment.createdAt)}
        </span>
        {assignment.dueDate && (
          <span className="text-[11px] text-gray-400">
            <span className="font-medium text-gray-500">Due :</span>{' '}
            {formatDate(assignment.dueDate)}
          </span>
        )}
      </div>
    </div>
  );
}
