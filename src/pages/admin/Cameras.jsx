import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function AdminCameras() {
  const [cameras, setCameras] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price_per_day: '',
    image_url: '',
  });

  // Fetch all cameras
  useEffect(() => {
    const fetchCameras = async () => {
      const { data, error } = await supabase.from('cameras').select('*');
      if (!error) setCameras(data);
    };
    fetchCameras();
  }, []);

  // Add new camera
  const handleAdd = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase.from('cameras').insert([formData]);
    if (!error) {
      setCameras([...cameras, data[0]]);
      setFormData({ name: '', description: '', price_per_day: '', image_url: '' });
    }
  };

  // Delete camera
  const handleDelete = async (id) => {
    await supabase.from('cameras').delete().eq('id', id);
    setCameras(cameras.filter((camera) => camera.id !== id));
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Manage Cameras</h2>
      
      {/* Add Form */}
      <form onSubmit={handleAdd} className="mb-6 space-y-2">
        <input
          name="name"
          placeholder="Camera Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full p-2 border"
        />
        <input
          name="description"
          placeholder="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full p-2 border"
        />
        <input
          name="price_per_day"
          placeholder="Price per Day"
          type="number"
          value={formData.price_per_day}
          onChange={(e) => setFormData({ ...formData, price_per_day: e.target.value })}
          className="w-full p-2 border"
        />
        <input
          name="image_url"
          placeholder="Image URL"
          value={formData.image_url}
          onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
          className="w-full p-2 border"
        />
        <button type="submit" className="bg-green-500 text-white px-4 py-2">
          Add Camera
        </button>
      </form>

      {/* List Cameras */}
      <div className="space-y-4">
        {cameras.map((camera) => (
          <div key={camera.id} className="flex justify-between items-center p-4 border">
            <span>{camera.name}</span>
            <button
              onClick={() => handleDelete(camera.id)}
              className="text-red-500"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}