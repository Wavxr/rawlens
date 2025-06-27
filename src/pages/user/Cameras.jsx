import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function UserCameras() {
  const [cameras, setCameras] = useState([]);

  useEffect(() => {
    const fetchCameras = async () => {
      const { data, error } = await supabase.from('cameras').select('*').eq('available', true);
      if (!error) setCameras(data);
    };
    fetchCameras();
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Available Cameras</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cameras.map((camera) => (
          <div key={camera.id} className="border p-4 rounded shadow">
            {camera.image_url && (
              <img src={camera.image_url} alt={camera.name} className="w-full h-40 object-cover mb-4" />
            )}
            <h3 className="text-lg font-semibold">{camera.name}</h3>
            <p className="text-gray-600">{camera.description}</p>
            <p className="font-bold mt-2">${camera.price_per_day}/day</p>
            <button className="mt-4 bg-blue-500 text-white px-4 py-2 rounded">
              Rent
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}