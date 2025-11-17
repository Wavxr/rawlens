"use client"

import { useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import {
  Camera,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Phone,
  MapPin,
  Upload,
  ArrowRight,
  Shield,
  CheckCircle,
  X,
  Video,
  Info,
} from "lucide-react"
import { signUp } from "@services/authService"

export default function Signup() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)

  const [uploadedFiles, setUploadedFiles] = useState({ governmentID: null, selfieID: null, verificationVideo: null })

  const [showCamera, setShowCamera] = useState(false)
  const [currentCameraField, setCurrentCameraField] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordedVideoUrl, setRecordedVideoUrl] = useState(null)
  const [stream, setStream] = useState(null)

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recordedChunksRef = useRef([])
  const recordingTimeoutRef = useRef(null)
  const recordedBlobRef = useRef(null)
  const [preCountdown, setPreCountdown] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const preCountdownRef = useRef(null)
  const recordingIntervalRef = useRef(null)

  const navigate = useNavigate()

  const nextStep = () => currentStep < 3 && setCurrentStep(currentStep + 1)
  const prevStep = () => currentStep > 1 && setCurrentStep(currentStep - 1)

  const handleFile = (field, file) => setUploadedFiles((prev) => ({ ...prev, [field]: file }))

  const openCamera = async (field) => {
    setCurrentCameraField(field)
    setShowCamera(true)
    try {
      const isVideo = field === "verificationVideo"
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: isVideo || field === "selfieID" ? "user" : "environment" },
        audio: isVideo,
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.muted = !isVideo
      }

      if (isVideo) {
        mediaRecorderRef.current = new MediaRecorder(mediaStream)
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data)
          }
        }
        mediaRecorderRef.current.onstop = () => {
          const videoBlob = new Blob(recordedChunksRef.current, { type: "video/webm" });
          recordedBlobRef.current = videoBlob;
          const videoUrl = URL.createObjectURL(videoBlob);
          
          if (videoRef.current) videoRef.current.srcObject = null;
          if (stream) stream.getTracks().forEach((t) => t.stop());
          
          setStream(null);
          setRecordedVideoUrl(videoUrl);
        };
      }
    } catch (err) {
      console.error("getUserMedia failed:", err)
      setError("Unable to access camera/mic. Please check permissions.")
      setShowCamera(false)
    }
  }

  const startRecording = () => {
    if (!mediaRecorderRef.current) return
    setPreCountdown(3)
    if (preCountdownRef.current) clearInterval(preCountdownRef.current)
    preCountdownRef.current = setInterval(() => {
      setPreCountdown((prev) => {
        const next = prev - 1
        if (next <= 0) {
          clearInterval(preCountdownRef.current)
          recordedChunksRef.current = []
          mediaRecorderRef.current.start()
          setIsRecording(true)
          setTimeLeft(10)
          if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current)
          recordingIntervalRef.current = setInterval(() => {
            setTimeLeft((t) => {
              const nt = t - 1
              return nt >= 0 ? nt : 0
            })
          }, 1000)
          recordingTimeoutRef.current = setTimeout(() => {
            if (mediaRecorderRef.current?.state === "recording") {
              stopRecording()
            }
          }, 10000)
          return 0
        }
        return next
      })
    }, 1000)
  }

  const stopRecording = () => {
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current)
      recordingTimeoutRef.current = null
    }
    if (preCountdownRef.current) {
      clearInterval(preCountdownRef.current)
      preCountdownRef.current = null
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current)
      recordingIntervalRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
    setPreCountdown(0)
    setTimeLeft(0)
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const canvas = canvasRef.current
    const video = videoRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext("2d").drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => {
        const file = new File([blob], `${currentCameraField}-${Date.now()}.jpg`, { type: "image/jpeg" })
        handleFile(currentCameraField, file)
        closeCamera()
      },
      "image/jpeg",
      0.8,
    )
  }

  const closeCamera = () => {
    // Stop all tracks before closing
    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop()
        } catch (err) {
          console.warn("Error stopping track:", err)
        }
      })
    }
    
    // Clear all timeouts and intervals
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current)
      recordingTimeoutRef.current = null
    }
    if (preCountdownRef.current) {
      clearInterval(preCountdownRef.current)
      preCountdownRef.current = null
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current)
      recordingIntervalRef.current = null
    }
    
    // Clean up video URL
    if (recordedVideoUrl) {
      try {
        URL.revokeObjectURL(recordedVideoUrl)
      } catch (err) {
        console.warn("Error revoking video URL:", err)
      }
    }
    
    // Reset all states
    setShowCamera(false)
    setCurrentCameraField(null)
    setStream(null)
    setIsRecording(false)
    setRecordedVideoUrl(null)
    setPreCountdown(0)
    setTimeLeft(0)
    recordedChunksRef.current = []
    recordedBlobRef.current = null
    
    // Clear video ref
    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null
      } catch (err) {
        console.warn("Error clearing video ref:", err)
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const fd = new FormData(e.target)
    const firstName = fd.get("firstName")?.trim()
    const lastName = fd.get("lastName")?.trim()
    const middleInitial = fd.get("middleInitial")?.trim()
    const email = fd.get("email")?.trim()
    const address = fd.get("address")?.trim()
    const contactNumber = fd.get("contactNumber")?.trim()
    const password = fd.get("password")
    const { governmentID, selfieID, verificationVideo } = uploadedFiles

    if (
      !firstName ||
      !lastName ||
      !email ||
      !address ||
      !contactNumber ||
      !password ||
      !governmentID ||
      !selfieID ||
      !verificationVideo
    ) {
      setError("Please upload your Government ID, Selfie with ID, and the Verification Video.")
      setLoading(false)
      return
    }

    const userData = { firstName, lastName, middleInitial, email, address, contactNumber }
    const { error: supaErr } = await signUp(
      email,
      password,
      userData,
      uploadedFiles.governmentID,
      uploadedFiles.selfieID,
      uploadedFiles.verificationVideo,
    )

    if (supaErr) setError(supaErr.message)
    else navigate("/login")
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Tech grid background */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
            linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
          `,
            backgroundSize: "20px 20px",
          }}
        />
      </div>

      {/* Subtle gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-blue-50/20" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-500/5 rounded-full blur-2xl" />
      <div className="absolute bottom-0 right-0 w-60 h-60 bg-blue-500/3 rounded-full blur-2xl" />

      <div className="relative flex items-center justify-center min-h-screen p-4">
        {/* Camera modal overlay */}
        {showCamera && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3">
            <div className="bg-white rounded-xl p-4 w-full max-w-lg relative shadow-2xl border border-gray-100">
              <header className="flex justify-between items-center mb-3">
                <h3 className="text-base font-semibold text-gray-900">
                  {currentCameraField === "verificationVideo"
                    ? recordedVideoUrl
                      ? "Review Video"
                      : "Record Video"
                    : "Take Photo"}
                </h3>
                <button
                  onClick={closeCamera}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </header>

              <div className="bg-gray-900 rounded-lg overflow-hidden relative w-full aspect-video flex items-center justify-center">
                {recordedVideoUrl ? (
                  <video src={recordedVideoUrl} controls playsInline className="w-full h-full object-contain" />
                ) : (
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                )}

                {!recordedVideoUrl && preCountdown > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-white text-5xl font-bold bg-black/40 rounded-full w-20 h-20 flex items-center justify-center border border-white/30">
                      {preCountdown}
                    </div>
                  </div>
                )}
                {!recordedVideoUrl && isRecording && (
                  <div className="absolute top-2 right-2 flex items-center space-x-1.5 bg-black/60 text-white px-2 py-1 rounded-full text-xs">
                    <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                    <span>{timeLeft}s</span>
                  </div>
                )}

                {currentCameraField === "verificationVideo" && !recordedVideoUrl && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-full px-3">
                    {isRecording ? (
                      <button
                        onClick={stopRecording}
                        className="w-full bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-lg flex items-center justify-center space-x-1.5 transition-colors text-sm font-medium"
                      >
                        <div className="w-2.5 h-2.5 bg-white rounded-sm" />
                        <span>Stop</span>
                      </button>
                    ) : (
                      <button
                        onClick={startRecording}
                        className="w-full bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-lg flex items-center justify-center space-x-1.5 transition-colors text-sm font-medium"
                      >
                        <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
                        <span>Record</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 flex justify-end space-x-2">
                {recordedVideoUrl ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl)

                        setRecordedVideoUrl(null)
                        recordedBlobRef.current = null
                        recordedChunksRef.current = []
                        setPreCountdown(0)
                        setTimeLeft(0)
                        openCamera("verificationVideo")
                        
                      }}
                      className="px-4 py-2 border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 rounded-lg transition-colors text-sm font-medium"
                    >
                      Retake
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (recordedBlobRef.current) {
                          const videoFile = new File([recordedBlobRef.current], "verification-video.webm", {
                            type: "video/webm",
                          })
                          handleFile(currentCameraField, videoFile)
                        }
                        closeCamera()
                      }}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-1.5 text-sm font-medium"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>Use Video</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={closeCamera}
                      className="px-4 py-2 border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 rounded-lg transition-colors text-sm font-medium"
                    >
                      Cancel
                    </button>
                    {currentCameraField !== "verificationVideo" && (
                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-1.5 text-sm font-medium"
                      >
                        <Camera className="h-3.5 w-3.5" />
                        <span>Take Photo</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        <canvas ref={canvasRef} className="hidden"></canvas>

        {/* Main content */}
        <div className="relative w-full max-w-lg tech-grid">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center space-x-2.5 mb-5">
              <div className="relative">
                <Camera className="h-7 w-7 text-black" />
                <div className="absolute -inset-1 bg-blue-500/20 rounded-lg blur-sm -z-10" />
              </div>
              <span className="text-xl font-bold text-black tracking-tight">RAWLENS</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1.5">Create Account</h1>
            <p className="text-gray-600 text-sm">Join the camera rental revolution</p>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center justify-center mb-6">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all
                                 ${
                                   step <= currentStep
                                     ? "bg-black text-white shadow-md"
                                     : "bg-gray-100 text-gray-400 border border-gray-200"
                                 }`}
                >
                  {step < currentStep ? <CheckCircle className="h-4 w-4" /> : step}
                </div>
                {step < 3 && (
                  <div
                    className={`w-12 h-0.5 mx-2 transition-all ${step < currentStep ? "bg-black" : "bg-gray-200"}`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step titles */}
          <div className="flex justify-center mb-6 text-xs space-x-12 font-medium">
            <span className={currentStep >= 1 ? "text-black" : "text-gray-400"}>Personal</span>
            <span className={currentStep >= 2 ? "text-black" : "text-gray-400"}>Contact</span>
            <span className={currentStep >= 3 ? "text-black" : "text-gray-400"}>Verify</span>
          </div>

          {/* Form card */}
          <div className="bg-white/80 backdrop-blur-sm border border-gray-100 rounded-xl p-6 shadow-lg">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-lg mb-5 text-xs flex items-center space-x-1.5">
                <Shield className="h-3.5 w-3.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* STEP 1: Personal Information */}
              <div className={currentStep === 1 ? "" : "hidden"}>
                <div className="text-center mb-5">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1.5">Personal Info</h3>
                  <p className="text-gray-600 text-xs">Tell us about yourself</p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label htmlFor="firstName" className="text-xs font-medium text-gray-700">
                        First Name *
                      </label>
                      <div className="relative">
                        <User className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          id="firstName"
                          name="firstName"
                          type="text"
                          required
                          className="w-full pl-8 pr-3 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                          placeholder="First Name"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="lastName" className="text-xs font-medium text-gray-700">
                        Last Name *
                      </label>
                      <div className="relative">
                        <User className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          id="lastName"
                          name="lastName"
                          type="text"
                          required
                          className="w-full pl-8 pr-3 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                          placeholder="Last Name"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="middleInitial" className="text-xs font-medium text-gray-700">
                      Middle Initial
                    </label>
                    <input
                      id="middleInitial"
                      name="middleInitial"
                      type="text"
                      maxLength="1"
                      className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                      placeholder="M"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="email" className="text-xs font-medium text-gray-700">
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        className="w-full pl-8 pr-3 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                        placeholder="Enter your email"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="password" className="text-xs font-medium text-gray-700">
                      Password *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        className="w-full pl-8 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                        placeholder="Create a password"
                      />
                      <button
                        type="button"
                        className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* STEP 2: Contact Details */}
              <div className={currentStep === 2 ? "" : "hidden"}>
                <div className="text-center mb-5">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1.5">Contact Details</h3>
                  <p className="text-gray-600 text-xs">How can we reach you?</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="address" className="text-xs font-medium text-gray-700">
                      Address *
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                      <textarea
                        id="address"
                        name="address"
                        rows="2"
                        required
                        className="w-full pl-8 pr-3 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm resize-none"
                        placeholder="Enter your complete address"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="contactNumber" className="text-xs font-medium text-gray-700">
                      Contact Number *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        id="contactNumber"
                        name="contactNumber"
                        type="tel"
                        required
                        className="w-full pl-8 pr-3 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                        placeholder="Enter your phone number"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* STEP 3: Verification */}
              <div className={currentStep === 3 ? "" : "hidden"}>
                <div className="text-center mb-5">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1.5">Identity Verification</h3>
                  <p className="text-gray-600 text-xs">Upload your documents for verification</p>
                </div>

                <div className="space-y-5">
                  {/* Government ID upload */}
                  <div className="space-y-2.5">
                    <label className="text-xs font-medium text-gray-700 flex items-center space-x-1.5">
                      <Shield className="h-3.5 w-3.5 text-black" />
                      <span>Government ID *</span>
                    </label>
                    <div className="relative">
                      <input
                        name="governmentID"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFile("governmentID", e.target.files[0])}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div
                        className={`border-2 border-dashed rounded-lg p-4 text-center transition-all
                                       ${
                                         uploadedFiles.governmentID
                                           ? "border-green-400 bg-green-50"
                                           : "border-gray-300 hover:border-black hover:bg-gray-50"
                                       }`}
                      >
                        {uploadedFiles.governmentID ? (
                          <div className="space-y-2">
                            <img
                              src={URL.createObjectURL(uploadedFiles.governmentID) || "/placeholder.svg"}
                              alt="preview"
                              className="w-16 h-12 object-cover rounded mx-auto border border-gray-200"
                            />
                            <p className="text-green-600 text-xs font-medium truncate">
                              ✓ {uploadedFiles.governmentID.name}
                            </p>
                          </div>
                        ) : (
                          <>
                            <Upload className="h-6 w-6 text-gray-400 mx-auto mb-1.5" />
                            <p className="text-gray-600 text-xs font-medium">Click to upload</p>
                            <p className="text-gray-500 text-[10px]">PNG, JPG up to 10 MB</p>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => openCamera("governmentID")}
                        className="flex items-center space-x-1.5 px-3 py-1.5 bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200 rounded-lg text-xs font-medium transition-colors"
                      >
                        <Camera className="h-3.5 w-3.5" />
                        <span>Take Photo</span>
                      </button>
                    </div>
                  </div>

                  {/* Selfie upload */}
                  <div className="space-y-2.5">
                    <label className="text-xs font-medium text-gray-700 flex items-center space-x-1.5">
                      <Shield className="h-3.5 w-3.5 text-black" />
                      <span>Selfie with ID *</span>
                    </label>
                    <div className="relative">
                      <input
                        name="selfieID"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFile("selfieID", e.target.files[0])}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div
                        className={`border-2 border-dashed rounded-lg p-4 text-center transition-all
                                       ${
                                         uploadedFiles.selfieID
                                           ? "border-green-400 bg-green-50"
                                           : "border-gray-300 hover:border-black hover:bg-gray-50"
                                       }`}
                      >
                        {uploadedFiles.selfieID ? (
                          <div className="space-y-2">
                            <img
                              src={URL.createObjectURL(uploadedFiles.selfieID) || "/placeholder.svg"}
                              alt="preview"
                              className="w-16 h-12 object-cover rounded mx-auto border border-gray-200"
                            />
                            <p className="text-green-600 text-xs font-medium truncate">
                              ✓ {uploadedFiles.selfieID.name}
                            </p>
                          </div>
                        ) : (
                          <>
                            <Upload className="h-6 w-6 text-gray-400 mx-auto mb-1.5" />
                            <p className="text-gray-600 text-xs font-medium">Click to upload</p>
                            <p className="text-gray-500 text-[10px]">PNG, JPG up to 10 MB</p>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => openCamera("selfieID")}
                        className="flex items-center space-x-1.5 px-3 py-1.5 bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200 rounded-lg text-xs font-medium transition-colors"
                      >
                        <Camera className="h-3.5 w-3.5" />
                        <span>Take Selfie</span>
                      </button>
                    </div>
                  </div>

                  {/* Verification Video */}
                  <div className="space-y-2.5">
                    <label className="text-xs font-medium text-gray-700 flex items-center space-x-1.5">
                      <Video className="h-3.5 w-3.5 text-black" />
                      <span>Verification Video *</span>
                    </label>
                    <div className="text-[10px] text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
                      Please record a short video stating:
                      <span className="block font-medium text-black mt-1">
                        "I, [Your Name], am renting a camera from RawLens PH."
                      </span>
                    </div>
                    <div className="relative">
                      <div
                        className={`border-2 border-dashed rounded-lg p-4 text-center transition-all ${uploadedFiles.verificationVideo ? "border-green-400 bg-green-50" : "border-gray-300"}`}
                      >
                        {uploadedFiles.verificationVideo ? (
                          <div className="space-y-2">
                            <video
                              src={URL.createObjectURL(uploadedFiles.verificationVideo)}
                              controls
                              playsInline
                              className="w-full h-24 object-cover rounded mx-auto border border-gray-200"
                            />
                            <p className="text-green-600 text-xs font-medium truncate">
                              ✓ {uploadedFiles.verificationVideo.name}
                            </p>
                          </div>
                        ) : (
                          <p className="text-gray-600 text-xs">No video recorded yet. Click "Record Video" below.</p>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => openCamera("verificationVideo")}
                        className="flex items-center space-x-1.5 px-3 py-1.5 bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200 rounded-lg text-xs font-medium transition-colors"
                      >
                        <Camera className="h-3.5 w-3.5" />
                        <span>Record Video</span>
                      </button>
                    </div>
                  </div>

                  {/* Disclaimer */}
                  <div className="flex items-start space-x-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-[10px] text-amber-800">
                      All pictures and documents submitted during verification will be automatically deleted after 3
                      days.
                    </p>
                  </div>

                  {/* Terms checkbox */}
                  <div className="flex items-start space-x-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <input
                      type="checkbox"
                      id="terms"
                      required
                      className="w-3.5 h-3.5 mt-0.5 text-black bg-white border-gray-300 rounded focus:ring-black focus:ring-2"
                    />
                    <label htmlFor="terms" className="text-xs text-gray-700">
                      I agree to the{" "}
                      <a href="/terms" className="text-black hover:underline font-medium">
                        Terms
                      </a>{" "}
                      and{" "}
                      <a href="/privacy" className="text-black hover:underline font-medium">
                        Privacy Policy
                      </a>
                    </label>
                  </div>
                </div>
              </div>

              {/* Navigation buttons */}
              <div className="flex justify-between pt-5">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="px-4 py-2.5 border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 rounded-lg transition-all text-sm font-medium"
                  >
                    Previous
                  </button>
                )}

                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="ml-auto bg-black hover:bg-gray-800 text-white font-medium py-2.5 px-4 rounded-lg flex items-center space-x-1.5 transition-all shadow-md text-sm"
                  >
                    <span>Next</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="ml-auto bg-black hover:bg-gray-800 disabled:bg-gray-400 text-white font-medium py-2.5 px-4 rounded-lg flex items-center space-x-1.5 transition-all shadow-md text-sm"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Create Account
                        <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>

            {/* Login link */}
            <div className="mt-6 pt-5 border-t border-gray-200 text-center">
              <p className="text-gray-600 text-sm">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="text-black hover:underline font-medium"
                >
                  Sign in
                </button>
              </p>
            </div>
          </div>

          {/* Back home */}
          <div className="text-center mt-5">
            <button
              onClick={() => navigate("/")}
              className="text-gray-500 hover:text-gray-700 text-sm flex items-center justify-center space-x-1 font-medium"
            >
              <span>← Back to Home</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}