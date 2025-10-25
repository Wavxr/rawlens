import { useState, useEffect } from "react"
import {
  insertCamera,
  getAllCameras, 
  updateCamera,
  deleteCamera,
  duplicateCamera,
} from "../../services/cameraService"
import { 
  getAllInclusionItems, 
  getInclusionsForCamera, 
  updateCameraInclusions 
} from "../../services/inclusionService"
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
  Package,
  Tag,
  Copy,
} from "lucide-react"

export default function Cameras() {
  // Component state
  const [camera, setCamera] = useState({
    id: null,
    name: "",
    description: "",
    pricePerDay: "",
    discountedPricePerDay: "",
    image_url: "",
    serial_number: "",
    purchase_date: "",
    cost: "",
    camera_status: "available",
    camera_condition: "good"
  })
  const [image, setImage] = useState(null)
  const [cameras, setCameras] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [duplicateMode, setDuplicateMode] = useState(false)
  const [originalCameraId, setOriginalCameraId] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState("grid")
  const [showForm, setShowForm] = useState(false)
  const [imagePreview, setImagePreview] = useState(null)
  // Inclusion state
  const [allInclusionItems, setAllInclusionItems] = useState([])
  const [selectedInclusionIds, setSelectedInclusionIds] = useState([])
  const [selectedInclusionQuantities, setSelectedInclusionQuantities] = useState({})
  const [inclusionsLoading, setInclusionsLoading] = useState(false)
  const [inclusionsError, setInclusionsError] = useState("")
  // Form handlers
  const handleChange = (e) => setCamera({ ...camera, [e.target.name]: e.target.value })
  const handleImageChange = (e) => {
    const file = e.target.files[0]
    setImage(file)
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
  // Inclusion handlers
  const handleInclusionChange = (itemId) => {
    setSelectedInclusionIds((prevIds) => {
      if (prevIds.includes(itemId)) {
        const newIds = prevIds.filter((id) => id !== itemId)
        const newQuantities = { ...selectedInclusionQuantities }
        delete newQuantities[itemId]
        setSelectedInclusionQuantities(newQuantities)
        return newIds
      } else {
        setSelectedInclusionQuantities((prev) => ({
          ...prev,
          [itemId]: 1,
        }))
        return [...prevIds, itemId]
      }
    })
  }
  const handleQuantityChange = (itemId, quantity) => {
    setSelectedInclusionQuantities((prev) => ({
      ...prev,
      [itemId]: Math.max(1, quantity),
    }))
  }
  // Data fetching
  useEffect(() => {
    fetchCameras()
  }, [])
  useEffect(() => {
    if (showForm && !allInclusionItems.length && !inclusionsLoading) {
      fetchInclusionItems()
    }
  }, [showForm, inclusionsLoading, allInclusionItems.length])
  async function fetchInclusionItems() {
    setInclusionsLoading(true)
    setInclusionsError("")
    try {
      const { data, error } = await getAllInclusionItems()
      if (error) throw error
      setAllInclusionItems(data || [])
    } catch (err) {
      console.error("Error fetching inclusion items:", err)
      setInclusionsError("Failed to load inclusion items.")
      setAllInclusionItems([])
    } finally {
      setInclusionsLoading(false)
    }
  }
  async function fetchCameras() {
    setLoading(true)
    try {
      // getAllCameras now includes camera_pricing_tiers
      const { data, error } = await getAllCameras()
      if (error) throw error
      setCameras(data || [])
    } catch (err) {
      console.error("Failed to fetch cameras:", err)
      setError("Failed to load cameras.")
      setCameras([])
    } finally {
      setLoading(false)
    }
  }
  function resetForm() {
    setCamera({
      id: null,
      name: "",
      description: "",
      pricePerDay: "",
      discountedPricePerDay: "",
      image_url: "",
      serial_number: "",
      purchase_date: "",
      cost: "",
      camera_status: "available",
      camera_condition: "good"
    })
    setImage(null)
    setImagePreview(null)
    setEditMode(false)
    setDuplicateMode(false)
    setOriginalCameraId(null)
    setShowForm(false)
    setError("")
    setSuccess(false)
    setSelectedInclusionIds([])
    setSelectedInclusionQuantities({})
  }
  // Form submission
  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess(false)
    setInclusionsError("")
    if (!camera.name || !camera.description || !camera.pricePerDay || !camera.discountedPricePerDay) {
      setError("All fields are required.")
      setLoading(false)
      return
    }
    // Check for serial number requirement in duplication scenario
    if (!editMode && duplicateMode && !camera.serial_number?.trim()) {
      setError("Serial number is required for duplicating cameras.")
      setLoading(false)
      return
    }
    let result
    let cameraIdToUse = camera.id
    try {
      if (editMode) {
        result = await updateCamera(camera.id, camera, image)
        cameraIdToUse = camera.id
      } else if (duplicateMode && originalCameraId) {
        // Use duplicateCamera service for duplication
        result = await duplicateCamera(originalCameraId, camera, image)
        cameraIdToUse = result.data?.id
      } else {
        // For new cameras (not duplication), image is required
        if (!image && !camera.image_url) {
          setError("Image is required for new cameras.")
          setLoading(false)
          return
        }
        result = await insertCamera(camera, image)
        cameraIdToUse = result.data?.id
      }
      if (result.error) {
        throw result.error
      }
      // Update inclusions
      if (cameraIdToUse) {
        const inclusionDataWithQuantities = selectedInclusionIds.map((id) => ({
          inclusion_item_id: id,
          quantity: selectedInclusionQuantities[id] || 1,
        }))
        const inclusionResult = await updateCameraInclusions(cameraIdToUse, inclusionDataWithQuantities)
        if (inclusionResult.error) {
          throw new Error(`Failed to update inclusions: ${inclusionResult.error.message}`)
        }
      } else {
        console.warn("Camera ID not available for inclusion update.")
      }
      setSuccess(true)
      setTimeout(() => {
        resetForm()
        fetchCameras()
      }, 1500)
    } catch (err) {
      console.error("Error saving camera or inclusions:", err)
      setError(err.message || "Failed to save camera or inclusions.")
    } finally {
      setLoading(false)
    }
  }
  // Edit/Delete handlers
  async function handleEdit(cam) {
    // Extract pricing data directly from the camera object (which now includes camera_pricing_tiers)
    const standardTier = cam.camera_pricing_tiers?.find((t) => t.min_days === 1 && t.max_days === 3);
    const discountedTier = cam.camera_pricing_tiers?.find((t) => t.min_days === 4 && t.max_days === null);
    const cameraData = {
      id: cam.id,
      name: cam.name,
      description: cam.description,
      pricePerDay: standardTier ? standardTier.price_per_day : "",
      discountedPricePerDay: discountedTier ? discountedTier.price_per_day : "",
      image_url: cam.image_url,
      serial_number: cam.serial_number || "",
      purchase_date: cam.purchase_date ? cam.purchase_date.split('T')[0] : "",
      cost: cam.cost || "",
      camera_status: cam.camera_status || "available",
      camera_condition: cam.camera_condition || "good"
    }
    // Handle potential errors in fetching inclusions (separate from pricing)
    try {
      // Reset inclusion states
      setSelectedInclusionIds([])
      setSelectedInclusionQuantities({})
      setInclusionsError("")
      // Fetch current inclusions
      if (cam.id) {
        const { data: currentInclusionData, error: inclusionsFetchError } = await getInclusionsForCamera(cam.id)
        if (inclusionsFetchError) {
          console.error("Error fetching current inclusions for camera:", inclusionsFetchError)
          setInclusionsError("Failed to load current inclusions for this camera. You can still edit other details.")
        } else if (Array.isArray(currentInclusionData)) {
          const inclusionIds = currentInclusionData.map((item) => item.inclusion_item_id)
          const inclusionQuantities = {}
          currentInclusionData.forEach((item) => {
            inclusionQuantities[item.inclusion_item_id] = item.quantity || 1
          })
          setSelectedInclusionIds(inclusionIds)
          setSelectedInclusionQuantities(inclusionQuantities)
        } else {
          console.warn("Unexpected response format from getInclusionsForCamera:", currentInclusionData)
        }
      } else {
        console.warn("Camera ID is missing when trying to fetch inclusions for editing.")
      }
    } catch (err) {
      console.error("Unexpected error in handleEdit while fetching inclusions:", err)
      setInclusionsError("An unexpected error occurred while loading inclusions.")
    }
    setCamera(cameraData)
    setEditMode(true)
    setShowForm(true)
    setImage(null)
    setImagePreview(cam.image_url)
  }
  async function handleDuplicate(cam) {
    // Extract pricing data from the camera object
    const standardTier = cam.camera_pricing_tiers?.find((t) => t.min_days === 1 && t.max_days === 3);
    const discountedTier = cam.camera_pricing_tiers?.find((t) => t.min_days === 4 && t.max_days === null);
    // Prepare camera data for duplication (new camera, not editing)
    const duplicatedCameraData = {
      id: null, // Important: We are adding, not editing
      name: cam.name,
      description: cam.description,
      pricePerDay: standardTier ? standardTier.price_per_day : "",
      discountedPricePerDay: discountedTier ? discountedTier.price_per_day : "",
      image_url: cam.image_url, // For preview
      serial_number: "", // Clear this - must be unique for new unit
      purchase_date: cam.purchase_date ? cam.purchase_date.split('T')[0] : "",
      cost: cam.cost || "",
      camera_status: "available", // Default for new unit
      camera_condition: cam.camera_condition || "good"
    }
    // Handle potential errors in fetching inclusions (similar to handleEdit)
    try {
      // Reset inclusion states first
      setSelectedInclusionIds([])
      setSelectedInclusionQuantities({})
      setInclusionsError("")
      // Fetch current inclusions from the original camera to pre-fill
      if (cam.id) {
        const { data: currentInclusionData, error: inclusionsFetchError } = await getInclusionsForCamera(cam.id)
        if (inclusionsFetchError) {
          console.error("Error fetching current inclusions for camera duplication:", inclusionsFetchError)
          setInclusionsError("Failed to load inclusions from original camera. You can manually select them.")
        } else if (Array.isArray(currentInclusionData)) {
          const inclusionIds = currentInclusionData.map((item) => item.inclusion_item_id)
          const inclusionQuantities = {}
          currentInclusionData.forEach((item) => {
            inclusionQuantities[item.inclusion_item_id] = item.quantity || 1
          })
          setSelectedInclusionIds(inclusionIds)
          setSelectedInclusionQuantities(inclusionQuantities)
        } else {
          console.warn("Unexpected response format from getInclusionsForCamera:", currentInclusionData)
        }
      } else {
        console.warn("Camera ID is missing when trying to fetch inclusions for duplication.")
      }
    } catch (err) {
      console.error("Unexpected error in handleDuplicate while fetching inclusions:", err)
      setInclusionsError("An unexpected error occurred while loading inclusions from original camera.")
    }
    // Set form state
    setCamera(duplicatedCameraData)
    setEditMode(false) // Important: This is an "Add" operation
    setDuplicateMode(true) // Track that this is a duplication
    setOriginalCameraId(cam.id) // Store original camera ID for the duplicateCamera service call
    setShowForm(true)
    setImage(null) // Clear file state
    setImagePreview(cam.image_url) // Show original image as preview
  }
  async function handleDelete(id) {
    if (!window.confirm("Delete this camera? This action cannot be undone.")) return
    const { error } = await deleteCamera(id)
    if (!error) fetchCameras()
    else console.error(error.message)
  }
  // Filter cameras and sort by name to group similar cameras together
  const filteredCameras = cameras
    .filter(
      (cam) =>
        cam.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cam.description.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .sort((a, b) => {
      // Primary sort: by camera name (alphabetical)
      const nameComparison = a.name.localeCompare(b.name);
      if (nameComparison !== 0) return nameComparison;
      // Secondary sort: by serial number (if same name)
      if (a.serial_number && b.serial_number) {
        return a.serial_number.localeCompare(b.serial_number);
      }
      // If one has serial number and other doesn't, prioritize the one with serial number
      if (a.serial_number && !b.serial_number) return -1;
      if (!a.serial_number && b.serial_number) return 1;
      // Fallback: by creation date (newest first)
      return new Date(b.created_at) - new Date(a.created_at);
    })

  return (
    <div className="p-4 md:p-6">
      <div className="space-y-4 md:space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-bold text-white">Camera Management</h1>
            <p className="text-gray-400 text-sm md:text-base">Manage your camera inventory and rental equipment</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 font-medium text-sm md:text-base"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Camera</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-3 md:p-4 hover:border-gray-600/50 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-gray-400 text-xs font-medium">Total Cameras</p>
                <p className="text-lg md:text-xl font-bold text-white">{cameras.length}</p>
                <p className="text-xs text-gray-500 hidden md:block">In inventory</p>
              </div>
              <div className="bg-blue-600/20 p-2 rounded-lg border border-blue-600/30">
                <Camera className="h-4 w-4 md:h-5 md:w-5 text-blue-400" />
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-3 md:p-4 hover:border-gray-600/50 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-gray-400 text-xs font-medium">Available</p>
                <p className="text-lg md:text-xl font-bold text-green-400">{cameras.filter((cam) => cam.camera_status === 'available').length}</p>
                <p className="text-xs text-gray-500 hidden md:block">Ready to rent</p>
              </div>
              <div className="bg-green-600/20 p-2 rounded-lg border border-green-600/30">
                <Check className="h-4 w-4 md:h-5 md:w-5 text-green-400" />
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-3 md:p-4 hover:border-gray-600/50 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-gray-400 text-xs font-medium">In Use</p>
                <p className="text-lg md:text-xl font-bold text-orange-400">
                  {cameras.filter((cam) => ['booked', 'out'].includes(cam.camera_status)).length}
                </p>
                <p className="text-xs text-gray-500 hidden md:block">Booked or out</p>
              </div>
              <div className="bg-orange-600/20 p-2 rounded-lg border border-orange-600/30">
                <Star className="h-4 w-4 md:h-5 md:w-5 text-orange-400" />
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-3 md:p-4 hover:border-gray-600/50 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-gray-400 text-xs font-medium">Maintenance</p>
                <p className="text-lg md:text-xl font-bold text-yellow-400">
                  {cameras.filter((cam) => cam.camera_status === 'under_maintenance').length}
                </p>
                <p className="text-xs text-gray-500 hidden md:block">Under service</p>
              </div>
              <div className="bg-yellow-600/20 p-2 rounded-lg border border-yellow-600/30">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400 md:w-5 md:h-5">
                  <path d="M12 2v4"></path>
                  <path d="m16.2 7.8 2.9-2.9"></path>
                  <path d="M18 12h4"></path>
                  <path d="m16.2 16.2 2.9 2.9"></path>
                  <path d="M12 18v4"></path>
                  <path d="m4.9 19.1 2.9-2.9"></path>
                  <path d="M2 12h4"></path>
                  <path d="m4.9 4.9 2.9 2.9"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Controls */}
        <div className="bg-gradient-to-r from-gray-900/80 to-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-3 md:p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            {/* Search Bar */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search cameras..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 text-sm"
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
                  className={`p-1.5 md:p-2 rounded-md transition-all duration-200 ${
                    viewMode === "grid"
                      ? "bg-blue-600 text-white shadow-lg"
                      : "text-gray-400 hover:text-white hover:bg-gray-700/50"
                  }`}
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 md:p-2 rounded-md transition-all duration-200 ${
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

        {/* Compact Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-2 md:p-4">
            <div className="bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl border border-gray-600/30 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl shadow-black/50">
              {/* Compact Modal Header */}
              <div className="bg-gradient-to-r from-gray-800/90 to-gray-700/90 backdrop-blur-sm border-b border-gray-600/30 p-3 md:p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="p-1.5 bg-blue-600/20 rounded-lg border border-blue-500/30">
                      <Camera className="h-4 w-4 md:h-5 md:w-5 text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-base md:text-lg font-bold text-white">
                        {editMode ? "Edit Camera" : duplicateMode ? `Duplicate Camera: ${camera.name}` : "Add New Camera"}
                      </h2>
                      <p className="text-gray-400 text-xs md:text-sm">
                        {editMode ? "Update camera details" : duplicateMode ? "Create new unit from existing camera" : "Add camera to inventory"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={resetForm}
                    className="p-1.5 md:p-2 hover:bg-gray-700/50 rounded-lg transition-all duration-200 text-gray-400 hover:text-white"
                  >
                    <X className="h-4 w-4 md:h-5 md:w-5" />
                  </button>
                </div>
              </div>
              {/* Compact Modal Content */}
              <div className="p-3 md:p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
                {/* Compact Feedback Messages */}
                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded-lg mb-3 md:mb-4 flex items-center space-x-2 text-sm">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                {inclusionsError && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded-lg mb-3 md:mb-4 flex items-center space-x-2 text-sm">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{inclusionsError}</span>
                  </div>
                )}
                {success && (
                  <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-3 py-2 rounded-lg mb-3 md:mb-4 flex items-center space-x-2 text-sm">
                    <Check className="h-4 w-4 flex-shrink-0" />
                    <span>Camera saved successfully!</span>
                  </div>
                )}
                {/* Compact Form */}
                <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
                  {/* Basic Info & Pricing in Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    {/* Left Column - Basic Info */}
                    <div className="space-y-3 md:space-y-4">
                      <div className="bg-gray-800/30 border border-gray-700/40 rounded-xl p-3 md:p-4">
                        <h3 className="text-sm font-semibold text-white mb-2 md:mb-3 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-400" />
                          Basic Information
                        </h3>
                        <div className="space-y-2 md:space-y-3">
                          <div>
                            <label className="text-xs font-medium text-gray-300 mb-1 block">Camera Name *</label>
                            <input
                              name="name"
                              value={camera.name}
                              onChange={handleChange}
                              placeholder="e.g., Canon EOS R5"
                              className="w-full px-2.5 py-1.5 md:px-3 md:py-2 bg-gray-800/60 border border-gray-600/40 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-sm"
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                            <div>
                              <label className="text-xs font-medium text-gray-300 mb-1 block">
                                Serial Number {!editMode && duplicateMode ? "*" : ""}
                                {!editMode && duplicateMode && (
                                  <span className="text-orange-400 ml-1">(Required)</span>
                                )}
                              </label>
                              <input
                                name="serial_number"
                                value={camera.serial_number}
                                onChange={handleChange}
                                placeholder="e.g., SN12345678"
                                className="w-full px-2.5 py-1.5 md:px-3 md:py-2 bg-gray-800/60 border border-gray-600/40 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-300 mb-1 block">Purchase Date</label>
                              <input
                                type="date"
                                name="purchase_date"
                                value={camera.purchase_date}
                                onChange={handleChange}
                                className="w-full px-2.5 py-1.5 md:px-3 md:py-2 bg-gray-800/60 border border-gray-600/40 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-sm"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-300 mb-1 block">Description *</label>
                            <textarea
                              name="description"
                              value={camera.description}
                              onChange={handleChange}
                              rows="2"
                              placeholder="Camera features and specifications..."
                              className="w-full px-2.5 py-1.5 md:px-3 md:py-2 bg-gray-800/60 border border-gray-600/40 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-sm resize-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Right Column - Pricing */}
                    <div className="space-y-3 md:space-y-4">
                      <div className="bg-gray-800/30 border border-gray-700/40 rounded-xl p-3 md:p-4">
                        <h3 className="text-sm font-semibold text-white mb-2 md:mb-3 flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-400" />
                          Pricing & Status
                        </h3>
                        <div className="space-y-2 md:space-y-3">
                          <div>
                            <label className="text-xs font-medium text-gray-300 mb-1 flex items-center gap-1">
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                              Standard (1-3 days) *
                            </label>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                                ₱
                              </span>
                              <input
                                name="pricePerDay"
                                value={camera.pricePerDay}
                                onChange={handleChange}
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                className="w-full pl-6 pr-2.5 py-1.5 md:pl-7 md:pr-3 md:py-2 bg-gray-800/60 border border-gray-600/40 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-sm"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-300 mb-1 flex items-center gap-1">
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                              Discounted (4+ days) *
                            </label>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                                ₱
                              </span>
                              <input
                                name="discountedPricePerDay"
                                value={camera.discountedPricePerDay}
                                onChange={handleChange}
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                className="w-full pl-6 pr-2.5 py-1.5 md:pl-7 md:pr-3 md:py-2 bg-gray-800/60 border border-gray-600/40 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-green-500/50 text-sm"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                            <div>
                              <label className="text-xs font-medium text-gray-300 mb-1 block">Cost (₱)</label>
                              <input
                                type="number"
                                name="cost"
                                value={camera.cost}
                                onChange={handleChange}
                                step="0.01"
                                placeholder="0.00"
                                className="w-full px-2.5 py-1.5 md:px-3 md:py-2 bg-gray-800/60 border border-gray-600/40 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-300 mb-1 block">Status</label>
                              <select
                                name="camera_status"
                                value={camera.camera_status}
                                onChange={handleChange}
                                className="w-full px-2.5 py-1.5 md:px-3 md:py-2 bg-gray-800/60 border border-gray-600/40 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-sm"
                              >
                                <option value="available">Available</option>
                                <option value="booked">Booked</option>
                                <option value="out">Out</option>
                                <option value="under_maintenance">Under Maintenance</option>
                                <option value="retired">Retired</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-300 mb-1 block">Condition</label>
                            <select
                              name="camera_condition"
                              value={camera.camera_condition}
                              onChange={handleChange}
                              className="w-full px-2.5 py-1.5 md:px-3 md:py-2 bg-gray-800/60 border border-gray-600/40 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-sm"
                            >
                              <option value="excellent">Excellent</option>
                              <option value="good">Good</option>
                              <option value="fair">Fair</option>
                              <option value="poor">Poor</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Compact Inclusions Section */}
                  <div className="bg-gray-800/30 border border-gray-700/40 rounded-xl p-3 md:p-4">
                    <h3 className="text-sm font-semibold text-white mb-2 md:mb-3 flex items-center gap-2">
                      <Package className="h-4 w-4 text-purple-400" />
                      Included Items
                      {selectedInclusionIds.length > 0 && (
                        <span className="bg-purple-600/20 text-purple-300 px-1.5 py-0.5 rounded-full text-xs">
                          {selectedInclusionIds.length} selected
                        </span>
                      )}
                    </h3>
                    {inclusionsLoading ? (
                      <div className="flex justify-center items-center py-3">
                        <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                        <span className="text-gray-400 text-sm">Loading items...</span>
                      </div>
                    ) : inclusionsError ? (
                      <div className="text-center py-3 text-gray-400 text-sm">
                        <AlertCircle className="h-4 w-4 mx-auto mb-1 text-red-400" />
                        Unable to load items
                      </div>
                    ) : allInclusionItems.length === 0 ? (
                      <div className="text-center py-3 text-gray-400 text-sm">
                        <Package className="h-4 w-4 mx-auto mb-1" />
                        No items available.{" "}
                        <a href="/admin/inclusions" className="text-blue-400 hover:underline">
                          Create some first.
                        </a>
                      </div>
                    ) : (
                      <div className="max-h-32 md:max-h-40 overflow-y-auto bg-gray-800/40 rounded-lg border border-gray-700/30">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 p-1.5 md:p-2">
                          {allInclusionItems.map((item) => {
                            const isSelected = selectedInclusionIds.includes(item.id)
                            return (
                              <div
                                key={item.id}
                                className={`flex items-center justify-between p-1.5 md:p-2 rounded-md border transition-all duration-200 ${
                                  isSelected
                                    ? "bg-blue-500/10 border-blue-500/30"
                                    : "bg-gray-700/20 border-gray-600/20 hover:bg-gray-700/40"
                                }`}
                              >
                                <label className="flex items-center space-x-1.5 cursor-pointer flex-1 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleInclusionChange(item.id)}
                                    className="w-3 h-3 text-blue-500 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-1"
                                  />
                                  <Tag className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                  <span className="text-xs text-gray-200 truncate">{item.name}</span>
                                </label>
                                {isSelected && (
                                  <input
                                    type="number"
                                    min="1"
                                    value={selectedInclusionQuantities[item.id] || 1}
                                    onChange={(e) => handleQuantityChange(item.id, Number.parseInt(e.target.value) || 1)}
                                    className="w-10 md:w-12 px-1 py-0.5 bg-gray-700/60 border border-gray-600/40 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ml-1.5"
                                  />
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Compact Image Upload */}
                  <div className="bg-gray-800/30 border border-gray-700/40 rounded-xl p-3 md:p-4">
                    <h3 className="text-sm font-semibold text-white mb-2 md:mb-3 flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-orange-400" />
                      Camera Image {!editMode && "*"}
                    </h3>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="border-2 border-dashed border-gray-600/50 hover:border-blue-500/50 rounded-lg p-3 text-center transition-all duration-200 bg-gray-800/20 hover:bg-gray-800/40">
                        {imagePreview ? (
                          <div className="flex items-center space-x-2 md:space-x-3">
                            <img
                              src={imagePreview || "/placeholder.svg"}
                              alt="Preview"
                              className="w-12 h-12 md:w-16 md:h-16 object-cover rounded-lg border border-gray-600/50"
                            />
                            <div className="text-left">
                              <p className="text-gray-200 text-xs md:text-sm font-medium">Image selected</p>
                              <p className="text-gray-400 text-xs">Click to change</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center space-x-2 md:space-x-3">
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-gray-700/50 rounded-lg flex items-center justify-center">
                              <Upload className="h-4 w-4 md:h-5 md:w-5 text-gray-400" />
                            </div>
                            <div className="text-left">
                              <p className="text-gray-200 text-xs md:text-sm font-medium">Upload image</p>
                              <p className="text-gray-400 text-xs">PNG, JPG up to 10MB</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Compact Form Actions */}
                  <div className="flex justify-end space-x-2 md:space-x-3 pt-3 md:pt-4 border-t border-gray-600/30">
                    <button
                      type="button"
                      onClick={resetForm}
                      disabled={loading}
                      className="px-3 py-1.5 md:px-4 md:py-2 border border-gray-600/50 bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:text-white rounded-lg transition-all duration-200 text-sm font-medium disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-600/50 disabled:to-blue-700/50 text-white px-4 py-1.5 md:px-6 md:py-2 rounded-lg transition-all duration-200 flex items-center justify-center space-x-1.5 md:space-x-2 text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
                    >
                      {loading ? (
                        <div className="w-3 h-3 md:w-4 md:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <span>{editMode ? "Update" : "Add Camera"}</span>
                          <Check className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Camera Grid/List */}
        {filteredCameras.length === 0 ? (
          <div className="text-center py-8 md:py-12">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-800/50 rounded-xl flex items-center justify-center mx-auto mb-3 md:mb-4">
              <Camera className="h-6 w-6 md:h-8 md:w-8 text-gray-600" />
            </div>
            <h3 className="text-base md:text-lg font-semibold text-gray-400 mb-1 md:mb-2">No cameras found</h3>
            <p className="text-gray-500 text-sm md:text-base max-w-md mx-auto">
              {searchTerm ? "Try adjusting your search terms or filters" : "Add your first camera to get started"}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowForm(true)}
                className="mt-3 md:mt-4 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg transition-colors text-sm md:text-base"
              >
                Add First Camera
              </button>
            )}
          </div>
        ) : (
          <div
            className={`pb-20 md:pb-0 ${
              viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4" : "space-y-2 md:space-y-3"
            }`}
          >
            {filteredCameras.map((cam) => {
              // Extract pricing directly from the included camera_pricing_tiers array
              const standardPriceTier = cam.camera_pricing_tiers?.find(
                (tier) => tier.min_days === 1 && tier.max_days === 3,
              )
              const displayPrice = standardPriceTier ? standardPriceTier.price_per_day : "N/A"
              return (
                <div
                  key={cam.id}
                  className={`group bg-gradient-to-br from-gray-900/80 to-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl overflow-hidden hover:border-gray-600/50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 ${
                    viewMode === "list" ? "flex items-center p-2 md:p-3" : "p-0"
                  }`}
                >
                  {viewMode === "grid" ? (
                    <>
                      <div className="relative overflow-hidden h-48">
                        <img
                          src={cam.image_url || "/placeholder.svg"}
                          alt={cam.name}
                          className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                        <div className="absolute top-1.5 right-1.5 md:top-2 md:right-2">
                          <span
                            className={`px-1.5 py-0.5 md:px-2 md:py-1 rounded-full text-[10px] md:text-xs font-semibold border backdrop-blur-sm ${
                              cam.camera_status === 'available'
                                ? "bg-green-500/90 text-white border-green-400/50 shadow-lg"
                                : cam.camera_status === 'under_maintenance'
                                ? "bg-yellow-500/90 text-white border-yellow-400/50 shadow-lg"
                                : cam.camera_status === 'retired'
                                ? "bg-gray-500/90 text-white border-gray-400/50 shadow-lg"
                                : "bg-blue-500/90 text-white border-blue-400/50 shadow-lg"
                            }`}
                          >
                            {cam.camera_status === 'available' ? 'Available' : 
                            cam.camera_status === 'booked' ? 'Booked' : 
                            cam.camera_status === 'out' ? 'Out' : 
                            cam.camera_status === 'under_maintenance' ? 'Maintenance' : 'Retired'}
                          </span>
                        </div>
                        <div className="absolute bottom-1.5 left-1.5 right-1.5 md:bottom-2 md:left-2 md:right-2">
                          <div className="flex items-center justify-between">
                            <span className="text-white font-bold text-xs md:text-sm bg-black/50 backdrop-blur-sm px-1.5 py-0.5 md:px-2 md:py-1 rounded-md">
                              ₱{displayPrice}/day
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="p-2.5 md:p-4 space-y-2 md:space-y-3">
                        <div className="space-y-1">
                          <h4 className="font-bold text-sm md:text-base text-white group-hover:text-blue-400 transition-colors">
                            {cam.name}
                          </h4>
                          <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed">{cam.description}</p>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center space-x-1 md:space-x-2">
                            <button
                              onClick={() => handleEdit(cam)}
                              className="flex items-center space-x-1 px-2 py-1 md:px-3 md:py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-md transition-all duration-200 text-xs font-medium"
                            >
                              <Edit3 className="h-3 w-3" />
                              <span className="hidden md:inline">Edit</span>
                            </button>
                            <button
                              onClick={() => handleDuplicate(cam)}
                              className="flex items-center space-x-1 px-2 py-1 md:px-3 md:py-1.5 bg-gray-600/20 text-gray-400 hover:bg-gray-600/30 rounded-md transition-all duration-200 text-xs font-medium"
                            >
                              <Copy className="h-3 w-3" />
                              <span className="hidden md:inline">Duplicate</span>
                            </button>
                          </div>
                          <button
                            onClick={() => handleDelete(cam.id)}
                            className="p-1 md:p-1.5 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-md transition-all duration-200"
                          >
                            <Trash2 className="h-3 w-3 md:h-3.5 md:w-3.5" />
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
                          className="w-12 h-12 md:w-16 md:h-16 object-cover rounded-lg border border-gray-600/50"
                        />
                        <div className="absolute -top-0.5 -right-0.5 md:-top-1 md:-right-1">
                          <span
                            className={`px-0.5 py-0.5 md:px-1 md:py-0.5 rounded-full text-[8px] md:text-xs font-semibold ${
                              cam.available ? "bg-green-500 text-white" : "bg-red-500 text-white"
                            }`}
                          >
                            {cam.available ? "●" : "●"}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 ml-2 md:ml-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h4 className="font-bold text-sm md:text-base text-white">{cam.name}</h4>
                            <p className="text-gray-400 text-xs line-clamp-1">{cam.description}</p>
                            <div className="flex items-center space-x-2 md:space-x-4">
                              <span className="text-blue-400 font-semibold text-xs md:text-sm">₱{displayPrice}/day</span>
                              <span
                                className={`px-1.5 py-0.5 md:px-2 md:py-0.5 rounded-full text-[10px] md:text-xs font-medium ${
                                  cam.camera_status === 'available'
                                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                    : cam.camera_status === 'under_maintenance'
                                    ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                                    : cam.camera_status === 'retired'
                                    ? "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                                    : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                }`}
                              >
                                {cam.camera_status === 'available' ? 'Available' : 
                                cam.camera_status === 'booked' ? 'Booked' : 
                                cam.camera_status === 'out' ? 'Out' : 
                                cam.camera_status === 'under_maintenance' ? 'Maintenance' : 'Retired'}
                              </span>
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleEdit(cam)}
                              className="p-1.5 md:p-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-md transition-all duration-200"
                            >
                              <Edit3 className="h-3 w-3 md:h-3.5 md:w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDuplicate(cam)}
                              className="p-1.5 md:p-2 bg-gray-600/20 text-gray-400 hover:bg-gray-600/30 rounded-md transition-all duration-200"
                            >
                              <Copy className="h-3 w-3 md:h-3.5 md:w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(cam.id)}
                              className="p-1.5 md:p-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-md transition-all duration-200"
                            >
                              <Trash2 className="h-3 w-3 md:h-3.5 md:w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>    
  )
}