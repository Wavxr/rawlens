"use client"

import { useState, useEffect } from "react"
import { insertCamera, getAllCameras, updateCamera, deleteCamera } from "../../services/cameraService"
import {
  Camera,
  Plus,
  Edit3,
  Trash2,
  Upload,
  X,
  Check,
  AlertCircle,
  DollarSign,
  FileText,
  ImageIcon,
  Search,
  Grid,
  List,
  Star,
} from "lucide-react"

export default function Cameras() {
  /* ────────────────────────────────────
     component-level state
     ────────────────────────────────────*/
  const [camera, setCamera] = useState({
    id: null,
    name: "",
    description: "",
    pricePerDay: "",
    available: true,
    image_url: "",
  })
  const [image, setImage] = useState(null) // File object selected in <input type="file">
  const [cameras, setCameras] = useState([]) // list rendered in the grid
  const [loading, setLoading] = useState(false) // disables Save button
  const [error, setError] = useState("") // shows red error text
  const [success, setSuccess] = useState(false) // shows green "Saved" text
  const [editMode, setEditMode] = useState(false) // toggles between Add and Edit headings
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState("grid") // grid or list view
  const [showForm, setShowForm] = useState(false)
  const [imagePreview, setImagePreview] = useState(null)

  /* ────────────────────────────────────
     form helpers
     ────────────────────────────────────*/
  const handleChange = (e) => setCamera({ ...camera, [e.target.name]: e.target.value })

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    setImage(file)

    // Create preview
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    } else {
      setImagePreview(null)
    }
  }

  /* ────────────────────────────────────
     fetch the camera list once on mount
     ────────────────────────────────────*/
  useEffect(() => {
    fetchCameras()
  }, [])

  /** Pull list from DB → grid */
  async function fetchCameras() {
    const { data, error } = await getAllCameras()
    if (data) setCameras(data)
    if (error) console.error(error)
  }

  /** Reset form back to its pristine "Add new camera" state */
  function resetForm() {
    setCamera({
      id: null,
      name: "",
      description: "",
      pricePerDay: "",
      available: true,
      image_url: "",
    })
    setImage(null)
    setImagePreview(null)
    setEditMode(false)
    setShowForm(false)
    setError("")
    setSuccess(false)
  }

  /* ────────────────────────────────────
     Submit handler → insert or update
     ────────────────────────────────────*/
  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess(false)

    /* basic validation */
    if (!camera.name || !camera.description || !camera.pricePerDay) {
      setError("All fields are required.")
      setLoading(false)
      return
    }

    /* decide which DB call to make */
    let result
    if (editMode) {
      result = await updateCamera(camera.id, camera, image)
    } else {
      if (!image) {
        setError("Image is required for new cameras.")
        setLoading(false)
        return
      }
      result = await insertCamera(camera, image)
    }

    /* handle result */
    if (result.error) {
      setError(result.error.message)
    } else {
      setSuccess(true)
      setTimeout(() => {
        resetForm()
        fetchCameras()
      }, 1500)
    }
    setLoading(false)
  }

  /* ────────────────────────────────────
     Edit / Delete handlers (grid actions)
     ────────────────────────────────────*/
  function handleEdit(cam) {
    /* populate form with selected row */
    setCamera({
      id: cam.id,
      name: cam.name,
      description: cam.description,
      pricePerDay: cam.price_per_day,
      available: cam.available,
      image_url: cam.image_url,
    })
    setEditMode(true)
    setShowForm(true)
    setImage(null)
    setImagePreview(cam.image_url)
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this camera? This action cannot be undone.")) return
    const { error } = await deleteCamera(id)
    if (!error) fetchCameras()
    else console.error(error.message)
  }

  // Filter cameras based on search term
  const filteredCameras = cameras.filter(
    (cam) =>
      cam.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cam.description.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  /* ────────────────────────────────────
     Render
     ────────────────────────────────────*/
  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-white">Camera Management</h1>
          <p className="text-gray-400">Manage your camera inventory and rental equipment</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 font-medium"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Camera</span>
        </button>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-4 hover:border-gray-600/50 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-gray-400 text-xs font-medium">Total Cameras</p>
              <p className="text-xl font-bold text-white">{cameras.length}</p>
              <p className="text-xs text-gray-500">In inventory</p>
            </div>
            <div className="bg-blue-600/20 p-2 rounded-lg border border-blue-600/30">
              <Camera className="h-5 w-5 text-blue-400" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-4 hover:border-gray-600/50 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-gray-400 text-xs font-medium">Available</p>
              <p className="text-xl font-bold text-green-400">{cameras.filter((cam) => cam.available).length}</p>
              <p className="text-xs text-gray-500">Ready to rent</p>
            </div>
            <div className="bg-green-600/20 p-2 rounded-lg border border-green-600/30">
              <Check className="h-5 w-5 text-green-400" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-4 hover:border-gray-600/50 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-gray-400 text-xs font-medium">Rented Out</p>
              <p className="text-xl font-bold text-orange-400">{cameras.filter((cam) => !cam.available).length}</p>
              <p className="text-xs text-gray-500">Currently in use</p>
            </div>
            <div className="bg-orange-600/20 p-2 rounded-lg border border-orange-600/30">
              <Star className="h-5 w-5 text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Search and Controls */}
      <div className="bg-gradient-to-r from-gray-900/80 to-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Enhanced Search Bar */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search cameras by name, brand, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* View Controls */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-gray-800/50 rounded-lg p-1 border border-gray-600/50">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-md transition-all duration-200 ${
                  viewMode === "grid"
                    ? "bg-blue-600 text-white shadow-lg"
                    : "text-gray-400 hover:text-white hover:bg-gray-700/50"
                }`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-md transition-all duration-200 ${
                  viewMode === "list"
                    ? "bg-blue-600 text-white shadow-lg"
                    : "text-gray-400 hover:text-white hover:bg-gray-700/50"
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Search Results Info */}
        {searchTerm && (
          <div className="mt-3 pt-3 border-t border-gray-700/50">
            <p className="text-gray-400 text-sm">
              Found <span className="text-white font-medium">{filteredCameras.length}</span> camera
              {filteredCameras.length !== 1 ? "s" : ""} matching "{searchTerm}"
            </p>
          </div>
        )}
      </div>

      {/* Enhanced Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700/50 rounded-2xl w-full max-w-3xl max-h-[95vh] overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-gray-800/80 to-gray-700/50 border-b border-gray-700/50 p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-white">{editMode ? "Edit Camera" : "Add New Camera"}</h2>
                  <p className="text-gray-400 text-sm">
                    {editMode ? "Update camera information and settings" : "Add a new camera to your rental inventory"}
                  </p>
                </div>
                <button
                  onClick={resetForm}
                  className="p-2 hover:bg-gray-700/50 rounded-lg transition-all duration-200 text-gray-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-y-auto max-h-[calc(95vh-80px)]">
              {/* Feedback Messages */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-4 flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
              {success && (
                <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg mb-4 flex items-center space-x-2">
                  <Check className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">Camera saved successfully!</span>
                </div>
              )}

              {/* Enhanced Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left Column */}
                  <div className="space-y-4">
                    {/* Camera Name */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300 flex items-center space-x-2">
                        <Camera className="h-4 w-4 text-blue-400" />
                        <span>Camera Name *</span>
                      </label>
                      <input
                        name="name"
                        value={camera.name}
                        onChange={handleChange}
                        placeholder="e.g., Canon EOS R5, Sony A7 III"
                        className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                      />
                    </div>

                    {/* Price */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300 flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-blue-400" />
                        <span>Price per Day (₱) *</span>
                      </label>
                      <input
                        name="pricePerDay"
                        value={camera.pricePerDay}
                        onChange={handleChange}
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                      />
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    {/* Description */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300 flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-blue-400" />
                        <span>Description *</span>
                      </label>
                      <textarea
                        name="description"
                        value={camera.description}
                        onChange={handleChange}
                        rows="4"
                        placeholder="Describe the camera's features, specifications, and ideal use cases..."
                        className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Image Upload */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 flex items-center space-x-2">
                    <ImageIcon className="h-4 w-4 text-blue-400" />
                    <span>Camera Image {!editMode && "*"}</span>
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="border-2 border-dashed border-gray-600/50 hover:border-blue-500/50 rounded-lg p-6 text-center transition-all duration-200 bg-gray-800/20">
                      {imagePreview ? (
                        <div className="space-y-3">
                          <img
                            src={imagePreview || "/placeholder.svg"}
                            alt="Preview"
                            className="w-24 h-24 object-cover rounded-lg mx-auto border border-gray-600/50 shadow-lg"
                          />
                          <div className="space-y-1">
                            <p className="text-gray-300 text-sm font-medium">Image selected</p>
                            <p className="text-gray-400 text-xs">Click to change image</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="w-12 h-12 bg-gray-700/50 rounded-lg flex items-center justify-center mx-auto">
                            <Upload className="h-6 w-6 text-gray-400" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-gray-300 text-sm font-medium">Upload camera image</p>
                            <p className="text-gray-400 text-xs">Click to upload or drag and drop</p>
                            <p className="text-gray-500 text-xs">PNG, JPG up to 10MB</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-700/50">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border border-gray-600/50 bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:text-white rounded-lg transition-all duration-200 text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-600/50 disabled:to-blue-700/50 text-white px-4 py-2 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <span>{editMode ? "Update Camera" : "Add Camera"}</span>
                        <Check className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Camera Grid/List */}
      {filteredCameras.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-800/50 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Camera className="h-8 w-8 text-gray-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-400 mb-2">No cameras found</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            {searchTerm ? "Try adjusting your search terms or filters" : "Add your first camera to get started"}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Add First Camera
            </button>
          )}
        </div>
      ) : (
        <div
          className={
            viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4" : "space-y-3"
          }
        >
          {filteredCameras.map((cam) => (
            <div
              key={cam.id}
              className={`group bg-gradient-to-br from-gray-900/80 to-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl overflow-hidden hover:border-gray-600/50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 ${
                viewMode === "list" ? "flex items-center p-4" : "p-0"
              }`}
            >
              {viewMode === "grid" ? (
                <>
                  <div className="relative overflow-hidden">
                    <img
                      src={cam.image_url || "/placeholder.svg"}
                      alt={cam.name}
                      className="w-full h-40 object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                    <div className="absolute top-2 right-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold border backdrop-blur-sm ${
                          cam.available
                            ? "bg-green-500/90 text-white border-green-400/50 shadow-lg"
                            : "bg-red-500/90 text-white border-red-400/50 shadow-lg"
                        }`}
                      >
                        {cam.available ? "Available" : "Rented"}
                      </span>
                    </div>
                    <div className="absolute bottom-2 left-2 right-2">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-bold text-sm bg-black/50 backdrop-blur-sm px-2 py-1 rounded-md">
                          ₱{cam.price_per_day}/day
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="space-y-1">
                      <h4 className="font-bold text-base text-white group-hover:text-blue-400 transition-colors">
                        {cam.name}
                      </h4>
                      <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed">{cam.description}</p>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => handleEdit(cam)}
                        className="flex items-center space-x-1 px-3 py-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-md transition-all duration-200 text-xs font-medium"
                      >
                        <Edit3 className="h-3 w-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(cam.id)}
                        className="p-1 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-md transition-all duration-200"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative flex-shrink-0">
                    <img
                      src={cam.image_url || "/placeholder.svg"}
                      alt={cam.name}
                      className="w-16 h-16 object-cover rounded-lg border border-gray-600/50"
                    />
                    <div className="absolute -top-1 -right-1">
                      <span
                        className={`px-1 py-0.5 rounded-full text-xs font-semibold ${
                          cam.available ? "bg-green-500 text-white" : "bg-red-500 text-white"
                        }`}
                      >
                        {cam.available ? "●" : "●"}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 ml-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="font-bold text-base text-white">{cam.name}</h4>
                        <p className="text-gray-400 text-xs line-clamp-1">{cam.description}</p>
                        <div className="flex items-center space-x-4">
                          <span className="text-blue-400 font-semibold text-sm">₱{cam.price_per_day}/day</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              cam.available
                                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                : "bg-red-500/20 text-red-400 border border-red-500/30"
                            }`}
                          >
                            {cam.available ? "Available" : "Rented"}
                          </span>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleEdit(cam)}
                          className="p-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-md transition-all duration-200"
                        >
                          <Edit3 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(cam.id)}
                          className="p-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-md transition-all duration-200"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
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
  )
}
