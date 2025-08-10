"use client"

import { useEffect, useMemo, useState } from "react"
import useAuthStore from "../../stores/useAuthStore"
import { getUserRentals } from "../../services/rentalService"
import { userConfirmDelivered, userConfirmSentBack } from "../../services/deliveryService"
import { getSignedContractUrl } from "../../services/pdfService"
import { getCameraWithInclusions } from "../../services/inclusionService"
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  FileText,
  Loader2,
  AlertCircle,
  CameraIcon,
  Calendar,
  Timer,
  PhilippinePeso,
} from "lucide-react"

export default function Rentals() {
  const user = useAuthStore((s) => s.user)
  const authLoading = useAuthStore((s) => s.loading)
  const [rentals, setRentals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [actionLoading, setActionLoading] = useState({})
  const [contractViewLoading, setContractViewLoading] = useState({})
  const [contractViewError, setContractViewError] = useState({})
  const [activeFilter, setActiveFilter] = useState("all")

  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60 * 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!authLoading && user?.id) {
      refresh()
    }
  }, [authLoading, user?.id])

  async function refresh() {
    setLoading(true)
    setError("")
    try {
      const { data, error: fetchError } = await getUserRentals(user.id)
      if (fetchError) throw new Error(fetchError)
      const filtered = (data || []).filter((r) => !["pending", "rejected"].includes(r.rental_status))

      const withDetails = await Promise.all(
        filtered.map(async (r) => {
          try {
            const { data: cam, error: camErr } = await getCameraWithInclusions(r.cameras?.id)
            if (camErr) return r
            return { ...r, fullCamera: cam }
          } catch {
            return r
          }
        }),
      )
      setRentals(withDetails)
    } catch (e) {
      console.error("Failed to load rentals:", e)
      setError("Failed to load your rentals. Please try again later.")
      setRentals([])
    } finally {
      setLoading(false)
    }
  }

  const displayedRentals = useMemo(() => {
    if (activeFilter === "all") return rentals
    if (activeFilter === "awaiting") {
      return rentals.filter(
        (r) => r.rental_status === "confirmed" || ["ready_to_ship", "in_transit_to_user"].includes(r.shipping_status),
      )
    }
    if (activeFilter === "active") {
      return rentals.filter(
        (r) => r.rental_status === "active" && (!r.shipping_status || r.shipping_status === "delivered" || r.shipping_status === "return_scheduled"),
      )
    }
    if (activeFilter === "returning") {
      return rentals.filter((r) => ["return_scheduled", "in_transit_to_owner", "returned"].includes(r.shipping_status))
    }
    return rentals
  }, [activeFilter, rentals])

  function formatDate(dateStr) {
    if (!dateStr) return "—"
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    } catch {
      return dateStr
    }
  }

  const shippingSteps = [
    { key: "ready_to_ship", label: "Packed", icon: Package },
    { key: "in_transit_to_user", label: "On the way", icon: Truck },
    { key: "delivered", label: "Delivered", icon: CheckCircle },
    { key: "return_scheduled", label: "Return scheduled", icon: Clock },
    { key: "in_transit_to_owner", label: "Returning", icon: Truck },
    { key: "returned", label: "Returned", icon: CheckCircle },
  ]

  function computeCurrentStep(rental) {
    if (!rental?.shipping_status) {
      if (rental.rental_status === "confirmed") return 0
      if (rental.rental_status === "active") return 2
      return 0
    }
    const idx = shippingSteps.findIndex((s) => s.key === rental.shipping_status)
    return idx >= 0 ? idx : 0
  }

  function getStatusBadgeClasses(status) {
    switch (status) {
      case "confirmed":
        return "bg-blue-500/15 text-blue-600 border border-blue-200"
      case "active":
        return "bg-green-500/15 text-green-600 border border-green-200"
      case "completed":
        return "bg-purple-500/15 text-purple-600 border border-purple-200"
      case "cancelled":
        return "bg-gray-500/15 text-gray-600 border border-gray-200"
      default:
        return "bg-gray-500/15 text-gray-600 border border-gray-200"
    }
  }

  async function handleConfirmDelivered(rentalId) {
    setActionLoading((p) => ({ ...p, [rentalId]: "confirmDelivered" }))
    try {
      const res = await userConfirmDelivered(rentalId, user.id)
      if (!res?.success) throw new Error(res?.error || "Failed to confirm delivery")
      await refresh()
    } catch (e) {
      console.error(e)
      setError("Could not confirm delivery. Please try again.")
    } finally {
      setActionLoading((p) => {
        const next = { ...p }
        delete next[rentalId]
        return next
      })
    }
  }

  async function handleConfirmSentBack(rentalId) {
    setActionLoading((p) => ({ ...p, [rentalId]: "confirmSentBack" }))
    try {
      const res = await userConfirmSentBack(rentalId, user.id)
      if (!res?.success) throw new Error(res?.error || "Failed to confirm return shipment")
      await refresh()
    } catch (e) {
      console.error(e)
      setError("Could not confirm the return shipment. Please try again.")
    } finally {
      setActionLoading((p) => {
        const next = { ...p }
        delete next[rentalId]
        return next
      })
    }
  }

  async function viewContract(rentalId, contractFilePath) {
    if (!contractFilePath) {
      setContractViewError((p) => ({ ...p, [rentalId]: "No contract on file." }))
      return
    }
    setContractViewLoading((p) => ({ ...p, [rentalId]: true }))
    setContractViewError((p) => {
      const next = { ...p }
      delete next[rentalId]
      return next
    })
    try {
      const url = await getSignedContractUrl(contractFilePath)
      window.open(url, "_blank", "noopener,noreferrer")
    } catch (e) {
      console.error("Contract view error:", e)
      setContractViewError((p) => ({ ...p, [rentalId]: e.message || "Could not open contract." }))
    } finally {
      setContractViewLoading((p) => {
        const next = { ...p }
        delete next[rentalId]
        return next
      })
    }
  }

  function useCountdown(targetIso, { dir = "down", startDate = null, endDate = null } = {}) {
    if (!targetIso) return null
    
    if (startDate && endDate && dir === "down") {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      
      const end = new Date(endDate)
      end.setHours(0, 0, 0, 0)
      end.setDate(end.getDate() + 1)
      
      const nowTime = new Date(now)
      
      const startMs = start.getTime()
      const endMs = end.getTime()
      const nowMs = nowTime.getTime()
      
      const totalRentalMs = endMs - startMs
      const elapsedMs = nowMs - startMs
      const remainingMs = Math.max(0, totalRentalMs - elapsedMs)
      
      const days = Math.floor(remainingMs / (24 * 3600 * 1000))
      const hours = Math.floor((remainingMs % (24 * 3600 * 1000)) / (3600 * 1000))
      const minutes = Math.floor((remainingMs % (3600 * 1000)) / (60 * 1000))
      
      return { days, hours, minutes, ms: remainingMs }
    }
    
    const target = new Date(targetIso).getTime()
    const diffMs = dir === "down" ? target - now : now - target
    const remaining = Math.max(diffMs, 0)
    const days = Math.floor(remaining / (24 * 3600 * 1000))
    const hours = Math.floor((remaining % (24 * 3600 * 1000)) / (3600 * 1000))
    const minutes = Math.floor((remaining % (3600 * 1000)) / (60 * 1000))
    return { days, hours, minutes, ms: remaining }
  }

  function daysUntil(dateIso) {
    if (!dateIso) return Number.POSITIVE_INFINITY
    const start = new Date()
    const end = new Date(dateIso)
    const ms = end.getTime() - start.getTime()
    return Math.ceil(ms / (24 * 3600 * 1000))
  }

  function RentalCard({ rental }) {
    const currentStep = computeCurrentStep(rental)
    const steps = shippingSteps
    const cameraName = rental?.cameras?.name || "Camera"
    const cameraImage = rental?.cameras?.image_url || ""
    const cameraDesc = rental?.fullCamera?.description || ""
    const inclusions = rental?.fullCamera?.camera_inclusions || []
    const canConfirmDelivered = rental.shipping_status === "in_transit_to_user"
    const canConfirmSentBack = rental.shipping_status === "return_scheduled"

    const days = useMemo(() => {
      const start = new Date(rental.start_date)
      const end = new Date(rental.end_date)
      
      start.setHours(0, 0, 0, 0)
      end.setHours(0, 0, 0, 0)
      
      end.setDate(end.getDate() + 1)
      
      const diff = (end - start) / (1000 * 3600 * 24)
      return isNaN(diff) ? null : Math.floor(diff)
    }, [rental.start_date, rental.end_date])

    const [imgBroken, setImgBroken] = useState(false)
    const showCountdownToEnd =
      rental.rental_status === "active" && (rental.shipping_status === "delivered" || rental.shipping_status === "return_scheduled" || !rental.shipping_status)
    const showCountdownToStart = rental.rental_status === "confirmed" && new Date(rental.start_date) > new Date()
    const countdownToEnd = showCountdownToEnd 
      ? useCountdown(rental.end_date, { 
          dir: "down", 
          startDate: rental.start_date, 
          endDate: rental.end_date 
        }) 
      : null
    const countdownToStart = showCountdownToStart ? useCountdown(rental.start_date, { dir: "down" }) : null
    const soonEnd = showCountdownToEnd && daysUntil(rental.end_date) <= 3
    const soonStart = showCountdownToStart && daysUntil(rental.start_date) <= 2

    return (
      <div
        className={`bg-white border rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 ${
          soonEnd || soonStart ? "border-amber-300 ring-2 ring-amber-200/50" : "border-gray-200"
        }`}
      >
        <div className="bg-gradient-to-r from-gray-50 to-blue-50/30 px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <CameraIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{cameraName}</h3>
                <p className="text-sm text-gray-600">Rental #{rental.id.slice(0, 8)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClasses(rental.rental_status)}`}
              >
                {rental.rental_status.charAt(0).toUpperCase() + rental.rental_status.slice(1)}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="flex gap-4 mb-6">
            <div className="w-24 h-24 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
              {!imgBroken && cameraImage ? (
                <img
                  src={cameraImage || "/placeholder.svg"}
                  alt={cameraName}
                  className="object-cover w-full h-full"
                  onError={() => setImgBroken(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <CameraIcon className="h-8 w-8" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-600 line-clamp-3 mb-3">{cameraDesc || "No description available."}</p>
              {inclusions && inclusions.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1">Included Items</p>
                  <div className="flex flex-wrap gap-1">
                    {inclusions.slice(0, 3).map((inc, idx) => (
                      <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                        {inc?.inclusion_items?.name || "Item"}
                        {inc?.quantity > 1 ? ` ×${inc.quantity}` : ""}
                      </span>
                    ))}
                    {inclusions.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                        +{inclusions.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Rental Period</span>
              </div>
              <div className="text-sm text-gray-900">
                <div>
                  {formatDate(rental.start_date)} — {formatDate(rental.end_date)}
                </div>
                {days != null && (
                  <div className="text-xs text-gray-600 mt-1">
                    {days} day{days === 1 ? "" : "s"}
                  </div>
                )}
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <PhilippinePeso className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Total Cost</span>
              </div>
              {typeof rental.total_price === "number" ? (
                <div>
                  <div className="text-sm font-semibold text-gray-900">₱{Number(rental.total_price).toFixed(2)}</div>
                  {days && (
                    <div className="text-xs text-gray-600">≈ ₱{Number(rental.price_per_day).toFixed(2)}/day</div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-500">Price not available</div>
              )}
            </div>
          </div>

          {(showCountdownToEnd || showCountdownToStart) && (
            <div
              className={`rounded-xl border p-4 mb-6 ${
                soonEnd || soonStart ? "border-amber-300 bg-amber-50" : "border-blue-200 bg-blue-50"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Timer className={`h-4 w-4 ${soonEnd || soonStart ? "text-amber-600" : "text-blue-600"}`} />
                <span className={`text-sm font-medium ${soonEnd || soonStart ? "text-amber-800" : "text-blue-800"}`}>
                  {showCountdownToEnd ? "Time Remaining" : "Starts In"}
                </span>
              </div>
              <div className={`text-lg font-semibold ${soonEnd || soonStart ? "text-amber-900" : "text-blue-900"}`}>
                {showCountdownToEnd && countdownToEnd && (
                  <span>
                    {countdownToEnd.days}d {countdownToEnd.hours}h {countdownToEnd.minutes}m
                  </span>
                )}
                {showCountdownToStart && countdownToStart && (
                  <span>
                    {countdownToStart.days}d {countdownToStart.hours}h {countdownToStart.minutes}m
                  </span>
                )}
              </div>
              {(soonEnd || soonStart) && (
                <p className="text-xs text-amber-700 mt-1">
                  {showCountdownToEnd && countdownToEnd && countdownToEnd.ms <= 0
                    ? "Rental period has ended. Please return the item soon."
                    : `Reminder: Please prepare for ${soonEnd ? "return" : "delivery"}.`}
                </p>
              )}
            </div>
          )}

          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Shipping Progress</h4>
            <div className="relative">
              <div className="flex items-center justify-between">
                {steps.map((step, idx) => {
                  const Icon = step.icon
                  const reached = idx <= currentStep
                  const isActive = idx === currentStep
                  return (
                    <div key={step.key} className="flex flex-col items-center relative">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                          reached
                            ? isActive
                              ? "bg-blue-600 border-blue-600 text-white shadow-lg"
                              : "bg-green-100 border-green-500 text-green-600"
                            : "bg-gray-100 border-gray-300 text-gray-400"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <span
                        className={`text-xs mt-2 text-center max-w-16 leading-tight ${
                          reached ? "text-gray-900 font-medium" : "text-gray-500"
                        }`}
                      >
                        {step.label}
                      </span>
                      {idx < steps.length - 1 && (
                        <div
                          className={`absolute top-4 left-8 w-full h-0.5 -z-10 transition-all duration-300 ${
                            idx < currentStep ? "bg-green-500" : "bg-gray-200"
                          }`}
                          style={{ width: "calc(100% + 2rem)" }}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {rental.contract_pdf_url && (
              <button
                onClick={() => viewContract(rental.id, rental.contract_pdf_url)}
                disabled={!!contractViewLoading[rental.id]}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors text-sm font-medium"
              >
                {contractViewLoading[rental.id] ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                View Contract
              </button>
            )}
            {canConfirmDelivered && (
              <button
                onClick={() => handleConfirmDelivered(rental.id)}
                disabled={actionLoading[rental.id] === "confirmDelivered"}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60 transition-colors text-sm font-medium"
              >
                {actionLoading[rental.id] === "confirmDelivered" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Confirm Received
              </button>
            )}
            {canConfirmSentBack && (
              <button
                onClick={() => handleConfirmSentBack(rental.id)}
                disabled={actionLoading[rental.id] === "confirmSentBack"}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-60 transition-colors text-sm font-medium"
              >
                {actionLoading[rental.id] === "confirmSentBack" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Truck className="h-4 w-4" />
                )}
                Confirm Shipped Back
              </button>
            )}
          </div>

          {contractViewError[rental.id] && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{contractViewError[rental.id]}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            <span className="text-gray-600 font-medium">Loading your rentals...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-600 bg-clip-text text-transparent">
            My Rentals
          </h1>
          <p className="text-gray-600 mt-2">Track your camera rentals and manage deliveries</p>
        </div>

        <div className="mb-8">
          <div className="inline-flex rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm p-1 shadow-sm">
            {[
              { key: "all", label: "All Rentals" },
              { key: "awaiting", label: "Awaiting Delivery" },
              { key: "active", label: "Active" },
              { key: "returning", label: "Returning" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                  activeFilter === f.key
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-red-800 font-medium">Something went wrong</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
                <button onClick={refresh} className="mt-3 text-sm text-red-700 underline hover:no-underline">
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {displayedRentals.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CameraIcon className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No rentals found</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              {activeFilter === "all"
                ? "You haven't made any rentals yet. Browse our camera collection to get started!"
                : `No rentals match the "${activeFilter}" filter. Try selecting a different filter.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {displayedRentals.map((rental) => (
              <RentalCard key={rental.id} rental={rental} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}