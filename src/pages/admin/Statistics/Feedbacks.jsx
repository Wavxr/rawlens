import { useEffect, useState } from "react";
import { getAllFeedbacks } from "../../../services/feedbackService";
import { Star, MessageCircle, Camera, User, Mail, Filter } from "lucide-react";

export default function Feedbacks() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("");
  const [uniqueCameras, setUniqueCameras] = useState([]);

  useEffect(() => {
    async function fetchFeedbacks() {
      try {
        const data = await getAllFeedbacks();
        setFeedbacks(data);
        
        const cameras = [...new Set(
          data
            .map(f => f.rentals?.cameras?.name)
            .filter(name => name)
        )].sort();
        setUniqueCameras(cameras);
      } catch (err) {
        console.error("Failed to load feedbacks:", err.message);
        setError("Could not fetch feedbacks");
      } finally {
        setLoading(false);
      }
    }
    fetchFeedbacks();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const filteredFeedbacks = filter 
    ? feedbacks.filter(f => f.rentals?.cameras?.name === filter)
    : feedbacks;

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <div className="h-8 bg-gray-700 rounded-lg w-1/3 animate-pulse"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-5 space-y-4 shadow-lg"
            >
              <div className="flex justify-between items-start">
                <div className="h-4 bg-gray-700 rounded w-1/3 animate-pulse"></div>
                <div className="h-4 bg-gray-700 rounded w-1/4 animate-pulse"></div>
              </div>
              <div className="space-y-3">
                <div className="h-3 bg-gray-700 rounded w-full animate-pulse"></div>
                <div className="h-3 bg-gray-700 rounded w-5/6 animate-pulse"></div>
              </div>
              <div className="flex items-center pt-2">
                <div className="h-8 w-8 rounded-full bg-gray-700 animate-pulse"></div>
                <div className="ml-3 h-3 bg-gray-700 rounded w-1/2 animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5">
          <div className="flex items-center">
            <MessageCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-red-400">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-7">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Customer Feedback
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          Insights from customer experiences
        </p>
      </div>

      <div className="mb-6 flex items-center flex-wrap gap-3">
        <div className="flex items-center bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-2">
          <Filter className="h-4 w-4 text-gray-400 mr-2" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-transparent text-white border-none focus:ring-0 text-sm"
          >
            <option value="">All Cameras</option>
            {uniqueCameras.map((camera) => (
              <option key={camera} value={camera} className="bg-gray-800 text-white">
                {camera}
              </option>
            ))}
          </select>
        </div>
        
        {filter && (
          <button
            onClick={() => setFilter("")}
            className="text-xs bg-gray-700/50 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            Clear
          </button>
        )}
        
        <div className="text-sm text-gray-500">
          {filteredFeedbacks.length} feedbacks
        </div>
      </div>

      {filteredFeedbacks.length === 0 ? (
        <div className="text-center py-16">
          <MessageCircle className="mx-auto h-16 w-16 text-gray-600" />
          <h3 className="mt-4 text-lg font-medium text-gray-300">
            {filter ? `No feedback for ${filter}` : "No feedback yet"}
          </h3>
          <p className="mt-2 text-gray-500 text-sm">
            {filter 
              ? "No feedback entries for this camera." 
              : "Customers haven't submitted feedback yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredFeedbacks.map((f) => {
            const rental = f.rentals;
            const camera = rental?.cameras;
            const user = rental?.users;

            return (
              <div
                key={f.id}
                className="bg-gray-800/40 border border-gray-700/50 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-1"
              >
                <div className="bg-gradient-to-r from-purple-600/15 to-blue-600/15 p-4 border-b border-gray-700/30">
                  <div className="flex items-center">
                    <div className="bg-purple-500/20 p-2 rounded-lg">
                      <Camera className="h-5 w-5 text-purple-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="font-bold text-white truncate max-w-[180px]">
                        {camera?.name || "Unknown Camera"}
                      </h3>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-xs text-gray-500 font-medium">
                      {formatDate(f.created_at)}
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center mb-3">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-5 w-5 ${i < f.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-600"}`}
                          />
                        ))}
                      </div>
                      <span className="text-white font-bold ml-2 text-lg">
                        {f.rating}
                      </span>
                      <span className="text-gray-500 text-sm ml-1">/5</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="bg-gray-900/40 rounded-xl p-4">
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {f.feedback || (
                          <span className="text-gray-500 italic">No feedback provided</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-700/20">
                    <div className="flex items-center">
                      <div className="bg-green-500/10 p-2 rounded-lg">
                        <User className="h-4 w-4 text-green-400" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-semibold text-white">
                          {user
                            ? `${user.first_name} ${user.last_name}`
                            : "Anonymous"}
                        </p>
                        <div className="flex items-center text-gray-400 text-xs mt-1">
                          <Mail className="h-3 w-3 mr-1" />
                          <span className="truncate max-w-[140px]">
                            {user?.email || "No email"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}