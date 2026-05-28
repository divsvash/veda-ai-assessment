'use client';

import { useEffect, useState } from 'react';
import { Search, SlidersHorizontal, Plus } from 'lucide-react';
import { useAssignmentStore } from '@/store/assignmentStore';
import AssignmentCard from './AssignmentCard';
import EmptyState from './EmptyState';
import { wsManager } from '@/lib/websocket';
import { useRouter } from 'next/navigation';

export default function AssignmentList() {
  const {
    assignments,
    listLoading,
    loadAssignments,
    setJobProgress,
    updateAssignmentStatus,
    setOutput,
  } = useAssignmentStore();

  const [search, setSearch] = useState('');
  const router = useRouter();

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  // Global WS listener for all assignment updates
  useEffect(() => {
    wsManager.connect();
    const unsub = wsManager.subscribe('*', (update) => {
      setJobProgress(update);
      if (update.status === 'completed' || update.status === 'failed') {
        updateAssignmentStatus(update.assignmentId, update.status);
        if (update.result) {
          setOutput(update.assignmentId, update.result);
        }
      }
    });
    return unsub;
  }, [setJobProgress, updateAssignmentStatus, setOutput]);

  const filtered = assignments.filter((a) =>
    !search ||
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.subject.toLowerCase().includes(search.toLowerCase())
  );

  if (listLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-gray-600 animate-spin" />
          <p className="text-sm text-gray-400">Loading assignments...</p>
        </div>
      </div>
    );
  }

  if (assignments.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex-1 flex flex-col p-6 min-h-[calc(100vh-56px)]">
      {/* Page Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <h1 className="text-lg font-semibold text-gray-900">Assignments</h1>
        </div>
        <p className="text-sm text-gray-400">Manage and create assignments for your classes.</p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors">
          <SlidersHorizontal size={14} />
          Filter By
        </button>

        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Assignment"
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 bg-white"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((assignment) => (
          <AssignmentCard key={assignment.id} assignment={assignment} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex-1 flex items-center justify-center py-16">
          <p className="text-sm text-gray-400">No assignments found matching "{search}"</p>
        </div>
      )}

      {/* Floating Create Button */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2">
        <button
          onClick={() => router.push('/assignments/create')}
          className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-full py-3 px-6 shadow-lg hover:shadow-xl transition-all"
        >
          <Plus size={16} />
          Create Assignment
        </button>
      </div>
    </div>
  );
}
