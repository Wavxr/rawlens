import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';

const CameraDetails = ({ camera, isMobile = false }) => {
  const [activeTab, setActiveTab] = useState("description");
  const [inclusions, setInclusions] = useState([]);
  const [loadingInclusions, setLoadingInclusions] = useState(false);

  // Fetch inclusions when camera changes
  useEffect(() => {
    if (!camera?.id) return;

    const fetchInclusions = async () => {
      setLoadingInclusions(true);
      const { data, error } = await supabase
        .from("camera_inclusions")
        .select("quantity, inclusion_items:inclusion_items(name)")
        .eq("camera_id", camera.id);

      if (error) {
        console.error("Error fetching inclusions:", error);
        setInclusions([]);
      } else {
        setInclusions(data || []);
      }

      setLoadingInclusions(false);
    };

    fetchInclusions();
  }, [camera?.id]);

  if (isMobile) {
    return (
      <div className="mb-5">
        {/* Tabs (Description & Inclusions) */}
        <div className="flex border-b border-gray-200 mb-3">
          <button
            onClick={() => setActiveTab("description")}
            className={`flex-1 py-2 text-center text-sm font-medium ${
              activeTab === "description"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            aria-selected={activeTab === "description"}
          >
            Description
          </button>
          <button
            onClick={() => setActiveTab("inclusions")}
            className={`flex-1 py-2 text-center text-sm font-medium ${
              activeTab === "inclusions"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            aria-selected={activeTab === "inclusions"}
          >
            Inclusions
          </button>
        </div>

        {/* Description Tab */}
        {activeTab === "description" && (
          <div>
            <p className="text-gray-600 text-sm leading-relaxed">
              {camera?.description || (
                <span className="text-gray-400">No description available</span>
              )}
            </p>
          </div>
        )}

        {/* Inclusions Tab */}
        {activeTab === "inclusions" && (
          <div>
            {loadingInclusions ? (
              <div className="flex items-center text-gray-500 text-sm">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading inclusions...
              </div>
            ) : inclusions.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
                {inclusions.map((inclusion, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span className="text-gray-700 text-sm">
                      {inclusion.inclusion_items?.name}
                      {inclusion.quantity > 1 ? ` (x${inclusion.quantity})` : ""}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No specific inclusions listed</p>
            )}
          </div>
        )}
      </div>
    );
  }

  // Desktop version - just inclusions
  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Inclusions</h3>
      {loadingInclusions ? (
        <div className="flex items-center text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Loading inclusions...
        </div>
      ) : inclusions.length > 0 ? (
        <div className="space-y-2">
          {inclusions.map((inclusion, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
              <span className="text-gray-700">
                {inclusion.inclusion_items?.name}
                {inclusion.quantity > 1 ? ` (x${inclusion.quantity})` : ""}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No specific inclusions listed</p>
      )}
    </div>
  );
};

export default CameraDetails;
