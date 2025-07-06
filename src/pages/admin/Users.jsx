"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabaseClient"
import { signedUrl } from "../../lib/storage" // helper that signs + resizes
import { Users, Eye, X, Search, Filter, MoreVertical, Shield, Mail, User, Calendar, ImageIcon, AlertCircle, CheckCircle, Clock, Download } from 'lucide-react'

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
  /* ─────────────────────────────
     Reactive state
     ─────────────────────────────*/
  const [users, setUsers] = useState([]) // full table list
  const [filteredUsers, setFilteredUsers] = useState([]) // filtered list
  const [modalUser, setModalUser] = useState(null) // row currently in modal
  const [imgs, setImgs] = useState({ nat: "", selfie: "" }) // signed URLs
  const [loadingImg, setLoadingImg] = useState(false) // spinner for modal
  const [loadingUsers, setLoadingUsers] = useState(true) // loading state for users
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  /* ─────────────────────────────
     Fetch users once on mount
     ─────────────────────────────*/
  useEffect(() => {
    async function fetchUsers() {
      setLoadingUsers(true)
      const { data, error } = await supabase
        .from("users")
        .select(
          "id, first_name, last_name, email, role, national_id_key, selfie_id_key, created_at, contact_number, address",
        )
        .order("created_at", { ascending: false })

      if (error) {
        console.error(error)
      } else {
        setUsers(data || [])
        setFilteredUsers(data || [])
      }
      setLoadingUsers(false)
    }
    fetchUsers()
  }, [])

  /* ─────────────────────────────
     Filter users based on search and filters
     ─────────────────────────────*/
  useEffect(() => {
    let filtered = users

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => (user.role || "user") === roleFilter)
    }

    // Status filter (based on whether they have uploaded IDs)
    if (statusFilter !== "all") {
      if (statusFilter === "verified") {
        filtered = filtered.filter((user) => user.national_id_key && user.selfie_id_key)
      } else if (statusFilter === "pending") {
        filtered = filtered.filter((user) => !user.national_id_key || !user.selfie_id_key)
      }
    }

    setFilteredUsers(filtered)
  }, [users, searchTerm, roleFilter, statusFilter])

  /* ─────────────────────────────
     Modal open → download thumbnails in parallel
     ─────────────────────────────*/
  async function openModal(user) {
    setModalUser(user) // show modal shell instantly
    setImgs({ nat: "", selfie: "" }) // clear previous URLs
    setLoadingImg(true)

    try {
      /* run both signed-URL requests concurrently */
      const promises = []
      if (user.national_id_key) {
        promises.push(signedUrl("national-ids", user.national_id_key, { width: 500 }))
      } else {
        promises.push(Promise.resolve(""))
      }

      if (user.selfie_id_key) {
        promises.push(signedUrl("selfie-ids", user.selfie_id_key, { width: 500 }))
      } else {
        promises.push(Promise.resolve(""))
      }

      const [nat, selfie] = await Promise.all(promises)
      setImgs({ nat, selfie })
    } catch (err) {
      console.error("Signed-URL error", err)
    }
    setLoadingImg(false)
  }

  /* simply hide the modal */
  const closeModal = () => setModalUser(null)

  const getUserStatus = (user) => {
    if (user.national_id_key && user.selfie_id_key) {
      return { status: "verified", label: "Verified", color: "green" }
    }
    if (user.national_id_key || user.selfie_id_key) {
      return { status: "partial", label: "Partial", color: "yellow" }
    }
    return { status: "pending", label: "Pending", color: "red" }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
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
                {users.filter((u) => u.national_id_key && u.selfie_id_key).length}
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
                {users.filter((u) => !u.national_id_key || !u.selfie_id_key).length}
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
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
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
                  const userStatus = getUserStatus(user)
                  return (
                    <tr key={user.id} className="border-t border-gray-800 hover:bg-gray-800/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                            {user.first_name?.[0]?.toUpperCase() || "U"}
                          </div>
                          <div>
                            <p className="font-medium text-white">
                              {user.first_name} {user.last_name}
                            </p>
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
                            userStatus.color === "green"
                              ? "bg-green-600/20 text-green-400 border border-green-600/30"
                              : userStatus.color === "yellow"
                                ? "bg-yellow-600/20 text-yellow-400 border border-yellow-600/30"
                                : "bg-red-600/20 text-red-400 border border-red-600/30"
                          }`}
                        >
                          {userStatus.label}
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
                {loadingImg ? (
                  <div className="grid md:grid-cols-2 gap-6">
                    <ImageSkeleton />
                    <ImageSkeleton />
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* National ID */}
                    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                      <div className="flex items-center space-x-2 mb-3">
                        <Shield className="h-4 w-4 text-blue-400" />
                        <p className="font-medium text-white">National ID</p>
                      </div>
                      {imgs.nat ? (
                        <div className="space-y-3">
                          <img
                            src={imgs.nat || "/placeholder.svg"}
                            alt="National ID"
                            className="w-full rounded-lg border border-gray-700 shadow-lg"
                            loading="lazy"
                          />
                          <button className="w-full bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2">
                            <Download className="h-4 w-4" />
                            <span>Download</span>
                          </button>
                        </div>
                      ) : (
                        <div className="aspect-[4/3] bg-gray-800 rounded-lg border-2 border-dashed border-gray-700 flex items-center justify-center">
                          <div className="text-center">
                            <AlertCircle className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                            <p className="text-gray-500 text-sm">No document uploaded</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Selfie with ID */}
                    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                      <div className="flex items-center space-x-2 mb-3">
                        <User className="h-4 w-4 text-blue-400" />
                        <p className="font-medium text-white">Selfie with ID</p>
                      </div>
                      {imgs.selfie ? (
                        <div className="space-y-3">
                          <img
                            src={imgs.selfie || "/placeholder.svg"}
                            alt="Selfie with ID"
                            className="w-full rounded-lg border border-gray-700 shadow-lg"
                            loading="lazy"
                          />
                          <button className="w-full bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2">
                            <Download className="h-4 w-4" />
                            <span>Download</span>
                          </button>
                        </div>
                      ) : (
                        <div className="aspect-[4/3] bg-gray-800 rounded-lg border-2 border-dashed border-gray-700 flex items-center justify-center">
                          <div className="text-center">
                            <AlertCircle className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                            <p className="text-gray-500 text-sm">No document uploaded</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
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
              <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center space-x-2">
                <CheckCircle className="h-4 w-4" />
                <span>Approve User</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
