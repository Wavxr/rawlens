import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return <div>Loading...</div>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
      <h1 className="text-4xl font-bold mb-4">Welcome to Rawlens</h1>
      <p className="text-lg mb-6 text-center">Rent professional cameras with ease.</p>
      <div className="flex gap-4">
        {user ? (
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-blue-500 text-white px-6 py-2 rounded"
          >
            Go to Dashboard
          </button>
        ) : (
          <>
            <button
              onClick={() => navigate('/login')}
              className="bg-gray-500 text-white px-6 py-2 rounded"
            >
              Login
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="bg-blue-500 text-white px-6 py-2 rounded"
            >
              Sign Up
            </button>
          </>
        )}
      </div>
    </div>
  );
}