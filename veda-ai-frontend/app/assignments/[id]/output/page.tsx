'use client';

import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import OutputView from '@/components/assignments/OutputView';

interface Props {
  params: { id: string };
}

export default function AssignmentOutputPage({ params }: Props) {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden" style={{ marginLeft: 220 }}>
        <Topbar title="Create New" showBack backHref="/assignments" />
        <main className="flex-1 flex flex-col overflow-hidden">
          <OutputView assignmentId={params.id} />
        </main>
      </div>
    </div>
  );
}
