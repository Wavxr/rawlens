import { useState, useEffect, useMemo, useCallback } from "react"
import {
  Search,
  User,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  AlertTriangle,
  Eye,
  X,
  FileText,
  Video,
  Image as ImageIcon,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Shield,
  Loader2,
  Trash2,
} from "lucide-react"
import { getUsers, deleteUser } from "../../services/userService"
import { adminUpdateVerificationStatus } from "../../services/verificationService"
import { getSignedUrl } from "../../services/storageService"
import { subscribeToAllUsers, unsubscribeFromChannel } from "../../services/realtimeService"
import useIsMobile from "../../hooks/useIsMobile"
import useBackHandler from "../../hooks/useBackHandler"

export default function Users() {
  const isMobile = useIsMobile(768)

  // State management
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [verificationFilter, setVerificationFilter] = useState("all")
  const [showAppeals, setShowAppeals] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)

  // Fetch users on mount
  useEffect(() => {
    fetchUsers()
  }, [])

  // Real-time subscription
  useEffect(() => {
    const channel = subscribeToAllUsers(() => {
      // Silently refetch when users change
      fetchUsers(true)
    })

    return () => {
      unsubscribeFromChannel(channel)
    }
  }, [])

  async function fetchUsers(silent = false) {
    if (!silent) setLoading(true)
    setError("")

    try {
      const data = await getUsers()
      setUsers(data || [])
    } catch (err) {
      console.error("Failed to fetch users:", err)
      setError("Failed to load users. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Filter and search logic
  const filteredUsers = useMemo(() => {
    let result = users

    // Search by name or email
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (user) =>
          `${user.first_name} ${user.last_name}`.toLowerCase().includes(term) ||
          user.email?.toLowerCase().includes(term)
      )
    }

    // Role filter
    if (roleFilter !== "all") {
      result = result.filter((user) => user.role === roleFilter)
    }

    // Verification status filter
    if (verificationFilter !== "all") {
      result = result.filter((user) => user.verification_status === verificationFilter)
    }

    // Show appeals toggle
    if (showAppeals) {
      result = result.filter((user) => user.is_appealing === true)
    }

    return result
  }, [users, searchTerm, roleFilter, verificationFilter, showAppeals])

  // View user details
  function handleViewUser(user) {
    setSelectedUser(user)
    setIsModalOpen(true)
  }

  // Close modal
  function closeModal() {
    setIsModalOpen(false)
    setTimeout(() => setSelectedUser(null), 300)
  }

  function openDeleteConfirm(user) {
    setSelectedUser(user);
    setIsDeleteConfirmOpen(true);
  }

  function closeDeleteConfirm() {
    setIsDeleteConfirmOpen(false);
    setTimeout(() => setSelectedUser(null), 300);
  }

  // Back handler for mobile
  useBackHandler(isModalOpen || isDeleteConfirmOpen, () => {
    if (isModalOpen) closeModal();
    if (isDeleteConfirmOpen) closeDeleteConfirm();
  }, 100);

  // Approve verification
  async function handleApprove() {
    if (!selectedUser) return

    setActionLoading(true)
    try {
      await adminUpdateVerificationStatus(selectedUser.id, "verified")
      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id
            ? { ...u, verification_status: "verified", is_appealing: false }
            : u
        )
      )
      setSelectedUser((prev) => ({ ...prev, verification_status: "verified", is_appealing: false }))
    } catch (err) {
      console.error("Failed to approve verification:", err)
      alert("Failed to approve verification. Please try again.")
    } finally {
      setActionLoading(false)
    }
  }

  // Reject verification
  async function handleReject() {
    if (!selectedUser) return

    setActionLoading(true)
    try {
      await adminUpdateVerificationStatus(selectedUser.id, "rejected")
      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id
            ? { ...u, verification_status: "rejected", is_appealing: false }
            : u
        )
      )
      setSelectedUser((prev) => ({ ...prev, verification_status: "rejected", is_appealing: false }))
    } catch (err) {
      console.error("Failed to reject verification:", err)
      alert("Failed to reject verification. Please try again.")
    } finally {
      setActionLoading(false)
    }
  }

  // Delete user
  async function handleDeleteUser() {
    if (!selectedUser) return;

    setActionLoading(true);
    try {
      await deleteUser(selectedUser.id);
      setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
      closeDeleteConfirm();
    } catch (err) {
      console.error("Failed to delete user:", err);
      alert("Failed to delete user. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-white mb-1">User Management</h1>
            <p className="text-sm text-gray-400">View and manage all users and verification requests</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-gray-300">
              {filteredUsers.length} {filteredUsers.length === 1 ? "user" : "users"}
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600 transition-colors"
            />
          </div>

          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Role Filter */}
            <div className="flex-1">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600 transition-colors"
              >
                <option value="all">All Roles</option>
                <option value="user">Users</option>
                <option value="admin">Admins</option>
              </select>
            </div>

            {/* Verification Status Filter */}
            <div className="flex-1">
              <select
                value={verificationFilter}
                onChange={(e) => setVerificationFilter(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600 transition-colors"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Show Appeals Toggle */}
            <button
              onClick={() => setShowAppeals(!showAppeals)}
              className={`px-4 py-2.5 rounded text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap border ${
                showAppeals
                  ? "bg-orange-900 border-orange-700 text-orange-300"
                  : "bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700"
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              Appeals Only
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={() => fetchUsers()} />
        ) : filteredUsers.length === 0 ? (
          <EmptyState searchTerm={searchTerm} />
        ) : isMobile ? (
          <UserCardList users={filteredUsers} onView={handleViewUser} onDelete={openDeleteConfirm} />
        ) : (
          <UserTable users={filteredUsers} onView={handleViewUser} onDelete={openDeleteConfirm} />
        )}
      </div>

      {/* User Details Modal */}
      {isModalOpen && selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={closeModal}
          onApprove={handleApprove}
          onReject={handleReject}
          actionLoading={actionLoading}
          isMobile={isMobile}
          onDelete={() => {
            closeModal();
            openDeleteConfirm(selectedUser);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && selectedUser && (
        <DeleteConfirmModal
          user={selectedUser}
          onClose={closeDeleteConfirm}
          onConfirm={handleDeleteUser}
          loading={actionLoading}
        />
      )}
    </div>
  )
}

// Loading skeleton component
function LoadingState() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="bg-gray-800 border border-gray-700 rounded p-4 animate-pulse"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-700 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-700 rounded w-1/3" />
              <div className="h-3 bg-gray-700 rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Error state component
function ErrorState({ message, onRetry }) {
  return (
    <div className="bg-gray-800 border border-red-900 rounded p-8 text-center">
      <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
      <p className="text-red-400 mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
      >
        Retry
      </button>
    </div>
  )
}

// Empty state component
function EmptyState({ searchTerm }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded p-12 text-center">
      <User className="w-16 h-16 text-gray-600 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-300 mb-2">
        {searchTerm ? "No users found" : "No users yet"}
      </h3>
      <p className="text-gray-500 text-sm">
        {searchTerm
          ? "Try adjusting your search or filters"
          : "Users will appear here once they sign up"}
      </p>
    </div>
  )
}

// Mobile card list view
function UserCardList({ users, onView, onDelete }) {
  return (
    <div className="space-y-3">
      {users.map((user) => (
        <UserCard key={user.id} user={user} onView={onView} onDelete={onDelete} />
      ))}
    </div>
  )
}

// Individual user card for mobile
function UserCard({ user, onView, onDelete }) {
  const initials = `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase()
  const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Unknown User"
  const joinDate = new Date(user.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  return (
    <div className="bg-gray-800 border border-gray-700 rounded p-4 hover:bg-gray-750 transition-colors">
      <div className="flex items-start gap-3 mb-3">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-gray-700 border border-gray-600 flex items-center justify-center text-gray-300 font-medium text-sm flex-shrink-0">
          {initials || "?"}
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-medium text-white truncate">{fullName}</h3>
            {user.is_appealing && (
              <span className="px-1.5 py-0.5 bg-orange-900 border border-orange-700 rounded text-orange-300 text-xs font-medium flex-shrink-0">
                Appeal
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 truncate">{user.email}</p>
        </div>
      </div>

      {/* Badges Row */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <RoleBadge role={user.role} />
        <VerificationBadge status={user.verification_status} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-700">
        <span className="text-xs text-gray-500">Joined {joinDate}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onDelete(user)}
            className="px-3 py-1.5 bg-red-900/50 hover:bg-red-900 border border-red-800 text-red-300 rounded text-sm font-medium transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onView(user)}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-300 rounded text-sm font-medium transition-colors flex items-center gap-1.5"
          >
            <Eye className="w-4 h-4" />
            View
          </button>
        </div>
      </div>
    </div>
  )
}

// Desktop table view
function UserTable({ users, onView, onDelete }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700 bg-gray-900">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                User
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                Email
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                Role
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                Joined
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {users.map((user) => (
              <UserTableRow key={user.id} user={user} onView={onView} onDelete={onDelete} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Individual table row
function UserTableRow({ user, onView, onDelete }) {
  const initials = `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase()
  const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Unknown User"
  const joinDate = new Date(user.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  return (
    <tr className="hover:bg-gray-750 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-700 border border-gray-600 flex items-center justify-center text-gray-300 font-medium text-sm flex-shrink-0">
            {initials || "?"}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-white truncate">{fullName}</span>
              {user.is_appealing && (
                <span className="px-1.5 py-0.5 bg-orange-900 border border-orange-700 rounded text-orange-300 text-xs font-medium flex-shrink-0">
                  Appeal
                </span>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-gray-400">{user.email}</span>
      </td>
      <td className="px-4 py-3">
        <RoleBadge role={user.role} />
      </td>
      <td className="px-4 py-3">
        <VerificationBadge status={user.verification_status} />
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-gray-400">{joinDate}</span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => onView(user)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-300 rounded text-sm font-medium transition-colors"
          >
            <Eye className="w-4 h-4" />
            View
          </button>
          <button
            onClick={() => onDelete(user)}
            className="p-2 bg-red-900/50 hover:bg-red-900 border border-red-800 text-red-300 rounded transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}

// Role badge component
function RoleBadge({ role }) {
  const isAdmin = role === "admin"
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${
        isAdmin
          ? "bg-purple-900 border-purple-700 text-purple-300"
          : "bg-gray-700 border-gray-600 text-gray-300"
      }`}
    >
      {isAdmin && <Shield className="w-3 h-3" />}
      {role === "admin" ? "Admin" : "User"}
    </span>
  )
}

// Verification status badge component
function VerificationBadge({ status }) {
  const config = {
    verified: {
      icon: CheckCircle,
      text: "Verified",
      className: "bg-green-900 border border-green-700 text-green-300",
    },
    pending: {
      icon: Clock,
      text: "Pending",
      className: "bg-yellow-900 border border-yellow-700 text-yellow-300",
    },
    rejected: {
      icon: XCircle,
      text: "Rejected",
      className: "bg-red-900 border border-red-700 text-red-300",
    },
    deleted: {
      icon: Trash2,
      text: "Deleted",
      className: "bg-gray-700 border border-gray-600 text-gray-400",
    }
  }

  const statusConfig = config[status] || config.pending
  const Icon = statusConfig.icon

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${statusConfig.className}`}>
      <Icon className="w-3 h-3" />
      {statusConfig.text}
    </span>
  )
}

// User details modal
function UserDetailsModal({ user, onClose, onApprove, onReject, actionLoading, isMobile, onDelete }) {
  const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Unknown User"
  const joinDate = new Date(user.created_at).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className={`relative bg-gray-800 border-gray-700 w-full max-h-[90vh] overflow-y-auto ${
          isMobile
            ? "rounded-t-2xl border-t border-x"
            : "rounded border sm:max-w-3xl"
        }`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-4 sm:px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-semibold text-white">{fullName}</h2>
            <p className="text-sm text-gray-400 mt-0.5">{user.email}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-700 transition-colors text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 py-6 space-y-6">
          {/* User Info Section */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
              User Information
            </h3>
            <div className="bg-gray-900 border border-gray-700 rounded p-4 space-y-3">
              <InfoRow icon={Calendar} label="Joined" value={joinDate} />
              <InfoRow icon={Mail} label="Email" value={user.email} />
              {user.contact_number && (
                <InfoRow icon={Phone} label="Phone" value={user.contact_number} />
              )}
              {user.address && (
                <InfoRow icon={MapPin} label="Address" value={user.address} />
              )}
              <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                <span className="text-sm text-gray-400">Role</span>
                <RoleBadge role={user.role} />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                <span className="text-sm text-gray-400">Verification Status</span>
                <VerificationBadge status={user.verification_status} />
              </div>
              {user.is_appealing && (
                <div className="flex items-center gap-2 pt-2 border-t border-gray-700 text-orange-300">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">User has submitted an appeal</span>
                </div>
              )}
            </div>
          </div>

          {/* Verification Documents Section */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
              Verification Documents
            </h3>
            <div className="space-y-3">
              <DocumentPreview
                icon={FileText}
                label="Government ID"
                storageKey={user.government_id_key}
                bucket="government-ids"
                type="image"
              />
              <DocumentPreview
                icon={ImageIcon}
                label="Selfie with ID"
                storageKey={user.selfie_id_key}
                bucket="selfie-ids"
                type="image"
              />
              <DocumentPreview
                icon={Video}
                label="Verification Video"
                storageKey={user.verification_video_key}
                bucket="verification-videos"
                type="video"
              />
            </div>
          </div>

          {/* Actions Section */}
          <div className="pt-4 border-t border-gray-700 space-y-3">
            {user.verification_status === "pending" || user.is_appealing ? (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={onReject}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-3 bg-red-900 hover:bg-red-800 border border-red-700 text-red-200 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {actionLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <XCircle className="w-5 h-5" />
                      Reject
                    </>
                  )}
                </button>
                <button
                  onClick={onApprove}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-3 bg-green-900 hover:bg-green-800 border border-green-700 text-green-200 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {actionLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Approve
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="text-center text-sm text-gray-500">
                No pending verification actions
              </div>
            )}
            
            {/* Delete Button */}
            <button
              onClick={onDelete}
              disabled={actionLoading}
              className="w-full px-4 py-2.5 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 text-gray-300 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Delete User
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Delete Confirmation Modal
function DeleteConfirmModal({ user, onClose, onConfirm, loading }) {
  const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-800 border border-red-700 rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 flex-shrink-0 rounded-full bg-red-900 border border-red-700 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-300" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Delete User</h2>
            <p className="text-sm text-gray-400 mt-1">
              Are you sure you want to permanently delete <strong className="text-white">{fullName}</strong>? This action will remove all their data, including auth records, profile, and stored files. This cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Trash2 className="w-5 h-5" />
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Info row component for user details
function InfoRow({ icon, label, value }) {
  const Icon = icon
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-sm text-white break-words">{value || "Not provided"}</p>
      </div>
    </div>
  )
}

// Document preview component
function DocumentPreview({ icon, label, storageKey, bucket, type }) {
  const [mediaUrl, setMediaUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const loadMedia = useCallback(async () => {
    setLoading(true)
    setError(false)

    try {
      const url = await getSignedUrl(bucket, storageKey, { expiresIn: 300 })
      setMediaUrl(url)
    } catch (err) {
      console.error(`Failed to load ${label}:`, err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [bucket, storageKey, label])

  useEffect(() => {
    if (storageKey && isExpanded && !mediaUrl) {
      loadMedia()
    }
  }, [storageKey, isExpanded, mediaUrl, loadMedia])

  const Icon = icon

  if (!storageKey) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded p-4">
        <div className="flex items-center gap-3 text-gray-500">
          <Icon className="w-5 h-5" />
          <span className="text-sm">{label}</span>
          <span className="ml-auto text-xs">Not uploaded</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-800 transition-colors"
      >
        <Icon className="w-5 h-5 text-gray-300" />
        <span className="text-sm font-medium text-white">{label}</span>
        <span className="ml-auto text-xs text-gray-500">
          {isExpanded ? "Hide" : "View"}
        </span>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-700 p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-400 text-sm">
              Failed to load document
            </div>
          ) : mediaUrl ? (
            type === "video" ? (
              <video
                src={mediaUrl}
                controls
                className="w-full rounded bg-black"
              />
            ) : (
              <img
                src={mediaUrl}
                alt={label}
                className="w-full rounded"
              />
            )
          ) : null}
        </div>
      )}
    </div>
  )
}
