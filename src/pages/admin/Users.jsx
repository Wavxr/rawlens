import { useEffect, useState } from "react"
import { getSignedUrl } from "../../services/storageService"
import { getUsers } from "../../services/userService"
import { adminUpdateVerificationStatus } from "../../services/verificationService"
import {
  Users, Eye, X, Search, Filter, MoreVertical, Shield, Mail, User, Calendar,
  ImageIcon, AlertCircle, CheckCircle, Clock, Download, AlertTriangle
} from 'lucide-react'

// Appeal status badge component
function AppealBadge() {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 ml-2">
      <AlertTriangle className="h-3 w-3 mr-1" />
      Appealing
    </span>
  )
}

// Skeleton component for loading states
const UserRowSkeleton = () => (
  <tr className="border-t border-gray-800">
    <td className="p-4">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gray-800 rounded-full animate-pulse"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-800 rounded w-32 animate-pulse"></div>
          <div className="h-3 bg-gray-800 rounded w-24 animate-pulse"></div>
        </div>
      </div>
    </td>
    <td className="p-4">
      <div className="h-4 bg-gray-800 rounded w-48 animate-pulse"></div>
    </td>
    <td className="p-4">
      <div className="h-6 bg-gray-800 rounded-full w-16 animate-pulse"></div>
    </td>
    <td className="p-4">
      <div className="h-4 bg-gray-800 rounded w-20 animate-pulse"></div>
    </td>
    <td className="p-4">
      <div className="h-8 bg-gray-800 rounded w-20 animate-pulse"></div>
    </td>
  </tr>
)

