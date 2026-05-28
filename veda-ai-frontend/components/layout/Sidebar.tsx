'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAssignmentStore } from '@/store/assignmentStore';
import {
  Home,
  Users,
  ClipboardList,
  Wand2,
  Library,
  Settings,
} from 'lucide-react';

const nav = [
  { label: 'Home', icon: Home, href: '/' },
  { label: 'My Groups', icon: Users, href: '/groups' },
  { label: 'Assignments', icon: ClipboardList, href: '/assignments' },
  { label: "AI Teacher's Toolkit", icon: Wand2, href: '/toolkit' },
  { label: 'My Library', icon: Library, href: '/library' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { setShowCreateModal, totalAssignments } = useAssignmentStore();

  const handleCreate = () => {
    router.push('/assignments');
    setShowCreateModal(true);
  };

  return (
    <aside
      className="fixed left-0 top-0 h-screen bg-white border-r border-gray-100 flex flex-col z-30"
      style={{ width: 220 }}
    >
      {/* Logo */}
      <div className="px-6 pt-6 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">V</span>
          </div>
          <span className="font-semibold text-[15px] text-gray-900 tracking-tight">VedaAI</span>
        </div>
      </div>

      {/* Create Button */}
      <div className="px-4 mb-5">
        <button
          onClick={handleCreate}
          className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-full py-2.5 px-4 transition-colors"
        >
          <span className="text-lg leading-none">+</span>
          Create Assignment
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3">
        {nav.map(({ label, icon: Icon, href }) => {
          const active = pathname === href || (href === '/assignments' && pathname.startsWith('/assignments'));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-0.5 group',
                active
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              )}
            >
              <Icon size={16} className={cn(active ? 'text-gray-700' : 'text-gray-400 group-hover:text-gray-600')} />
              <span className="flex-1">{label}</span>
              {label === 'Assignments' && totalAssignments > 0 && (
                <span className="bg-orange-500 text-white text-[10px] font-semibold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {totalAssignments > 99 ? '99+' : totalAssignments}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-5 mt-auto">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-800 mb-2"
        >
          <Settings size={16} className="text-gray-400" />
          Settings
        </Link>

        {/* School profile */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50">
          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center overflow-hidden flex-shrink-0">
            <span className="text-orange-600 font-semibold text-xs">DPS</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate">Delhi Public School</p>
            <p className="text-[10px] text-gray-400 truncate">Bokaro Steel City</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
