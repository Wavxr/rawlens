// src/pages/user/Cameras.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate for navigation
import { getAllCameras } from '../../services/cameraService';
import { getCameraWithInclusions } from '../../services/inclusionService'; // Import for inclusion items

export default function UserCameras() {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate(); // Initialize navigate hook

  useEffect(() => {
    const fetchCameras = async () => {
      try {
        setLoading(true);
        
        // First get all cameras with pricing
        const { data: camerasWithPricing, error: pricingError } = await getAllCameras ();
        
        if (pricingError) {
          throw new Error(pricingError.message);
        }
        
        // For each camera, get the inclusion details
        const camerasWithFullData = await Promise.all(
          (camerasWithPricing || []).map(async (camera) => {
            const { data: cameraWithInclusions, error: inclusionsError } = await getCameraWithInclusions(camera.id);
            
            if (inclusionsError) {
              console.warn(`Failed to fetch inclusions for camera ${camera.id}:`, inclusionsError);
              return { ...camera, inclusions: [] };
            }
            
            return {
              ...camera,
              inclusions: cameraWithInclusions?.camera_inclusions || []
            };
          })
        );
        
        setCameras(camerasWithFullData);
      } catch (err) {
        console.error('Error fetching cameras:', err);
        setError('Failed to load cameras. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCameras();
  }, []);

  // Handler for the Rent button click
  const handleRentClick = (cameraId) => {
    // Navigate to the Rent page, passing the camera ID as a query parameter
    navigate(`/user/rent?cameraId=${cameraId}`);
  };

  if (loading) {
    return <div>Loading cameras...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Available Cameras</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cameras.map((camera) => (
          <div key={camera.id} className="border p-4 rounded shadow">
            {camera.image_url && (
              <img 
                src={camera.image_url} 
                alt={camera.name} 
                className="w-full h-40 object-cover mb-4" 
              />
            )}
            <h3 className="text-lg font-semibold">{camera.name}</h3>
            <p className="text-gray-600 mb-3">{camera.description}</p>
            
            <div className="mt-4">
              <h4 className="font-medium mb-2">Pricing:</h4>
              <ul className="space-y-1">
                {camera.camera_pricing_tiers?.map((tier) => (
                  <li key={tier.id} className="flex justify-between text-sm">
                    <span>
                      {tier.min_days} {tier.max_days ? `- ${tier.max_days}` : '+'} days:
                    </span>
                    <span className="font-medium">₱{tier.price_per_day.toFixed(2)}/day</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="mt-4">
              <h4 className="font-medium mb-2">Includes:</h4>
              {camera.inclusions && camera.inclusions.length > 0 ? (
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {camera.inclusions.map((inclusion) => (
                    <li key={`${inclusion.inclusion_item_id}-${inclusion.inclusion_items?.id}`}>
                      {inclusion.inclusion_items?.name}
                      {inclusion.quantity > 1 ? ` (x${inclusion.quantity})` : ''}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-sm">No inclusions specified</p>
              )}
            </div>

            {/* --- Added Rent Button --- */}
            <button
              className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              onClick={() => handleRentClick(camera.id)} // Call handler with camera ID
            >
              Rent Now
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}