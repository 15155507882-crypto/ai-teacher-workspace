import { TeacherWorkspace } from '@/components/teacher-workspace';

export default function WorkspacePage() {
  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 9999,
          background: 'red',
          color: 'white',
          padding: '8px 16px',
          fontWeight: 'bold',
          fontSize: 14,
        }}
      >
        NEW WORKSPACE V2 LOADED
      </div>
      <div className="fixed top-12 left-0 z-[9999] bg-blue-600 text-white p-4 rounded-xl shadow-lg text-sm font-bold">
        TAILWIND TEST — SHOULD BE BLUE BG WHITE TEXT WITH ROUNDED CORNERS
      </div>
      <TeacherWorkspace />
    </>
  );
}
