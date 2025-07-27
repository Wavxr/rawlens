"use client"
import { useState, useEffect } from "react"
import {
  getAllInclusionItems,
  createInclusionItem,
  updateInclusionItem,
  deleteInclusionItem,
} from "../../services/inclusionService"
import {
  Package,
  Plus,
  Edit3,
  Trash2,
  X,
  Check,
  AlertCircle,
  Search,
  PackageOpen, // For empty state
} from "lucide-react"

export default function Inclusions() {
  /* ────────────────────────────────────
     component-level state
     ────────────────────────────────────*/
  const [inclusion, setInclusion] = useState({ id: null, name: "" }) // For the inline form
  const [inclusions, setInclusions] = useState([])
  const [filteredInclusions, setFilteredInclusions] = useState([])
  const [loading, setLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [editMode, setEditMode] = useState(false) // For inline editing
  const [searchTerm, setSearchTerm] = useState("")
  const [showAddForm, setShowAddForm] = useState(false) // Toggle for the add/edit form visibility

  /* ────────────────────────────────────
     form helpers
     ────────────────────────────────────*/
  const handleChange = (e) => setInclusion({ ...inclusion, [e.target.name]: e.target.value })

  const resetForm = () => {
    setInclusion({ id: null, name: "" })
    setEditMode(false)
    setError("")
    setSuccess(false)
  }

  /* ────────────────────────────────────
     fetch the inclusion list once on mount
     ────────────────────────────────────*/
  useEffect(() => {
    fetchInclusions()
  }, [])

  useEffect(() => {
    // Simple client-side filtering
    let filtered = inclusions;
    if (searchTerm) {
      filtered = inclusions.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
        // Add description filter here if needed
        // || (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    setFilteredInclusions(filtered);
  }, [inclusions, searchTerm]);

  /** Pull list from DB */
  async function fetchInclusions() {
    setListLoading(true);
    setError("");
    try {
      const { data, error } = await getAllInclusionItems()
      if (error) throw error;
      setInclusions(data || [])
    } catch (err) {
      console.error("Failed to fetch inclusions:", err)
      setError("Failed to load inclusions.")
      setInclusions([])
    } finally {
       setListLoading(false);
    }
  }

  /* ────────────────────────────────────
     Submit handler → insert or update
     ────────────────────────────────────*/
  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess(false)

    if (!inclusion.name.trim()) {
      setError("Name is required.")
      setLoading(false)
      return
    }

    try {
      let result;
      if (editMode) {
        // For editing, we need to pass the ID and updated data
        result = await updateInclusionItem(inclusion.id, { name: inclusion.name })
      } else {
        // For creating, we pass the new item data
        result = await createInclusionItem({ name: inclusion.name })
      }

      if (result.error) {
        throw result.error;
      } else {
        setSuccess(true)
        resetForm()
        setShowAddForm(false) // Hide the form after successful creation/update
        fetchInclusions() // Refresh the list
      }
    } catch (err) {
      console.error("Error saving inclusion:", err);
      setError(err.message || "Failed to save inclusion item.");
    } finally {
      setLoading(false);
    }
  }

  /* ────────────────────────────────────
     Edit / Delete handlers
     ────────────────────────────────────*/
  function handleEdit(item) {
    setInclusion({ id: item.id, name: item.name })
    setEditMode(true)
    setShowAddForm(true) // Show the form for editing
    // Scroll to the form if it's off-screen (optional)
    document.getElementById('inclusion-form')?.scrollIntoView({ behavior: 'smooth' });
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this inclusion item? This action cannot be undone.")) return
    try {
      const { error } = await deleteInclusionItem(id)
      if (error) throw error;
      fetchInclusions()
    } catch (err) {
      console.error("Failed to delete inclusion:", err)
      alert("Failed to delete inclusion item: " + err.message)
    }
  }

  /* ────────────────────────────────────
     Render
     ────────────────────────────────────*/
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Inclusion Items</h1>
          <p className="text-gray-400 mt-1">Manage items included with camera rentals</p>
        </div>
        {/* Add New Item Button - Always Visible */}
        <button
          onClick={() => { setShowAddForm(!showAddForm); if (showAddForm) resetForm(); }} // Reset form if closing
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 font-medium"
        >
          <Plus className="h-4 w-4" />
          <span>{showAddForm ? "Cancel" : "Add New Item"}</span>
        </button>
      </div>

      {/* Stats Card */}
      <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-4">
        <div className="flex items-center">
          <div className="bg-blue-600/20 p-2 rounded-lg border border-blue-600/30 mr-3">
            <Package className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <p className="text-gray-400 text-sm">Total Items</p>
            <p className="text-xl font-bold text-white">{inclusions.length}</p>
          </div>
        </div>
      </div>

      {/* Search Bar - Always Visible */}
      <div className="bg-gradient-to-r from-gray-900/80 to-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search items by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
            disabled={listLoading}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors"
              disabled={listLoading}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Add/Edit Form (conditionally rendered below stats/search) */}
      {showAddForm && (
        <div id="inclusion-form" className="bg-gradient-to-br from-gray-900/80 to-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-4">
          <h2 className="text-lg font-semibold text-white mb-4">
            {editMode ? "Edit Inclusion Item" : "Add New Inclusion Item"}
          </h2>
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded-lg mb-3 text-sm flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-3 py-2 rounded-lg mb-3 text-sm flex items-center space-x-2">
              <Check className="h-4 w-4 flex-shrink-0" />
              <span>Inclusion item saved successfully!</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="itemName" className="block text-sm font-medium text-gray-300 mb-1">
                Item Name *
              </label>
              <input
                type="text"
                id="itemName"
                name="name"
                value={inclusion.name}
                onChange={handleChange}
                placeholder="e.g., Camera Bag, 64GB SD Card"
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                autoFocus // Focus the input when the form appears
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => { setShowAddForm(false); resetForm(); }}
                disabled={loading}
                className="px-3 py-1.5 border border-gray-600/50 bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:text-white rounded-lg transition-all duration-200 text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-600/50 disabled:to-blue-700/50 text-white px-3 py-1.5 rounded-lg transition-all duration-200 flex items-center justify-center space-x-1 text-sm font-medium shadow disabled:shadow-none"
              >
                {loading ? (
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>{editMode ? "Update" : "Add"}</span>
                    <Check className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Inclusions List/Table */}
      <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-800/50 text-gray-300 text-sm">
                <th className="text-left p-3 font-medium">Item Name</th>
                {/* <th className="text-left p-3 font-medium">Description</th>  Add if description column is used */}
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {listLoading ? (
                <tr>
                  <td colSpan="2" className="text-center py-6">
                    <div className="flex justify-center items-center space-x-2">
                       <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                       <span className="text-gray-400">Loading items...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredInclusions.length === 0 ? (
                <tr>
                  <td colSpan="2" className="text-center py-12">
                    <PackageOpen className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-400 mb-1">
                      {searchTerm ? "No items found" : "No inclusion items yet"}
                    </h3>
                    <p className="text-gray-500">
                      {searchTerm
                        ? "Try adjusting your search term."
                        : "Get started by adding a new inclusion item."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredInclusions.map((item) => (
                  <tr key={item.id} className="border-t border-gray-800 hover:bg-gray-800/30 transition-colors">
                    <td className="p-3 text-white">{item.name}</td>
                    {/* <td className="p-3 text-gray-400 text-sm">{item.description || "-"}</td> Add if description is used */}
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-600/20 rounded transition-colors"
                          aria-label="Edit"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-600/20 rounded transition-colors"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}