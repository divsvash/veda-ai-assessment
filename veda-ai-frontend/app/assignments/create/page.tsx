import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import CreateAssignmentForm from '@/components/assignments/CreateAssignmentForm';

export default function CreateAssignmentPage() {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden" style={{ marginLeft: 220 }}>
        <Topbar title="Assignment" showBack backHref="/assignments" />
        <main className="flex-1 overflow-auto">
          <CreateAssignmentForm />
        </main>
      </div>
    </div>
  );
}