const ImageSkeleton = () => (
  <div className="space-y-3">
    <div className="h-4 bg-gray-800 rounded w-24 animate-pulse"></div>
    <div className="aspect-[4/3] bg-gray-800 rounded-lg animate-pulse flex items-center justify-center">
      <ImageIcon className="h-8 w-8 text-gray-600" />
    </div>
  </div>
)

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [modalUser, setModalUser] = useState(null)
  const [imgs, setImgs] = useState({ nat: "", selfie: "", video: "", natLoaded: false, selfieLoaded: false, videoLoaded: false })
  const [loadingImg, setLoadingImg] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [appealFilter, setAppealFilter] = useState(false) // New state for appeal filter

  useEffect(() => {
    async function loadUsers() {
      setLoadingUsers(true)
      try {
        const data = await getUsers()
        setUsers(data)
        setFilteredUsers(data)
      } catch (error) {
        console.error("Failed to fetch users:", error)
      }
      setLoadingUsers(false)
    }

    loadUsers()
  }, [])

  useEffect(() => {
    let filtered = users

    if (searchTerm) {
      filtered = filtered.filter((user) =>
        `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => (user.role || "user") === roleFilter)
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((user) => user.verification_status === statusFilter)
    }

    // Filter for users who are appealing
    if (appealFilter) {
      filtered = filtered.filter((user) => user.is_appealing === true)
    }

    setFilteredUsers(filtered)
  }, [users, searchTerm, roleFilter, statusFilter, appealFilter]) // Add appealFilter to dependencies

    async function openModal(user) {
      setModalUser(user)

      setImgs({
        nat: "", selfie: "", video: "", natLoaded: false, selfieLoaded: false, videoLoaded: false
      })

      try {
        const [nat, selfie, video] = await Promise.all([
          user.government_id_key
            ? getSignedUrl("government-ids", user.government_id_key, { transform: { width: 500 } })
            : Promise.resolve(""),
          user.selfie_id_key
            ? getSignedUrl("selfie-ids", user.selfie_id_key, { transform: { width: 500 } })
            : Promise.resolve(""),
          user.verification_video_key
            ? getSignedUrl("verification-videos", user.verification_video_key)
            : Promise.resolve(""),
        ]);      

        setImgs({
          nat,
          selfie,
          video,
          natLoaded: false,
          selfieLoaded: false,
          videoLoaded: false,
        })
      } catch (err) {
        console.error("Signed-URL error", err)
      }
    }



  const closeModal = () => setModalUser(null)

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  async function handleUpdateStatus(newStatus) {
    try {
      await adminUpdateVerificationStatus(modalUser.id, newStatus)
      const updated = users.map((u) =>
        u.id === modalUser.id ? { ...u, verification_status: newStatus } : u
      )
      setUsers(updated)
      setModalUser(null)
    } catch (err) {
      console.error("Failed to update verification status:", err)
      alert("Failed to update status.")
    }
  }



  /* ─────────────────────────────
     Render
     ─────────────────────────────*/
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">User Management</h1>
          <p className="text-gray-400 mt-1">Manage user accounts and verify identity documents</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Users</p>
              <p className="text-2xl font-bold text-white">{users.length}</p>
            </div>
            <div className="bg-blue-600/20 p-3 rounded-lg">
              <Users className="h-6 w-6 text-blue-400" />
            </div>
          </div>
        </div>
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Verified</p>
              <p className="text-2xl font-bold text-green-400">
                {users.filter((u) => u.verification_status === "verified").length}
              </p>
            </div>
            <div className="bg-green-600/20 p-3 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-400" />
            </div>
          </div>
        </div>
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Pending</p>
              <p className="text-2xl font-bold text-yellow-400">
                {users.filter((u) => u.verification_status === "pending").length}
              </p>
            </div>
            <div className="bg-yellow-600/20 p-3 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-400" />
            </div>
          </div>
        </div>
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Admins</p>
              <p className="text-2xl font-bold text-purple-400">{users.filter((u) => u.role === "admin").length}</p>
            </div>
            <div className="bg-purple-600/20 p-3 rounded-lg">
              <Shield className="h-6 w-6 text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Roles</option>
                <option value="user">Users</option>
                <option value="admin">Admins</option>
              </select>
            </div>
            <button
              onClick={() => setAppealFilter(!appealFilter)}
              className={`inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium ${
                appealFilter 
                  ? 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30' 
                  : 'bg-gray-800/50 text-gray-300 border-gray-700 hover:bg-gray-700/50'
              }`}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              {appealFilter ? 'Hide Appeals' : 'Show Appeals'}
            </button>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-800/50">
                <th className="text-left p-4 text-gray-300 font-medium">User</th>
                <th className="text-left p-4 text-gray-300 font-medium">Email</th>
                <th className="text-left p-4 text-gray-300 font-medium">Role</th>
                <th className="text-left p-4 text-gray-300 font-medium">Status</th>
                <th className="text-left p-4 text-gray-300 font-medium">Joined</th>
                <th className="text-left p-4 text-gray-300 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingUsers ? (
                // Skeleton loading rows
                Array.from({ length: 5 }).map((_, index) => <UserRowSkeleton key={index} />)
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12">
                    <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-400 mb-2">No users found</h3>
                    <p className="text-gray-500">
                      {searchTerm || roleFilter !== "all" || statusFilter !== "all"
                        ? "Try adjusting your search or filters"
                        : "No users have registered yet"}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const statusColor = {
                    verified: "bg-green-600/20 text-green-400 border border-green-600/30",
                    pending: "bg-yellow-600/20 text-yellow-400 border border-yellow-600/30",
                    rejected: "bg-red-600/20 text-red-400 border border-red-600/30",
                  }
                  return (
                    <tr key={user.id} className="border-t border-gray-800 hover:bg-gray-800/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                            {user.first_name?.[0]?.toUpperCase() || "U"}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-100 flex items-center">
                              {user.first_name} {user.last_name}
                              {user.is_appealing && <AppealBadge />}
                            </div>
                            <p className="text-sm text-gray-400">{user.contact_number || "No phone"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-300">{user.email}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            user.role === "admin"
                              ? "bg-purple-600/20 text-purple-400 border border-purple-600/30"
                              : "bg-gray-600/20 text-gray-400 border border-gray-600/30"
                          }`}
                        >
                          {user.role || "user"}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            statusColor[user.verification_status] || "bg-gray-700 text-gray-300 border border-gray-600/30"
                          }`}
                        >
                          {user.verification_status?.charAt(0).toUpperCase() + user.verification_status?.slice(1) || "Unknown"}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-400 text-sm">{formatDate(user.created_at)}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openModal(user)}
                            className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 px-3 py-2 rounded-lg transition-colors flex items-center space-x-2 text-sm"
                          >
                            <Eye className="h-4 w-4" />
                            <span>View IDs</span>
                          </button>
                          <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium text-lg">
                  {modalUser.first_name?.[0]?.toUpperCase() || "U"}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">
                    {modalUser.first_name} {modalUser.last_name}
                  </h3>
                  <p className="text-gray-400">{modalUser.email}</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* User Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white mb-4">User Information</h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-400">Name:</span>
                      <span className="text-white">
                        {modalUser.first_name} {modalUser.last_name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-400">Email:</span>
                      <span className="text-white">{modalUser.email}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Shield className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-400">Role:</span>
                      <span className="text-white">{modalUser.role || "user"}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-400">Joined:</span>
                      <span className="text-white">{formatDate(modalUser.created_at)}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white mb-4">Contact Information</h4>
                  <div className="space-y-3">
                    <div>
                      <span className="text-gray-400">Phone:</span>
                      <span className="text-white ml-2">{modalUser.contact_number || "Not provided"}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Address:</span>
                      <span className="text-white ml-2">{modalUser.address || "Not provided"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ID Documents */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Identity Documents</h4>
                <div className="grid md:grid-cols-2 gap-6 mb-6">

                  {/* National ID */}
                  <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                    <div className="flex items-center space-x-2 mb-3">
                      <Shield className="h-4 w-4 text-blue-400" />
                      <p className="font-medium text-white">National ID</p>
                    </div>

                    {!imgs.nat ? (
                      <div className="aspect-[4/3] bg-gray-800 rounded-lg border-2 border-dashed border-gray-700 flex items-center justify-center">
                        <div className="text-center">
                          <AlertCircle className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                          <p className="text-gray-500 text-sm">No document uploaded</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 relative">
                        {!imgs.natLoaded && <ImageSkeleton />}
                        <img
                          src={imgs.nat}
                          alt="National ID"
                          className={`w-full rounded-lg border border-gray-700 shadow-lg transition-opacity duration-300 ${
                            imgs.natLoaded ? "opacity-100" : "opacity-0 absolute top-0 left-0"
                          }`}
                          onLoad={() => setImgs((prev) => ({ ...prev, natLoaded: true }))}
                        />
                        {imgs.natLoaded && (
                          <button className="w-full bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2">
                            <Download className="h-4 w-4" />
                            <span>Download</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Selfie with ID */}
                  <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                    <div className="flex items-center space-x-2 mb-3">
                      <User className="h-4 w-4 text-blue-400" />
                      <p className="font-medium text-white">Selfie with ID</p>
                    </div>

                    {!imgs.selfie ? (
                      <div className="aspect-[4/3] bg-gray-800 rounded-lg border-2 border-dashed border-gray-700 flex items-center justify-center">
                        <div className="text-center">
                          <AlertCircle className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                          <p className="text-gray-500 text-sm">No document uploaded</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 relative">
                        {!imgs.selfieLoaded && <ImageSkeleton />}
                        <img
                          src={imgs.selfie}
                          alt="Selfie with ID"
                          className={`w-full rounded-lg border border-gray-700 shadow-lg transition-opacity duration-300 ${
                            imgs.selfieLoaded ? "opacity-100" : "opacity-0 absolute top-0 left-0"
                          }`}
                          onLoad={() => setImgs((prev) => ({ ...prev, selfieLoaded: true }))}
                        />
                        {imgs.selfieLoaded && (
                          <button className="w-full bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2">
                            <Download className="h-4 w-4" />
                            <span>Download</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                </div>

                {/* Verification Video */}
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                  <div className="flex items-center space-x-2 mb-3">
                    <ImageIcon className="h-4 w-4 text-blue-400" />
                    <p className="font-medium text-white">Verification Video</p>
                  </div>
                  {!imgs.video ? (
                    <div className="aspect-video bg-gray-800 rounded-lg border-2 border-dashed border-gray-700 flex items-center justify-center">
                      <div className="text-center">
                        <AlertCircle className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">No video uploaded</p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      {!imgs.videoLoaded && <div className="aspect-video bg-gray-800 rounded-lg animate-pulse"></div>}
                      <video
                        src={imgs.video}
                        controls
                        className={`w-full rounded-lg border border-gray-700 shadow-lg transition-opacity duration-300 ${
                          imgs.videoLoaded ? "opacity-100" : "opacity-0 absolute top-0 left-0"
                        }`}
                        onLoadedData={() => setImgs((prev) => ({ ...prev, videoLoaded: true }))}
                      />
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="flex justify-end space-x-4 p-6 border-t border-gray-800">
              <button
                onClick={closeModal}
                className="px-6 py-3 border border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
              >
                Close
              </button>

              {modalUser?.verification_status !== "verified" && (
                <>
                  <button
                    onClick={() => handleUpdateStatus("verified")}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Approve</span>
                  </button>

                  <button
                    onClick={() => handleUpdateStatus("rejected")}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <X className="h-4 w-4" />
                    <span>Reject</span>
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
