'use client';

import { Bell, ChevronDown, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface TopbarProps {
  title?: string;
  showBack?: boolean;
  backHref?: string;
}

export default function Topbar({ title = 'Assignment', showBack = false, backHref = '/assignments' }: TopbarProps) {
  const router = useRouter();

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            onClick={() => router.push(backHref)}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={18} className="text-gray-500" />
          </button>
        )}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="1" width="6" height="6" rx="1" fill="#9CA3AF" />
            <rect x="9" y="1" width="6" height="6" rx="1" fill="#9CA3AF" />
            <rect x="1" y="9" width="6" height="6" rx="1" fill="#9CA3AF" />
            <rect x="9" y="9" width="6" height="6" rx="1" fill="#9CA3AF" />
          </svg>
          <span>{title}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="relative p-2 hover:bg-gray-100 rounded-full">
          <Bell size={18} className="text-gray-500" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </button>

        <button className="flex items-center gap-2 hover:bg-gray-50 rounded-lg px-2 py-1.5 transition-colors">
          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-xs font-semibold text-gray-600">JD</span>
          </div>
          <span className="text-sm text-gray-700 font-medium">John Doe</span>
          <ChevronDown size={14} className="text-gray-400" />
        </button>
      </div>
    </header>
  );
}
