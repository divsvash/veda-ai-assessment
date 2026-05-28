'use client';

import { useAssignmentStore } from '@/store/assignmentStore';
import { useRouter } from 'next/navigation';

export default function EmptyState() {
  const { setShowCreateModal } = useAssignmentStore();
  const router = useRouter();

  const handleCreate = () => {
    router.push('/assignments/create');
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-[calc(100vh-56px)]">
      {/* Illustration */}
      <div className="mb-6">
        <svg width="180" height="160" viewBox="0 0 180 160" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Background circle */}
          <circle cx="85" cy="95" r="58" fill="#EDE9FE" opacity="0.5" />
          {/* Main document */}
          <rect x="55" y="30" width="75" height="95" rx="6" fill="white" stroke="#E5E7EB" strokeWidth="1.5" />
          {/* Document lines */}
          <rect x="65" y="45" width="35" height="4" rx="2" fill="#1F2937" />
          <rect x="65" y="57" width="50" height="3" rx="1.5" fill="#D1D5DB" />
          <rect x="65" y="66" width="50" height="3" rx="1.5" fill="#D1D5DB" />
          <rect x="65" y="75" width="40" height="3" rx="1.5" fill="#D1D5DB" />
          <rect x="65" y="84" width="45" height="3" rx="1.5" fill="#D1D5DB" />
          {/* Second doc shadow */}
          <rect x="68" y="22" width="70" height="88" rx="6" fill="white" stroke="#E5E7EB" strokeWidth="1.5" opacity="0.6" />
          <rect x="78" y="35" width="30" height="4" rx="2" fill="#9CA3AF" opacity="0.5" />
          <rect x="78" y="47" width="45" height="3" rx="1.5" fill="#D1D5DB" opacity="0.5" />
          {/* Magnifying glass */}
          <circle cx="97" cy="98" r="28" fill="white" stroke="#C4B5FD" strokeWidth="2.5" />
          <circle cx="97" cy="98" r="20" fill="#F5F3FF" />
          {/* Red X */}
          <line x1="88" y1="89" x2="106" y2="107" stroke="#EF4444" strokeWidth="4" strokeLinecap="round" />
          <line x1="106" y1="89" x2="88" y2="107" stroke="#EF4444" strokeWidth="4" strokeLinecap="round" />
          {/* Handle */}
          <line x1="119" y1="120" x2="133" y2="135" stroke="#8B5CF6" strokeWidth="3.5" strokeLinecap="round" />
          {/* Sparkles */}
          <path d="M40 75 L42 70 L44 75 L42 80 Z" fill="#60A5FA" />
          <circle cx="148" cy="78" r="3" fill="#34D399" />
          <path d="M155 108 L157 104 L159 108 L157 112 Z" fill="#F59E0B" />
        </svg>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mb-2.5 text-center">
        No assignments yet
      </h2>
      <p className="text-sm text-gray-500 text-center max-w-xs leading-relaxed mb-7">
        Create your first assignment to start collecting and grading student submissions.
        You can set up rubrics, define marking criteria, and let AI assist with grading.
      </p>

      <button
        onClick={handleCreate}
        className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-full py-3 px-6 transition-colors shadow-sm"
      >
        <span className="text-base leading-none">+</span>
        Create Your First Assignment
      </button>
    </div>
  );
}
