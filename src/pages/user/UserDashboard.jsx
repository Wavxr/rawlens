import { Outlet } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

export default function UserDashboard() {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen">
      {/* Sidebar (Desktop) */}
      <div className="hidden md:block w-64 bg-gray-800 text-white p-4">
        <h2 className="text-xl font-bold mb-4">Rawlens User</h2>
        <nav className="space-y-2">
          <button onClick={() => navigate('/user/cameras')} className="block w-full text-left p-2 hover:bg-gray-700">
            Cameras
          </button>
          <button onClick={() => navigate('/user/rent')} className="block w-full text-left p-2 hover:bg-gray-700">
            Rent
          </button>
          <button onClick={() => navigate('/user/educational')} className="block w-full text-left p-2 hover:bg-gray-700">
            Educational
          </button>
          <button onClick={() => navigate('/user/profile')} className="block w-full text-left p-2 hover:bg-gray-700">
            Profile
          </button>
        </nav>
      </div>

      {/* Bottom Nav (Mobile) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-800 text-white flex justify-around p-2">
        <button onClick={() => navigate('/user/cameras')} className="p-2">
          📷
        </button>
        <button onClick={() => navigate('/user/rent')} className="p-2">
          📅
        </button>
        <button onClick={() => navigate('/user/educational')} className="p-2">
          📚
        </button>
        <button onClick={() => navigate('/user/profile')} className="p-2">
          👤
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto md:ml-64">
        <Outlet /> {/* Renders child routes: Cameras, Rent, etc. */}
      </div>
    </div>
  );
}