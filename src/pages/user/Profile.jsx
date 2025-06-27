import { useAuth } from '../../hooks/useAuth';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function Profile() {
  const { user, loading } = useAuth();
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user?.id)
        .single();
      if (!error) setUserData(data);
    };
    if (user) fetchUserData();
  }, [user]);

  if (loading) return <div>Loading...</div>;

  if (!userData) return <div>No user data found.</div>;

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Profile</h2>
      <div className="space-y-4">
        <p><strong>Email:</strong> {userData.email}</p>
        <p><strong>Full Name:</strong> {userData.first_name} {userData.middle_initial || ''} {userData.last_name}</p>
        <p><strong>Address:</strong> {userData.address}</p>
        <p><strong>Contact:</strong> {userData.contact_number}</p>
        
        {userData.national_id_url && (
          <img src={userData.national_id_url} alt="National ID" className="max-w-md mt-4" />
        )}
        {userData.selfie_id_url && (
          <img src={userData.selfie_id_url} alt="Selfie with ID" className="max-w-md mt-4" />
        )}
      </div>
    </div>
  );
}