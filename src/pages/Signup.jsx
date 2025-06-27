// src/pages/Signup.jsx
import { useState } from 'react';
import { signUp } from '../services/authService';
import { useNavigate } from 'react-router-dom';

export default function Signup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.target);
    const firstName = formData.get('firstName');
    const lastName = formData.get('lastName');
    const middleInitial = formData.get('middleInitial');
    const email = formData.get('email');
    const address = formData.get('address');
    const contactNumber = formData.get('contactNumber');
    const password = formData.get('password');
    const nationalID = formData.get('nationalID');
    const selfieID = formData.get('selfieID');

    // Basic validation
    if (!firstName || !lastName || !email || !address || !contactNumber || !password || !nationalID || !selfieID) {
      setError('All required fields must be filled');
      setLoading(false);
      return;
    }

    const userData = { firstName, lastName, middleInitial, email, address, contactNumber };

    const { error } = await signUp(email, password, userData, nationalID, selfieID);

    if (error) {
      setError(error.message);
    } else {
      navigate('/login');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md p-6 bg-white rounded shadow">
        <h2 className="text-2xl font-bold mb-4">Create Account</h2>
        
        {error && <div className="bg-red-100 text-red-700 p-2 mb-4">{error}</div>}

        <div className="space-y-4">
          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-2">
            <input name="firstName" placeholder="First Name" className="p-2 border" />
            <input name="lastName" placeholder="Last Name" className="p-2 border" />
          </div>
          <input name="middleInitial" placeholder="Middle Initial (Optional)" className="w-full p-2 border" />

          {/* Email & Password */}
          <input name="email" type="email" placeholder="Email" className="w-full p-2 border" />
          <input name="password" type="password" placeholder="Password" className="w-full p-2 border" />

          {/* Address & Contact */}
          <input name="address" placeholder="Address" className="w-full p-2 border" />
          <input name="contactNumber" placeholder="Contact Number" className="w-full p-2 border" />

          {/* ID Uploads */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">National ID (Image)</label>
            <input name="nationalID" type="file" accept="image/*" className="w-full p-2 border" />
            
            <label className="block text-sm font-medium">Selfie Holding ID</label>
            <input name="selfieID" type="file" accept="image/*" className="w-full p-2 border" />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 px-4 hover:bg-blue-600 disabled:bg-blue-300"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </div>
      </form>
    </div>
  );
}