import { useEffect, useState, useRef } from "react"
import { getUserById, updateUserProfile } from "../../services/userService"
import { getSignedUrl } from "../../services/storageService"
import useAuthStore from "../../stores/useAuthStore"

export default function Profile() {
  const { user } = useAuthStore()
  const userId = user?.id

  const [form, setForm] = useState({})
  const [originalForm, setOriginalForm] = useState({})
  const [mediaUrls, setMediaUrls] = useState({})
  const [files, setFiles] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Video recording states
  const [recording, setRecording] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [recordingTimeLeft, setRecordingTimeLeft] = useState(0)
  const [videoBlob, setVideoBlob] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [videoConfirmed, setVideoConfirmed] = useState(false)
  const mediaRecorderRef = useRef(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const countdownTimerRef = useRef(null)
  const recordingTimerRef = useRef(null)

  useEffect(() => {
    async function fetchUser() {
      try {
        const data = await getUserById(userId)
        setForm(data)
        setOriginalForm(data)
    
        // Safe signed URL fetch
        const urls = {}
        for (const key of ["government_id_key", "selfie_id_key", "verification_video_key"]) {
          if (data[key]) {
            try {
              const url = await getSignedUrl(key, data[key])
              urls[key] = url
            } catch (err) {
              console.warn(`Could not fetch signed URL for ${key}:`, err.message)
              // Don't set URL, just let it be undefined so UI stays clean
            }
          }
        }
        setMediaUrls(urls)
      } catch (error) {
        console.error("Error fetching user:", error)
      } finally {
        setLoading(false)
      }
    }
    if (userId) fetchUser()
  }, [userId])

  function handleChange(e) {
    const { name, value } = e.target
    // For address field, preserve all spaces and don't trim
    const processedValue = name === 'address' ? value : value
    setForm(prev => ({ ...prev, [name]: processedValue }))
  }

  function handleFileChange(e) {
    const { name, files: fileList } = e.target
    if (fileList[0]) {
      setFiles(prev => ({ ...prev, [name]: fileList[0] }))
      setMediaUrls(prev => ({ ...prev, [name]: URL.createObjectURL(fileList[0]) }))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)

    try {
      const updates = {}

      // Only send changed fields
      for (const key of ["first_name", "last_name", "contact_number", "address"]) {
        if (form[key] !== originalForm[key]) {
          updates[key] = form[key]
        }
      }

      // If recorded video confirmed
      if (videoBlob && videoConfirmed) {
        files["verification_video_key"] = new File([videoBlob], "verification.mp4", { type: "video/mp4" })
      }

      await updateUserProfile(userId, updates, files)
      alert("Profile updated successfully!")
      
      // Update original form to reflect saved state
      setOriginalForm({ ...form })
      setFiles({})
    } catch (error) {
      console.error("Error updating profile:", error)
      alert("Failed to update profile. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  // 🎥 --- VIDEO RECORDING ---
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      streamRef.current = stream
      
      // Check if videoRef exists before setting srcObject
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      // Start countdown
      setCountdown(3)
      countdownTimerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownTimerRef.current)
            // Start actual recording
            startActualRecording(stream)
            return 0
          }
          return prev - 1
        })
      }, 1000)

    } catch (error) {
      console.error("Error starting recording:", error)
      alert("Failed to access camera. Please ensure camera permissions are granted.")
    }
  }

  function startActualRecording(stream) {
    const mediaRecorder = new MediaRecorder(stream)
    mediaRecorderRef.current = mediaRecorder
    const chunks = []

    mediaRecorder.ondataavailable = e => chunks.push(e.data)
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/mp4" })
      setVideoBlob(blob)
      setPreviewUrl(URL.createObjectURL(blob))
      setRecording(false)
      setRecordingTimeLeft(0)
      stopStream()
    }

    mediaRecorder.start()
    setRecording(true)
    setRecordingTimeLeft(10)

    // Recording countdown timer
    recordingTimerRef.current = setInterval(() => {
      setRecordingTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(recordingTimerRef.current)
          if (mediaRecorder.state === "recording") {
            mediaRecorder.stop()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    // Clear any running timers
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current)
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
    }
  }

  function retakeVideo() {
    setVideoBlob(null)
    setPreviewUrl(null)
    setVideoConfirmed(false)
    setCountdown(0)
    setRecordingTimeLeft(0)
  }

  function confirmVideo() {
    setVideoConfirmed(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="text-lg font-medium text-gray-700">Loading your profile...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Profile</h1>
          <p className="text-gray-600">Update your personal information and verification documents</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Personal Information Section */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
                  <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  Personal Information
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                    <input
                      name="first_name"
                      value={form.first_name || ""}
                      onChange={handleChange}
                      placeholder="Enter your first name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                    <input
                      name="last_name"
                      value={form.last_name || ""}
                      onChange={handleChange}
                      placeholder="Enter your last name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number</label>
                    <input
                      name="contact_number"
                      value={form.contact_number || ""}
                      onChange={handleChange}
                      placeholder="Enter your contact number"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                    <textarea
                      name="address"
                      value={form.address || ""}
                      onChange={handleChange}
                      placeholder="Enter your full address&#10;Example:&#10;Building/Unit, Street Name,&#10;Barangay, City, Province, Country"
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors resize-none font-mono text-sm"
                      style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}
                    />
                  </div>
                </div>
              </div>

              {/* Verification Documents Section */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  Verification Documents
                </h2>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Government ID */}
                  <div className="bg-white rounded-lg p-6 border border-gray-200">
                    <label className="block text-lg font-medium text-gray-700 mb-4">Government ID</label>
                    {mediaUrls.government_id_key && (
                      <div className="mb-4">
                        <img 
                          src={mediaUrls.government_id_key} 
                          alt="Government ID" 
                          className="w-full max-w-sm h-48 object-contain border-2 border-dashed border-gray-300 rounded-lg bg-gray-50"
                        />
                      </div>
                    )}
                    <div className="relative">
                      <input 
                        type="file" 
                        name="government_id_key" 
                        accept="image/*" 
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="flex items-center justify-center w-full h-12 px-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                        <div className="flex items-center space-x-2 text-gray-600">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span className="text-sm font-medium">Choose file or drag here</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Selfie ID */}
                  <div className="bg-white rounded-lg p-6 border border-gray-200">
                    <label className="block text-lg font-medium text-gray-700 mb-4">Selfie with ID</label>
                    {mediaUrls.selfie_id_key && (
                      <div className="mb-4">
                        <img 
                          src={mediaUrls.selfie_id_key} 
                          alt="Selfie ID" 
                          className="w-full max-w-sm h-48 object-contain border-2 border-dashed border-gray-300 rounded-lg bg-gray-50"
                        />
                      </div>
                    )}
                    <div className="relative">
                      <input 
                        type="file" 
                        name="selfie_id_key" 
                        accept="image/*" 
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="flex items-center justify-center w-full h-12 px-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                        <div className="flex items-center space-x-2 text-gray-600">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span className="text-sm font-medium">Choose file or drag here</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Verification Video */}
                <div className="bg-white rounded-lg p-6 border border-gray-200 mt-8">
                  <label className="block text-lg font-medium text-gray-700 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Verification Video
                  </label>

                  {/* Existing video if no new one */}
                  {!videoBlob && !recording && !countdown && (
                    <div className="mb-4">
                      {mediaUrls.verification_video_key ? (
                        <video
                          src={mediaUrls.verification_video_key}
                          controls
                          className="w-full max-w-sm rounded-lg border-2 border-gray-300"
                        />
                      ) : (
                        <div className="flex items-center justify-center w-full max-w-sm h-48 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                          <div className="text-center">
                            <svg className="mx-auto w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <p className="text-sm text-gray-500">No verification video found</p>
                            <p className="text-xs text-gray-400">Please record one below</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Countdown display */}
                  {countdown > 0 && (
                    <div className="mb-4">
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        muted 
                        className="w-full max-w-sm rounded-lg border-2 border-yellow-400 shadow-lg"
                      />
                      <div className="mt-3 flex items-center justify-center">
                        <div className="flex items-center justify-center w-20 h-20 bg-yellow-100 border-4 border-yellow-400 rounded-full">
                          <span className="text-3xl font-bold text-yellow-600">{countdown}</span>
                        </div>
                      </div>
                      <p className="text-center text-sm text-gray-600 mt-2">Get ready! Recording starts in {countdown}...</p>
                    </div>
                  )}

                  {/* Live video recording */}
                  {recording && (
                    <div className="mb-4">
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        muted 
                        className="w-full max-w-sm rounded-lg border-2 border-red-400 shadow-lg"
                      />
                      <div className="mt-3 flex items-center justify-center">
                        <div className="flex items-center space-x-3 px-6 py-3 bg-red-100 rounded-full">
                          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                          <span className="text-sm font-medium text-red-700">Recording... {recordingTimeLeft}s remaining</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Preview recorded video */}
                  {previewUrl && (
                    <div className="mb-4">
                      <video 
                        src={previewUrl} 
                        controls 
                        className={`w-full max-w-sm rounded-lg border-2 shadow-lg ${videoConfirmed ? 'border-green-400' : 'border-blue-400'}`}
                      />
                      {videoConfirmed && (
                        <div className="mt-2 flex items-center justify-center">
                          <div className="flex items-center space-x-2 px-4 py-2 bg-green-100 rounded-full">
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-sm font-medium text-green-700">Video confirmed and ready to upload</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-3">
                    {!recording && !previewUrl && (
                      <button
                        type="button"
                        onClick={startRecording}
                        className="flex items-center space-x-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span>Record Video</span>
                      </button>
                    )}

                    {previewUrl && (
                      <div className="flex gap-3">
                        <button 
                          type="button" 
                          onClick={retakeVideo} 
                          className="flex items-center space-x-2 px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          <span>Retake</span>
                        </button>
                        <button 
                          type="button" 
                          className="flex items-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Confirm</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-6 border-t border-gray-200">
                <button 
                  type="submit" 
                  disabled={saving}
                  className="flex items-center space-x-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-xl transition-colors shadow-lg hover:shadow-xl"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}