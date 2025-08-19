import { useEffect, useState, useRef } from "react";
import { getUserById, updateUserProfile } from "../../services/userService";
import { getSignedUrl } from "../../services/storageService";
import useAuthStore from "../../stores/useAuthStore";

export default function Profile() {
  const { user } = useAuthStore();
  const userId = user?.id;
  const [form, setForm] = useState({});
  const [originalForm, setOriginalForm] = useState({});
  const [mediaUrls, setMediaUrls] = useState({});
  const [files, setFiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [appealing, setAppealing] = useState(false);

  // Video recording states (Enhanced from Signup.jsx)
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState(null);
  const [stream, setStream] = useState(null);
  // countdown and timers
  const [preCountdown, setPreCountdown] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

  // Refs for video recording
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingTimeoutRef = useRef(null);
  const recordedBlobRef = useRef(null);
  const preCountdownRef = useRef(null);
  const recordingIntervalRef = useRef(null);

  // Fetch user & media URLs
  useEffect(() => {
    if (!userId) return;
    async function fetchUserData() {
      setLoading(true);
      try {
        const data = await getUserById(userId);
        setForm(data);
        setOriginalForm(data);
        await refreshMediaUrls(data);
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchUserData();
  }, [userId]);

  // Refresh media URLs
  async function refreshMediaUrls(data) {
    const [idUrl, selfieUrl, videoUrl] = await Promise.all([
      data.government_id_key
        ? getSignedUrl("government-ids", data.government_id_key, { transform: { width: 500 } })
        : "",
      data.selfie_id_key
        ? getSignedUrl("selfie-ids", data.selfie_id_key, { transform: { width: 500 } })
        : "",
      data.verification_video_key
        ? getSignedUrl("verification-videos", data.verification_video_key)
        : "",
    ]);
    setMediaUrls({
      government_id_key: idUrl,
      selfie_id_key: selfieUrl,
      verification_video_key: videoUrl,
    });
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function handleFileChange(e) {
    const { name, files: fileList } = e.target;
    if (!fileList[0]) return;
    const file = fileList[0];
    setFiles(prev => ({ ...prev, [name]: file }));
    // Immediately show preview
    setMediaUrls(prev => ({ ...prev, [name]: URL.createObjectURL(file) }));
  }

  // Generic submit handler for both actions
  async function handleSubmit(e, isAppeal = false) {
    e.preventDefault();
    if (isAppeal) {
        setAppealing(true);
    } else {
        setSavingPersonal(true);
    }

    try {
      const updates = {};
      let filesToUpload = {};

      if (isAppeal) {
        // For appeal, check for document changes
        // Only include changed fields/files for appeal
        if (files.government_id_key) filesToUpload.government_id_key = files.government_id_key;
        if (files.selfie_id_key) filesToUpload.selfie_id_key = files.selfie_id_key;

        // Handle video file from recording if confirmed
        if (recordedBlobRef.current) {
           const videoFile = new File([recordedBlobRef.current], "verification-video.webm", { type: "video/webm" });
           filesToUpload.verification_video_key = videoFile; // Add to files to upload
           // Update mediaUrls for immediate preview (optional, as page will refresh)
           const previewUrl = URL.createObjectURL(recordedBlobRef.current);
           setMediaUrls(prev => ({ ...prev, verification_video_key_for_preview: previewUrl }));
        } else if (files.verification_video_key) {
            // If video was uploaded via file input
            filesToUpload.verification_video_key = files.verification_video_key;
        }

        // If no new files are provided for appeal, show an error or prevent submission
        if (Object.keys(filesToUpload).length === 0) {
             alert("Please provide at least one new verification document to appeal.");
             return; // Stop submission
        }

        // Note: updateUserProfile will automatically set is_appealing = true if filesToUpload has entries
        // We don't need to explicitly set it here.

      } else {
        // For personal info update, check for field changes
        for (const key of ["first_name", "last_name", "contact_number", "address"]) {
          if (form[key] !== originalForm[key]) updates[key] = form[key];
        }
        // No files are uploaded for personal info updates
        filesToUpload = {};
      }

      await updateUserProfile(userId, updates, filesToUpload);

      if (isAppeal) {
          alert("Verification appeal submitted successfully!");
      } else {
          alert("Personal information updated successfully!");
      }

      // Refresh user & media URLs after save
      const data = await getUserById(userId);
      setForm(data);
      setOriginalForm(data);
      setFiles({}); // Clear staged files
      // Reset video recording state
      setRecordedVideoUrl(null);
      recordedBlobRef.current = null;
      recordedChunksRef.current = [];
      await refreshMediaUrls(data);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert(`Failed to update profile: ${error.message || "Please try again."}`);
    } finally {
      if (isAppeal) {
        setAppealing(false);
      } else {
        setSavingPersonal(false);
      }
    }
  }

  // VIDEO RECORDING LOGIC (Enhanced from Signup.jsx)
  async function openVideoModal() {
    setShowVideoModal(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.muted = true; // Mute preview
      }

      // Initialize MediaRecorder
      mediaRecorderRef.current = new MediaRecorder(mediaStream);
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      mediaRecorderRef.current.onstop = () => {
        const videoBlob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        recordedBlobRef.current = videoBlob;
        const videoUrl = URL.createObjectURL(videoBlob);
        // Detach and stop camera so preview is shown clearly
        if (videoRef.current) {
          try { videoRef.current.srcObject = null; } catch (e) { console.error(e); }
        }
        if (stream) {
          try { stream.getTracks().forEach(t => t.stop()); } catch (e) { console.error(e); }
        }
        setStream(null);
        setRecordedVideoUrl(videoUrl);
      };
    } catch (err) {
      console.error("getUserMedia failed:", err);
      alert("Unable to access camera/mic. Please check permissions.");
      setShowVideoModal(false);
    }
  }

  const startRecording = () => {
    if (!mediaRecorderRef.current) return;
    // Pre-record 3..2..1 countdown
    setPreCountdown(3);
    if (preCountdownRef.current) clearInterval(preCountdownRef.current);
    preCountdownRef.current = setInterval(() => {
      setPreCountdown(prev => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(preCountdownRef.current);
          // Start actual recording
          recordedChunksRef.current = [];
          mediaRecorderRef.current.start();
          setIsRecording(true);
          setTimeLeft(10);
          // Update remaining seconds while recording
          if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = setInterval(() => {
            setTimeLeft(t => {
              const nt = t - 1;
              return nt >= 0 ? nt : 0;
            });
          }, 1000);
          // Auto-stop after 10s
          recordingTimeoutRef.current = setTimeout(() => {
            if (mediaRecorderRef.current?.state === "recording") {
              stopRecording();
            }
          }, 10000);
          return 0;
        }
        return next;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    if (preCountdownRef.current) {
      clearInterval(preCountdownRef.current);
      preCountdownRef.current = null;
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setPreCountdown(0);
    setTimeLeft(0);
  };

  const closeVideoModal = () => {
    // Ensure camera is stopped when modal closes
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
    }
    if (preCountdownRef.current) {
      clearInterval(preCountdownRef.current);
      preCountdownRef.current = null;
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    if (recordedVideoUrl) {
      try { URL.revokeObjectURL(recordedVideoUrl); } catch (e) { console.error(e); }
    }
    setShowVideoModal(false);
    setIsRecording(false);
    setRecordedVideoUrl(null);
    setPreCountdown(0);
    setTimeLeft(0);
    recordedChunksRef.current = [];
    recordedBlobRef.current = null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600"></div>
          <p className="text-gray-600 font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Determine appeal eligibility
  const isVerified = form.verification_status === 'verified';
  const isRejected = form.verification_status === 'rejected';
  const canAppeal = isRejected; // Only rejected users can appeal

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile Settings</h1>
            <p className="text-gray-600">Manage your personal information and verification documents</p>
          </div>
          <form onSubmit={(e) => e.preventDefault()} className="bg-white rounded-lg shadow-sm divide-y divide-gray-100">

            {/* Personal Information Section */}
            <div className="p-8">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <input value={form.email || ""} readOnly className="w-full px-4 py-3 bg-gray-100 border-0 rounded-lg text-gray-600 cursor-not-allowed" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Verification Status</label>
                  <div className="w-full px-4 py-3 bg-gray-100 border-0 rounded-lg">
                    <div className="flex items-center space-x-2">
                      {form.verification_status === 'verified' ? (
                        <>
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-green-600 font-medium">Verified</span>
                        </>
                      ) : form.verification_status === 'pending' ? (
                        <>
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          <span className="text-yellow-600 font-medium">Pending</span>
                        </>
                      ) : form.verification_status === 'rejected' ? ( // Added rejected status
                        <>
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span className="text-red-600 font-medium">Rejected</span>
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span className="text-red-600 font-medium">Unverified</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">First Name</label>
                  <input name="first_name" value={form.first_name || ""} onChange={handleChange} placeholder="Enter your first name" className="w-full px-4 py-3 bg-gray-50 border-0 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Last Name</label>
                  <input name="last_name" value={form.last_name || ""} onChange={handleChange} placeholder="Enter your last name" className="w-full px-4 py-3 bg-gray-50 border-0 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Contact Number</label>
                  <input name="contact_number" value={form.contact_number || ""} onChange={handleChange} placeholder="Enter your contact number" className="w-full px-4 py-3 bg-gray-50 border-0 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Address</label>
                  <textarea name="address" value={form.address || ""} onChange={handleChange} placeholder="Enter your complete address" rows={4} className="w-full px-4 py-3 bg-gray-50 border-0 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all resize-none" style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }} />
                </div>
              </div>
              {/* Save Changes Button for Personal Info */}
              <div className="mt-8 flex justify-end">
                <button
                  type="button" // Changed to button to prevent form submission
                  onClick={handleSubmit} // Calls handleSubmit with isAppeal = false
                  disabled={savingPersonal}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg"
                >
                  {savingPersonal ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>

            {/* Verification Documents Section */}
            <div className="p-8">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Verification Documents</h2>
              </div>

              {/* Disclaimer based on verification status */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
                {isVerified ? (
                  <p><strong>Note:</strong> Your account is already verified. You do not need to appeal.</p>
                ) : isRejected ? (
                  <p><strong>Appeal:</strong> Your previous verification was rejected. You can re-upload your documents to appeal the decision.</p>
                ) : (
                  <p><strong>Status:</strong> Your verification is currently pending or unverified. Please wait for admin review or complete the initial verification process.</p>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Government ID */}
                <div className="space-y-4">
                  <label className="text-sm font-medium text-gray-700">Government ID</label>
                  <div className="relative group">
                    {mediaUrls.government_id_key ? (
                      <img
                        src={mediaUrls.government_id_key}
                        alt="Government ID"
                        className="w-full h-48 object-contain rounded-lg bg-gray-100 border"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center border border-dashed border-gray-300">
                        <span className="text-gray-400">No image uploaded</span>
                      </div>
                    )}
                    <input
                      type="file"
                      name="government_id_key"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={!canAppeal} // Disable if not eligible to appeal
                    />
                  </div>
                  {/* Change Photo Button */}
                  <div className="flex justify-center">
                    <label
                      htmlFor="government_id_key"
                      className={`text-xs ${canAppeal ? 'text-blue-600 hover:text-blue-800 cursor-pointer' : 'text-gray-400 cursor-not-allowed'}`}
                    >
                      Change Photo
                    </label>
                  </div>
                </div>
                {/* Selfie ID */}
                <div className="space-y-4">
                  <label className="text-sm font-medium text-gray-700">Selfie with ID</label>
                  <div className="relative group">
                    {mediaUrls.selfie_id_key ? (
                      <img
                        src={mediaUrls.selfie_id_key}
                        alt="Selfie ID"
                        className="w-full h-48 object-contain rounded-lg bg-gray-100 border"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center border border-dashed border-gray-300">
                        <span className="text-gray-400">No image uploaded</span>
                      </div>
                    )}
                    <input
                      type="file"
                      name="selfie_id_key"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={!canAppeal} // Disable if not eligible to appeal
                    />
                  </div>
                  {/* Change Photo Button */}
                  <div className="flex justify-center">
                    <label
                      htmlFor="selfie_id_key"
                      className={`text-xs ${canAppeal ? 'text-blue-600 hover:text-blue-800 cursor-pointer' : 'text-gray-400 cursor-not-allowed'}`}
                    >
                      Change Photo
                    </label>
                  </div>
                </div>
                {/* Verification Video */}
                <div className="space-y-4">
                  <label className="text-sm font-medium text-gray-700">Verification Video</label>
                  {/* Show the newly recorded/staged video preview first, then the saved one, then the placeholder */}
                  {files["verification_video_key"] || mediaUrls.verification_video_key_for_preview ? (
                     <video src={mediaUrls.verification_video_key_for_preview || URL.createObjectURL(files["verification_video_key"])} controls className="w-full h-48 object-cover rounded-lg bg-gray-100 border" />
                  ) : mediaUrls.verification_video_key ? (
                    <video src={mediaUrls.verification_video_key} controls className="w-full h-48 object-cover rounded-lg bg-gray-100 border" />
                  ) : (
                    <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center border border-dashed border-gray-300">
                      <span className="text-gray-400">No video recorded</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={openVideoModal}
                    disabled={!canAppeal} // Disable if not eligible to appeal
                    className={`w-full h-12 ${canAppeal ? 'bg-blue-50 hover:bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400 cursor-not-allowed'} rounded-lg`}
                  >
                    Record Video
                  </button>
                </div>
              </div>

              {/* Appeal Verification Button */}
              <div className="mt-8 flex justify-end">
                <button
                  type="button" // Changed to button to prevent form submission
                  onClick={(e) => handleSubmit(e, true)} // Calls handleSubmit with isAppeal = true
                  disabled={appealing || !canAppeal} // Disable if appealing or not eligible
                  className={`px-8 py-3 rounded-lg font-medium ${canAppeal ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                >
                  {appealing ? "Submitting Appeal..." : "Appeal Verification"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Video Modal (Enhanced) */}
      {showVideoModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeVideoModal}>
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-2xl relative" onClick={e => e.stopPropagation()}>
            <header className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">
                {recordedVideoUrl ? 'Review Video' : 'Record Video'}
              </h3>
              <button onClick={closeVideoModal} className="text-gray-400 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
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
              {!recordedVideoUrl && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full px-4">
                  {isRecording ? (
                    <button onClick={stopRecording} className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors">
                      <div className="w-3 h-3 bg-white rounded-sm" /><span>Stop Recording</span>
                    </button>
                  ) : (
                    <button onClick={startRecording} className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors">
                      <div className="w-3 h-3 bg-white rounded-full animate-pulse" /><span>Start Recording</span>
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
                        try { URL.revokeObjectURL(recordedVideoUrl); } catch (e) { console.error(e); }
                      }
                      setRecordedVideoUrl(null);
                      recordedBlobRef.current = null;
                      recordedChunksRef.current = [];
                      setPreCountdown(0);
                      setTimeLeft(0);
                      // Re-open camera fresh for a new recording
                      openVideoModal();
                    }}
                    className="px-6 py-2 border border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
                  >
                    Retake
                  </button>
                  <button
                    type="button"
                    onClick={() => { // Confirm
                      // 1. Create File object from the recorded Blob and store in state
                      if (recordedBlobRef.current) {
                        const videoFile = new File([recordedBlobRef.current], "verification-video.webm", { type: "video/webm" });
                        setFiles(prev => ({ ...prev, verification_video_key: videoFile }));
                        // 2. Update mediaUrls immediately for preview before modal closes
                        const previewUrl = URL.createObjectURL(recordedBlobRef.current);
                        setMediaUrls(prev => ({ ...prev, verification_video_key_for_preview: previewUrl }));
                      }
                      // 3. Close the modal and clean up (including stopping the camera)
                      closeVideoModal();
                    }}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Confirm & Use Video</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={closeVideoModal}
                    className="px-6 py-2 border border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}