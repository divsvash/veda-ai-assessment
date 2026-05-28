import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import AssignmentList from '@/components/assignments/AssignmentList';

export default function AssignmentsPage() {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden" style={{ marginLeft: 220 }}>
        <Topbar title="Assignment" />
        <main className="flex-1 overflow-auto">
          <AssignmentList />
        </main>
      </div>
    </div>
  );
}
