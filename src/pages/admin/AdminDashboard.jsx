import { Outlet } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen">
      {/* Sidebar (Desktop) */}
      <div className="hidden md:block w-64 bg-gray-800 text-white p-4">
        <h2 className="text-xl font-bold mb-4">Rawlens Admin</h2>
        <nav className="space-y-2">
          <button onClick={() => navigate('/admin/cameras')} className="block w-full text-left p-2 hover:bg-gray-700">
            Cameras
          </button>
          <button onClick={() => navigate('/admin/users')} className="block w-full text-left p-2 hover:bg-gray-700">
            Users
          </button>
        </nav>
      </div>

      {/* Bottom Nav (Mobile) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-800 text-white flex justify-around p-2">
        <button onClick={() => navigate('/admin/cameras')} className="p-2">
          📷
        </button>
        <button onClick={() => navigate('/admin/users')} className="p-2">
          👤
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto md:ml-64">
        <Outlet /> {/* Renders child routes: Cameras, Users */}
      </div>
    </div>
  );
}