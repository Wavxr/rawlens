/*
  Signup.jsx
  ----------
  Multi-step signup component with image verification.

  Key points for future devs:
  • Three-step wizard (personal → contact → verification) driven by currentStep state.
  • Verification step lets users upload OR capture photos for a national ID and a selfie-with-ID.
    - File picker overlays the dashed box. Once a file is chosen, the box turns green
      and shows a thumbnail preview so users know the image was accepted.
    - Camera capture uses getUserMedia; preview is taken from a hidden <video> element
      and converted to a File via canvas.toBlob.
  • handleSubmit validates that every required field (including both images) is present,
    then calls signUp (see authService.js). If anything fails we surface the error.
  • Tailwind classes are used for layout; tweak colors or spacing there as needed.
*/

"use client"

import { useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import {
  Camera,
  Eye, EyeOff,
  Mail, Lock, User, Phone, MapPin,
  Upload, ArrowRight,
  Shield, CheckCircle, X, Video, Info
} from "lucide-react"
import { signUp } from "../services/authService"

export default function Signup() {
  /* ---------- local state ---------- */
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)

  // store chosen files so we can preview them and send to signUp()
  const [uploadedFiles, setUploadedFiles] = useState({ governmentID: null, selfieID: null, verificationVideo: null })

  // camera modal state
  const [showCamera, setShowCamera] = useState(false)
  const [currentCameraField, setCurrentCameraField] = useState(null) // "governmentID" | "selfieID" | "verificationVideo"
  const [isRecording, setIsRecording] = useState(false)
  const [recordedVideoUrl, setRecordedVideoUrl] = useState(null)
  const [stream, setStream] = useState(null)

  // refs for video preview + off-screen canvas
  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recordedChunksRef = useRef([])
  const recordingTimeoutRef = useRef(null)
  const recordedBlobRef = useRef(null)
  // countdown and timers
  const [preCountdown, setPreCountdown] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const preCountdownRef = useRef(null)
  const recordingIntervalRef = useRef(null)

  const navigate = useNavigate()

  /* ---------- wizard nav ---------- */
  const nextStep = () => currentStep < 3 && setCurrentStep(currentStep + 1)
  const prevStep = () => currentStep > 1 && setCurrentStep(currentStep - 1)

  /* ---------- handle file select ---------- */
  const handleFile = (field, file) =>
    setUploadedFiles(prev => ({ ...prev, [field]: file }))

  /* ---------- open camera for capture ---------- */
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
        videoRef.current.muted = !isVideo // Mute audio preview unless recording
      }

      if (isVideo) {
        mediaRecorderRef.current = new MediaRecorder(mediaStream)
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data)
          }
        }
        mediaRecorderRef.current.onstop = () => {
          const videoBlob = new Blob(recordedChunksRef.current, { type: "video/webm" })
          recordedBlobRef.current = videoBlob
          const videoUrl = URL.createObjectURL(videoBlob)
          // Detach and stop camera so preview is shown clearly
          if (videoRef.current) {
            try { videoRef.current.srcObject = null } catch {}
          }
          if (stream) {
            try { stream.getTracks().forEach(t => t.stop()) } catch {}
          }
          setStream(null)
          setRecordedVideoUrl(videoUrl)
        }
      }
    } catch (err) {
      console.error("getUserMedia failed:", err)
      setError("Unable to access camera/mic. Please check permissions.")
      setShowCamera(false)
    }
  }

  /* ---------- video recording controls ---------- */
  const startRecording = () => {
    if (!mediaRecorderRef.current) return
    // Pre-record 3..2..1 countdown
    setPreCountdown(3)
    if (preCountdownRef.current) clearInterval(preCountdownRef.current)
    preCountdownRef.current = setInterval(() => {
      setPreCountdown(prev => {
        const next = prev - 1
        if (next <= 0) {
          clearInterval(preCountdownRef.current)
          // Start actual recording
          recordedChunksRef.current = []
          mediaRecorderRef.current.start()
          setIsRecording(true)
          setTimeLeft(10)
          // Update remaining seconds while recording
          if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current)
          recordingIntervalRef.current = setInterval(() => {
            setTimeLeft(t => {
              const nt = t - 1
              return nt >= 0 ? nt : 0
            })
          }, 1000)
          // Auto-stop after 10s
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
  };

  const stopRecording = () => {
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
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
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setPreCountdown(0)
    setTimeLeft(0)
  };

  /* ---------- capture snapshot from video ---------- */
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const canvas = canvasRef.current
    const video  = videoRef.current
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext("2d").drawImage(video, 0, 0)
    canvas.toBlob(blob => {
      const file = new File([blob], `${currentCameraField}-${Date.now()}.jpg`, { type: "image/jpeg" })
      handleFile(currentCameraField, file)
      closeCamera()
    }, "image/jpeg", 0.8)
  }

  /* ---------- close camera and clean up tracks ---------- */
  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current)
    }
    if (preCountdownRef.current) {
      clearInterval(preCountdownRef.current)
      preCountdownRef.current = null
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current)
      recordingIntervalRef.current = null
    }
    if (recordedVideoUrl) {
      try { URL.revokeObjectURL(recordedVideoUrl) } catch {}
    }
    setShowCamera(false)
    setCurrentCameraField(null)
    setStream(null)
    setIsRecording(false)
    setRecordedVideoUrl(null)
    setPreCountdown(0)
    setTimeLeft(0)
    recordedChunksRef.current = []
    recordedBlobRef.current = null;
  }

  /* ---------- main submit ---------- */
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    // gather form data
    const fd = new FormData(e.target)
    const firstName      = fd.get("firstName")?.trim()
    const lastName       = fd.get("lastName")?.trim()
    const middleInitial  = fd.get("middleInitial")?.trim()
    const email          = fd.get("email")?.trim()
    const address        = fd.get("address")?.trim()
    const contactNumber  = fd.get("contactNumber")?.trim()
    const password       = fd.get("password")
    const { governmentID, selfieID, verificationVideo } = uploadedFiles

    // basic client-side validation
    if (!firstName || !lastName || !email || !address || !contactNumber
        || !password || !governmentID || !selfieID || !verificationVideo) {
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
      uploadedFiles.verificationVideo
    )

    if (supaErr) setError(supaErr.message)
    else navigate("/login")
    setLoading(false)
  }

  /* ---------- render ---------- */
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">

      {/* camera modal overlay */}
      {showCamera && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-2xl relative">
            <header className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">
                {currentCameraField === 'verificationVideo' ? (recordedVideoUrl ? 'Review Video' : 'Record Video') : 'Take Photo'}
              </h3>
              <button onClick={closeCamera} className="text-gray-400 hover:text-white"><X /></button>
            </header>

            <div className="bg-black rounded-lg overflow-hidden relative w-full aspect-video flex items-center justify-center">
              {recordedVideoUrl ? (
                <video
                  src={recordedVideoUrl}
                  controls
                  playsInline
                  className="w-full h-full object-contain"
                />
              ) : (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              )}

              {/* Countdown and recording timer overlays */}
              {!recordedVideoUrl && preCountdown > 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-white text-6xl font-bold bg-black/40 rounded-full w-24 h-24 flex items-center justify-center border border-white/30">
                    {preCountdown}
                  </div>
                </div>
              )}
              {!recordedVideoUrl && isRecording && (
                <div className="absolute top-3 right-3 flex items-center space-x-2 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                  <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span>{timeLeft}s</span>
                </div>
              )}

              {currentCameraField === "verificationVideo" && !recordedVideoUrl && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full px-4">
                  {isRecording ? (
                    <button onClick={stopRecording} className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors">
                      <div className="w-3 h-3 bg-white rounded-sm"/><span>Stop Recording</span>
                    </button>
                  ) : (
                    <button onClick={startRecording} className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors">
                      <div className="w-3 h-3 bg-white rounded-full animate-pulse"/><span>Start Recording</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end space-x-4">
              {recordedVideoUrl ? (
                <>
                  <button
                    type="button"
                    onClick={() => { // Retake
                      if (recordedVideoUrl) {
                        try { URL.revokeObjectURL(recordedVideoUrl) } catch {}
                      }
                      setRecordedVideoUrl(null)
                      recordedBlobRef.current = null
                      recordedChunksRef.current = []
                      setPreCountdown(0)
                      setTimeLeft(0)
                      // Re-open camera fresh for a new recording
                      openCamera("verificationVideo")
                    }}
                    className="px-6 py-2 border border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
                  >
                    Retake
                  </button>
                  <button
                    type="button"
                    onClick={() => { // Confirm
                      if (recordedBlobRef.current) {
                        const videoFile = new File([recordedBlobRef.current], "verification-video.webm", { type: "video/webm" });
                        handleFile(currentCameraField, videoFile);
                      }
                      closeCamera();
                    }}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                  >
                    <CheckCircle className="h-5 w-5" />
                    <span>Confirm & Use Video</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={closeCamera}
                    className="px-6 py-2 border border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  {currentCameraField !== "verificationVideo" && (
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                    >
                      <Camera className="h-5 w-5" />
                      <span>Take Picture</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* hidden canvas used to generate File from snapshot */}
      <canvas ref={canvasRef} className="hidden"></canvas>

      {/* decorative background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl"/>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl"/>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl"/>
      </div>

      {/* main card */}
      <div className="relative w-full max-w-2xl">

        {/* header + progress indicator */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Camera className="h-8 w-8 text-blue-400"/>
            <span className="text-2xl font-bold text-white">Join Rawlen</span>
          </div>
        </div>

        {/* step bubbles */}
        <div className="flex items-center justify-center mb-4">
          {[1,2,3].map(step => (
            <div key={step} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center
                               ${step<=currentStep ? "bg-blue-600 text-white"
                                                   : "bg-gray-800 text-gray-400 border border-gray-700"}`}>
                {step<currentStep ? <CheckCircle className="h-5 w-5"/> : step}
              </div>
              {step<3 && <div className={`w-16 h-0.5 mx-2 ${step<currentStep?"bg-blue-600":"bg-gray-700"}`}/>}
            </div>
          ))}
        </div>

        {/* step titles */}
        <div className="flex justify-center mb-4 text-sm space-x-16">
          <span className={currentStep>=1?"text-blue-400":"text-gray-500"}>Personal Info</span>
          <span className={currentStep>=2?"text-blue-400":"text-gray-500"}>Contact Details</span>
          <span className={currentStep>=3?"text-blue-400":"text-gray-500"}>Verification</span>
        </div>

        {/* form card */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 shadow-2xl">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm flex items-center space-x-2">
              <Shield className="h-4 w-4"/><span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* ------------ STEP 1: personal ------------ */}
            <div className={currentStep === 1 ? "" : "hidden"}>
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-white mb-2">Personal Information</h3>
                <p className="text-gray-400 text-sm">Tell us about yourself</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* first name */}
                  <div className="space-y-2">
                    <label htmlFor="firstName" className="text-sm font-medium text-gray-300">
                      First Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                      <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        required
                        className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700
                                   rounded-lg text-white placeholder-gray-500 focus:outline-none
                                   focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="First Name"
                      />
                    </div>
                  </div>

                  {/* last name */}
                  <div className="space-y-2">
                    <label htmlFor="lastName" className="text-sm font-medium text-gray-300">
                      Last Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                      <input
                        id="lastName"
                        name="lastName"
                        type="text"
                        required
                        className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700
                                   rounded-lg text-white placeholder-gray-500 focus:outline-none
                                   focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Last Name"
                      />
                    </div>
                  </div>
                </div>

                {/* middle initial */}
                <div className="space-y-2">
                  <label htmlFor="middleInitial" className="text-sm font-medium text-gray-300">
                    Middle Initial
                  </label>
                  <input
                    id="middleInitial"
                    name="middleInitial"
                    type="text"
                    maxLength="1"
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700
                               rounded-lg text-white placeholder-gray-500 focus:outline-none
                               focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="M"
                  />
                </div>

                {/* email */}
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-gray-300">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700
                                 rounded-lg text-white placeholder-gray-500 focus:outline-none
                                 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                {/* password */}
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-gray-300">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      className="w-full pl-10 pr-12 py-3 bg-gray-800/50 border border-gray-700
                                 rounded-lg text-white placeholder-gray-500 focus:outline-none
                                 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Create a password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ------------ STEP 2: contact ------------ */}
            <div className={currentStep === 2 ? "" : "hidden"}>
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-white mb-2">Contact Details</h3>
                <p className="text-gray-400 text-sm">How can we reach you?</p>
              </div>

              <div className="space-y-4">
                {/* address */}
                <div className="space-y-2">
                  <label htmlFor="address" className="text-sm font-medium text-gray-300">
                    Address *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
                    <textarea
                      id="address"
                      name="address"
                      rows="3"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700
                                 rounded-lg text-white placeholder-gray-500 focus:outline-none
                                 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                      placeholder="Enter your complete address"
                    />
                  </div>
                </div>

                {/* contact number */}
                <div className="space-y-2">
                  <label htmlFor="contactNumber" className="text-sm font-medium text-gray-300">
                    Contact Number *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <input
                      id="contactNumber"
                      name="contactNumber"
                      type="tel"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700
                                 rounded-lg text-white placeholder-gray-500 focus:outline-none
                                 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Enter your phone number"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ------------ STEP 3: verification ------------ */}
            <div className={currentStep === 3 ? "" : "hidden"}>
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-white mb-2">Identity Verification</h3>
                <p className="text-gray-400 text-sm">Upload your documents for account verification</p>
              </div>

              <div className="space-y-4">


              {/* ------------ Government ID upload ------------ */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-300 flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-blue-400"/><span>Government ID (Front & Back) *</span>
                </label>
                <div className="relative">
                  <input
                    name="governmentID" type="file" accept="image/*"
                    onChange={e=>handleFile("governmentID", e.target.files[0])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"/>
                  <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-all
                                   ${uploadedFiles.governmentID
                                     ? "border-green-500 bg-green-500/5 shadow-lg shadow-green-500/20"
                                     : "border-gray-700 hover:border-blue-500"}`}>
                    {uploadedFiles.governmentID ? (
                      <div className="space-y-3">
                        <img src={URL.createObjectURL(uploadedFiles.governmentID)} alt="preview"
                             className="w-20 h-16 object-cover rounded mx-auto"/>
                        <p className="text-green-400 text-sm font-medium truncate">
                          ✓ {uploadedFiles.governmentID.name}
                        </p>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-gray-500 mx-auto mb-2"/>
                        <p className="text-gray-400 text-sm">Click to upload or drag and drop</p>
                        <p className="text-gray-600 text-xs">PNG, JPG up to 10 MB</p>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex justify-center">
                  <button type="button" onClick={()=>openCamera("governmentID")}
                          className="flex items-center space-x-2 px-4 py-2 bg-gray-800/50 border border-gray-700 text-gray-300 hover:text-white rounded-lg text-sm">
                    <Camera className="h-4 w-4"/><span>Take Photo</span>
                  </button>
                </div>
              </div>
              

                {/* ------------ Selfie upload ------------ */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-300 flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-blue-400"/><span>Selfie Holding ID *</span>
                </label>
                <div className="relative">
                  <input
                    name="selfieID" type="file" accept="image/*"
                    onChange={e=>handleFile("selfieID", e.target.files[0])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"/>
                  <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-all
                                   ${uploadedFiles.selfieID
                                     ? "border-green-500 bg-green-500/5 shadow-lg shadow-green-500/20"
                                     : "border-gray-700 hover:border-blue-500"}`}>
                    {uploadedFiles.selfieID ? (
                      <div className="space-y-3">
                        <img src={URL.createObjectURL(uploadedFiles.selfieID)} alt="preview"
                             className="w-20 h-16 object-cover rounded mx-auto"/>
                        <p className="text-green-400 text-sm font-medium truncate">
                          ✓ {uploadedFiles.selfieID.name}
                        </p>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-gray-500 mx-auto mb-2"/>
                        <p className="text-gray-400 text-sm">Click to upload or drag and drop</p>
                        <p className="text-gray-600 text-xs">PNG, JPG up to 10 MB</p>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex justify-center">
                  <button type="button" onClick={()=>openCamera("selfieID")}
                          className="flex items-center space-x-2 px-4 py-2 bg-gray-800/50 border border-gray-700 text-gray-300 hover:text-white rounded-lg text-sm">
                    <Camera className="h-4 w-4"/><span>Take Selfie</span>
                  </button>
                </div>
              </div>

              {/* ------------ Verification Video (record only) ------------ */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-300 flex items-center space-x-2">
                  <Video className="h-4 w-4 text-blue-400"/><span>Verification Video (5-10s) *</span>
                </label>
                <div className="text-xs text-gray-400 bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                  Please record a short video stating:
                  <span className="block font-medium text-blue-300 mt-1">"I, [Your Name], am renting a camera from RawLens PH."</span>
                </div>
                <div className="relative">
                  <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-all ${uploadedFiles.verificationVideo ? "border-green-500 bg-green-500/5" : "border-gray-700"}`}>
                    {uploadedFiles.verificationVideo ? (
                      <div className="space-y-3">
                        <video src={URL.createObjectURL(uploadedFiles.verificationVideo)} controls playsInline className="w-full h-24 object-cover rounded mx-auto"/>
                        <p className="text-green-400 text-sm font-medium truncate">✓ {uploadedFiles.verificationVideo.name}</p>
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm">No video recorded yet. Click "Record Video" below.</p>
                    )}
                  </div>
                </div>
                <div className="flex justify-center">
                  <button type="button" onClick={()=>openCamera("verificationVideo")}
                          className="flex items-center space-x-2 px-4 py-2 bg-gray-800/50 border border-gray-700 text-gray-300 hover:text-white rounded-lg text-sm">
                    <Camera className="h-4 w-4"/><span>Record Video</span>
                  </button>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="flex items-start space-x-3 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                <Info className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-yellow-300">
                  All pictures and documents submitted during verification will be automatically deleted after 3 days.
                </p>
              </div>

                {/* terms checkbox */}
                <div className="flex items-start space-x-3 p-4 bg-gray-800/30 rounded-lg">
                  <input
                    type="checkbox"
                    id="terms"
                    required
                    className="w-4 h-4 mt-1 bg-gray-800 border border-gray-600 rounded"
                  />
                  <label htmlFor="terms" className="text-sm text-gray-400">
                    I agree to the{" "}
                    <a href="/terms" className="text-blue-400 hover:text-blue-300">
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a href="/privacy" className="text-blue-400 hover:text-blue-300">
                      Privacy Policy
                    </a>
                  </label>
                </div>
              </div>
            </div>

            {/* nav buttons */}
            <div className="flex justify-between pt-6">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="px-6 py-3 border border-gray-700 bg-gray-800/50
                                   text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-all"
                >
                  Previous
                </button>
              )}

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="ml-auto bg-blue-600 hover:bg-blue-700 text-white font-medium
                                   py-3 px-6 rounded-lg flex items-center space-x-2 transition-all"
                >
                  <span>Next</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="ml-auto bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50
                                   text-white font-medium py-3 px-6 rounded-lg flex items-center space-x-2 transition-all"
                >
                  {loading ? (
                    <div
                      className="w-5 h-5 border-2 border-white/30 border-t-white
                                     rounded-full animate-spin"
                    />
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </form>

          {/* login link */}
          <div className="mt-8 pt-6 border-t border-gray-800 text-center">
            <p className="text-gray-400">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-blue-400 hover:text-blue-300 font-medium"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>

        {/* back home */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate("/")}
            className="text-gray-500 hover:text-gray-300 text-sm flex items-center justify-center space-x-1"
          >
            <span>← Back to Home</span>
          </button>
        </div>
      </div>
    </div>
  )
}
