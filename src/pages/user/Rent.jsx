import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function UserRent() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [cameras, setCameras] = useState([]);

  const handleSearch = async () => {
    const { data, error } = await supabase
      .from('cameras')
      .select('*')
      .eq('available', true);
    if (!error) setCameras(data);
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Rent a Camera</h2>
      <div className="mb-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="p-2 border"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="p-2 border"
          />
        </div>
        <button onClick={handleSearch} className="bg-blue-500 text-white px-4 py-2">
          Search Available Cameras
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cameras.map((camera) => (
          <div key={camera.id} className="border p-4 rounded shadow">
            {camera.image_url && (
              <img src={camera.image_url} alt={camera.name} className="w-full h-40 object-cover mb-4" />
            )}
            <h3 className="text-lg font-semibold">{camera.name}</h3>
            <p className="text-gray-600">{camera.description}</p>
            <p className="font-bold mt-2">${camera.price_per_day}/day</p>
            <button className="mt-4 bg-green-500 text-white px-4 py-2 rounded">
              Rent Now
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}