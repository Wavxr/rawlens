"use client"

import { useEffect, useState } from "react"
import { getAllCamerasWithPricing } from "../../services/cameraService"
import { getCameraWithInclusions } from "../../services/inclusionService"
import { Camera, Package, Clock, Search, Grid, List, X, Tag } from "lucide-react"

export default function UserCameras() {
  const [cameras, setCameras] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState("grid")

  useEffect(() => {
    const fetchCameras = async () => {
      try {
        setLoading(true)

        // First get all cameras with pricing
        const { data: camerasWithPricing, error: pricingError } = await getAllCamerasWithPricing()

        if (pricingError) {
          throw new Error(pricingError.message)
        }

        // For each camera, get the inclusion details
        const camerasWithFullData = await Promise.all(
          (camerasWithPricing || []).map(async (camera) => {
            const { data: cameraWithInclusions, error: inclusionsError } = await getCameraWithInclusions(camera.id)

            if (inclusionsError) {
              console.warn(`Failed to fetch inclusions for camera ${camera.id}:`, inclusionsError)
              return { ...camera, inclusions: [] }
            }

            return {
              ...camera,
              inclusions: cameraWithInclusions?.camera_inclusions || [],
            }
          }),
        )

        setCameras(camerasWithFullData)
      } catch (err) {
        console.error("Error fetching cameras:", err)
        setError("Failed to load cameras. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchCameras()
  }, [])

  // Filter cameras based on search term
  const filteredCameras = cameras.filter(
    (camera) =>
      camera.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      camera.description.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-pulse mx-auto mb-4"></div>
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-1 left-1/2 transform -translate-x-1/2"></div>
              </div>
              <p className="text-slate-600 font-medium text-sm">Loading cameras...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-red-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Camera className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Unable to Load Cameras</h3>
            <p className="text-red-600 max-w-md mx-auto text-base">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-4">
            Camera Collection
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Explore our curated selection of professional cameras with detailed specifications and pricing information
          </p>
        </div>

        {/* Search and Controls */}
        <div className="bg-white/70 backdrop-blur-2xl rounded-2xl border border-white/20 shadow-xl shadow-blue-500/10 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Bar */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search cameras by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-slate-50/50 border border-slate-200/50 rounded-xl text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300 text-base"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* View Controls */}
            <div className="flex items-center bg-slate-100/80 rounded-xl p-1.5 border border-slate-200/50">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-all duration-300 ${
                  viewMode === "grid"
                    ? "bg-white shadow-md text-blue-600 scale-105"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                }`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg transition-all duration-300 ${
                  viewMode === "list"
                    ? "bg-white shadow-md text-blue-600 scale-105"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Search Results Info */}
          {searchTerm && (
            <div className="mt-4 pt-4 border-t border-slate-200/50">
              <p className="text-slate-600 text-base">
                Found <span className="font-bold text-slate-900">{filteredCameras.length}</span> camera
                {filteredCameras.length !== 1 ? "s" : ""} matching "
                <span className="font-semibold text-blue-600">{searchTerm}</span>"
              </p>
            </div>
          )}
        </div>

        {/* Camera Grid/List */}
        {filteredCameras.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Camera className="h-10 w-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">No cameras found</h3>
            <p className="text-slate-600 max-w-md mx-auto text-base">
              {searchTerm
                ? "Try adjusting your search terms to find what you're looking for"
                : "Our camera collection will be available soon"}
            </p>
          </div>
        ) : (
          <div
            className={`pb-20 md:pb-0 ${
              viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6" : "space-y-4"
            }`}
          >
            {filteredCameras.map((camera) => (
              <div
                key={camera.id}
                className={`group bg-white/80 backdrop-blur-2xl border border-white/30 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-500 hover:scale-[1.01] ${
                  viewMode === "list" ? "flex items-start p-6" : ""
                }`}
              >
                {viewMode === "grid" ? (
                  <>
                    {/* Image */}
                    <div className="relative overflow-hidden aspect-[4/3]">
                      {camera.image_url ? (
                        <img
                          src={camera.image_url || "/placeholder.svg"}
                          alt={camera.name}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 flex items-center justify-center">
                          <Camera className="h-12 w-12 text-slate-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <div className="mb-4">
                        <h3 className="font-bold text-lg text-slate-900 group-hover:text-blue-600 transition-colors duration-300 mb-2">
                          {camera.name}
                        </h3>
                        <p className="text-slate-600 text-sm line-clamp-3 leading-relaxed">{camera.description}</p>
                      </div>

                      {/* Pricing */}
                      {camera.camera_pricing_tiers && camera.camera_pricing_tiers.length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center space-x-2 mb-3">
                            <div className="p-1.5 bg-blue-100 rounded-lg">
                              <Clock className="h-4 w-4 text-blue-600" />
                            </div>
                            <h4 className="font-bold text-slate-900 text-sm">Pricing Tiers</h4>
                          </div>
                          <div className="space-y-2">
                            {camera.camera_pricing_tiers.map((tier) => (
                              <div
                                key={tier.id}
                                className="flex justify-between items-center p-2 bg-slate-50/80 rounded-lg border border-slate-200/50"
                              >
                                <span className="text-slate-700 text-sm font-medium">
                                  {tier.min_days} {tier.max_days ? `- ${tier.max_days}` : "+"} days
                                </span>
                                <span className="font-bold text-base text-blue-600">
                                  ₱{tier.price_per_day.toFixed(2)}/day
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Inclusions */}
                      <div>
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="p-1.5 bg-emerald-100 rounded-lg">
                            <Package className="h-4 w-4 text-emerald-600" />
                          </div>
                          <h4 className="font-bold text-slate-900 text-sm">What's Included</h4>
                        </div>
                        {camera.inclusions && camera.inclusions.length > 0 ? (
                          <div className="space-y-1">
                            {camera.inclusions.map((inclusion, index) => (
                              <div
                                key={`${inclusion.inclusion_item_id}-${index}`}
                                className="flex items-center p-2 bg-emerald-50/80 rounded-lg border border-emerald-200/50"
                              >
                                <div className="p-0.5 bg-emerald-500 rounded-full mr-2">
                                  <Tag className="h-3 w-3 text-white" />
                                </div>
                                <span className="text-slate-700 text-sm font-medium">
                                  {inclusion.inclusion_items?.name}
                                  {inclusion.quantity > 1 && (
                                    <span className="ml-2 px-1.5 py-0.5 bg-emerald-200 text-emerald-800 rounded-full text-xs font-bold">
                                      x{inclusion.quantity}
                                    </span>
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200/50 text-center">
                            <p className="text-slate-500 text-sm font-medium">No additional items included</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* List View */}
                    <div className="relative flex-shrink-0 w-32 h-24 rounded-xl overflow-hidden">
                      {camera.image_url ? (
                        <img
                          src={camera.image_url || "/placeholder.svg"}
                          alt={camera.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 flex items-center justify-center">
                          <Camera className="h-6 w-6 text-slate-400" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 ml-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 pr-4">
                          <h3 className="font-bold text-xl text-slate-900 mb-2">{camera.name}</h3>
                          <p className="text-slate-600 text-sm mb-4 line-clamp-2 leading-relaxed">
                            {camera.description}
                          </p>

                          {/* Pricing in List View */}
                          {camera.camera_pricing_tiers && camera.camera_pricing_tiers.length > 0 && (
                            <div className="mb-3">
                              <div className="flex items-center space-x-4 text-sm">
                                {camera.camera_pricing_tiers.slice(0, 2).map((tier) => (
                                  <div key={tier.id} className="flex items-center space-x-2">
                                    <Clock className="h-3 w-3 text-blue-600" />
                                    <span className="text-blue-600 font-bold text-base">
                                      ₱{tier.price_per_day.toFixed(2)}/day
                                    </span>
                                    <span className="text-slate-500 text-xs">
                                      ({tier.min_days}
                                      {tier.max_days ? `-${tier.max_days}` : "+"} days)
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Inclusions in List View */}
                          {camera.inclusions && camera.inclusions.length > 0 && (
                            <div className="flex items-center space-x-2 text-xs text-slate-500">
                              <div className="p-1 bg-emerald-100 rounded-md">
                                <Package className="h-3 w-3 text-emerald-600" />
                              </div>
                              <span>
                                Includes {camera.inclusions.length} item{camera.inclusions.length !== 1 ? "s" : ""}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
