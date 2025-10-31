import { useEffect, useState, useRef } from "react";
import { updateUserProfile } from "../../services/userService";
import { getSignedUrl } from "../../services/storageService";
import { subscribeToUserUpdates, unsubscribeFromChannel } from "../../services/realtimeService";
import useAuthStore from "../../stores/useAuthStore";
import useSettingsStore from "../../stores/settingsStore";
import PushNotificationPrompt from "../../components/notifications/PushNotificationPrompt";
import UserNotificationSettings from "../../components/notifications/UserNotificationSettings";
import useBackHandler from "../../hooks/useBackHandler";
import { 
  LogOut, User, Shield, Bell, Camera, Upload, X, 
  Check, Clock, AlertCircle, Video, RotateCcw, 
  CheckCircle, Phone, MapPin, Mail, Image
} from "lucide-react";

export default function Profile() {
    // State Management
  const { user, profile, loading: authLoading } = useAuthStore();
  const { settings, init: initSettings} = useSettingsStore();
  const userId = user?.id;
  const [form, setForm] = useState({});
  const [originalForm, setOriginalForm] = useState({});
  const [mediaUrls, setMediaUrls] = useState({});
  const [files, setFiles] = useState({});
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [appealing, setAppealing] = useState(false);

  // Video Recording State
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState({ show: false, url: '', title: '' });
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState(null);
  const [stream, setStream] = useState(null);
  const [preCountdown, setPreCountdown] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingTimeoutRef = useRef(null);
  const recordedBlobRef = useRef(null);
  const preCountdownRef = useRef(null);
  const recordingIntervalRef = useRef(null);

  // Back handler for modals
  useBackHandler(showVideoModal, () => {
    if (!isRecording) {
      closeVideoModal();
    }
  }, 100);

  useBackHandler(showImagePreview.show, () => {
    setShowImagePreview({ show: false, url: '', title: '' });
  }, 100);

  // Data Loading and Subscription
  useEffect(() => {
    if (profile) {
      // Sync profile data to local form state
      const newForm = { ...profile };
      setForm(newForm);
      setOriginalForm(newForm);
      // Fetch the media URLs for the profile
      refreshMediaUrls(profile);
    }
  }, [profile]);

  // Settings Initialization
  useEffect(() => {
    if (userId && !settings) {
      initSettings(userId);
    }
  }, [userId, settings, initSettings]);

  // Effect to clean up camera stream on component unmount or when modal closes
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Real-time subscription to user profile changes
  useEffect(() => {
    if (userId) {
      const handleUserUpdate = (payload) => {
        console.log('Real-time update received for user profile. Refetching data...', payload);
        useAuthStore.getState().fetchUserData(userId);
      };

      const subscription = subscribeToUserUpdates(userId, handleUserUpdate);

      return () => {
        if (subscription) {
          unsubscribeFromChannel(subscription);
        }
      };
    }
  }, [userId]);

  // Media URL Generator
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

  // Form Handlers
  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function handleFileChange(e) {
    const { name, files: fileList } = e.target;
    if (!fileList[0]) return;
    const file = fileList[0];
    setFiles(prev => ({ ...prev, [name]: file }));
    setMediaUrls(prev => ({ ...prev, [name]: URL.createObjectURL(file) }));
  }

  // Form Submission
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
        updates.is_appealing = true;
        if (files.government_id_key) filesToUpload.government_id_key = files.government_id_key;
        if (files.selfie_id_key) filesToUpload.selfie_id_key = files.selfie_id_key;
        if (recordedBlobRef.current) {
          const videoFile = new File([recordedBlobRef.current], "verification-video.webm", { type: "video/webm" });
          filesToUpload.verification_video_key = videoFile;
          const previewUrl = URL.createObjectURL(recordedBlobRef.current);
          setMediaUrls(prev => ({ ...prev, verification_video_key_for_preview: previewUrl }));
        } else if (files.verification_video_key) {
          filesToUpload.verification_video_key = files.verification_video_key;
        }
        if (Object.keys(filesToUpload).length === 0) {
          alert("Please provide at least one new verification document to appeal.");
          setAppealing(false);
          return;
        }
      } else {
        for (const key of ["first_name", "last_name", "contact_number", "address"]) {
          if (form[key] !== originalForm[key]) updates[key] = form[key];
        }
        filesToUpload = {};
      }
      await updateUserProfile(userId, updates, filesToUpload);
      if (isAppeal) {
        alert("Verification appeal submitted successfully!");
      } else {
        alert("Personal information updated successfully!");
      }

      // Re-fetch user data to update the global store, which will trigger
      // the useEffect to update the local form state and media URLs.
      await useAuthStore.getState().fetchUserData(userId);

      // Reset local file/video state
      setFiles({});
      setRecordedVideoUrl(null);
      recordedBlobRef.current = null;
      recordedChunksRef.current = [];
    } catch (error) {
      alert(`Failed to update profile: ${error.message || "Please try again."}`);
    } finally {
      if (isAppeal) {
        setAppealing(false);
      } else {
        setSavingPersonal(false);
      }
    }
  }

  // Video Recording Functions
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
        videoRef.current.muted = true;
      }
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
        
        if (videoRef.current)  videoRef.current.srcObject = null;
        
        if (stream) stream.getTracks().forEach(t => t.stop()); 
        
        setStream(null);
        setRecordedVideoUrl(videoUrl);
      };
    } catch {
      alert("Unable to access camera/mic. Please check permissions.");
      setShowVideoModal(false);
    }
  }

  const startRecording = () => {
    if (!mediaRecorderRef.current) return;
    setPreCountdown(3);
    if (preCountdownRef.current) clearInterval(preCountdownRef.current);
    preCountdownRef.current = setInterval(() => {
      setPreCountdown(prev => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(preCountdownRef.current);
          recordedChunksRef.current = [];
          mediaRecorderRef.current.start();
          setIsRecording(true);
          setTimeLeft(10);
          if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = setInterval(() => {
            setTimeLeft(t => {
              const nt = t - 1;
              return nt >= 0 ? nt : 0;
            });
          }, 1000);
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
    if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl); 
    
    setShowVideoModal(false);
    setIsRecording(false);
    setRecordedVideoUrl(null);
    setPreCountdown(0);
    setTimeLeft(0);
    recordedChunksRef.current = [];
    recordedBlobRef.current = null;
  };

  // Logout Handler
  const handleLogout = async () => {
    try {
      console.log('🎯 User handleLogout starting...');
      
      // Always clear local state first as a safety measure
      const authStore = useAuthStore.getState();
      
      await authStore.logout();
      console.log('✅ User logout completed, navigating...');
      
      // Force navigation with replace to prevent back button issues
      window.location.href = "/login";
      
      // Additional cleanup - clear any remaining browser state
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        });
      }
      
    } catch (error) {
      console.error('❌ User logout error:', error);
      
      // Force cleanup and navigation even on error
      useAuthStore.getState().forceCleanup();
      window.location.href = "/login";
    }
  };

  // Loading States
  if (authLoading && !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-3 border-gray-200 border-t-blue-600"></div>
          <p className="text-gray-600 font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!authLoading && !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">Profile data could not be loaded.</p>
        </div>
      </div>
    );
  }

  // UI Rendering
  const isVerified = form.verification_status === 'verified';
  const isRejected = form.verification_status === 'rejected';
  const isPending = form.verification_status === 'pending';
  const canSubmitDocuments = !isVerified;
  const isAppealing = form.is_appealing;

  // Status badge component
  const StatusBadge = () => {
    const statusConfig = {
      verified: { 
        icon: CheckCircle, 
        text: 'Verified', 
        bgColor: 'bg-green-50', 
        textColor: 'text-green-700',
        iconColor: 'text-green-600'
      },
      pending: { 
        icon: Clock, 
        text: 'Pending Review', 
        bgColor: 'bg-amber-50', 
        textColor: 'text-amber-700',
        iconColor: 'text-amber-600'
      },
      rejected: { 
        icon: AlertCircle, 
        text: 'Rejected', 
        bgColor: 'bg-red-50', 
        textColor: 'text-red-700',
        iconColor: 'text-red-600'
      },
      unverified: { 
        icon: AlertCircle, 
        text: 'Unverified', 
        bgColor: 'bg-gray-50', 
        textColor: 'text-gray-700',
        iconColor: 'text-gray-600'
      }
    };

    const status = form.verification_status || 'unverified';
    const config = statusConfig[status] || statusConfig.unverified;
    const Icon = config.icon;

    return (
      <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full ${config.bgColor}`}>
        <Icon className={`h-4 w-4 ${config.iconColor}`} />
        <span className={`text-sm font-medium ${config.textColor}`}>{config.text}</span>
      </div>
    );
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
          <div className="max-w-5xl mx-auto px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Profile</h1>
                <p className="text-sm text-gray-600 mt-0.5">Manage your account settings</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-3 sm:px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Logout</span>
              </button>
            </div>
          </div>
        

        {/* Content */}
        <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-6">
          {/* Push Notification Prompt */}
          <PushNotificationPrompt userId={userId} />

          {/* Personal Information Section */}
          <section>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span>Email</span>
                  </label>
                  <input 
                    value={form.email || ""} 
                    readOnly 
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 text-sm"
                  />
                </div>
                
                <div>
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                    <Shield className="h-4 w-4 text-gray-400" />
                    <span>Status</span>
                  </label>
                  <div className="flex items-center h-[42px]">
                    <StatusBadge />
                  </div>
                </div>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">First Name</label>
                  <input 
                    name="first_name" 
                    value={form.first_name || ""} 
                    onChange={handleChange} 
                    placeholder="Your first name" 
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Last Name</label>
                  <input 
                    name="last_name" 
                    value={form.last_name || ""} 
                    onChange={handleChange} 
                    placeholder="Your last name" 
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Contact Number */}
              <div>
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>Contact Number</span>
                </label>
                <input 
                  name="contact_number" 
                  value={form.contact_number || ""} 
                  onChange={handleChange} 
                  placeholder="Your contact number" 
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Address */}
              <div>
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span>Address</span>
                </label>
                <textarea 
                  name="address" 
                  value={form.address || ""} 
                  onChange={handleChange} 
                  placeholder="Your complete address" 
                  rows={3} 
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingPersonal}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {savingPersonal ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </section>

          {/* Verification Documents Section */}
          <section>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Verification Documents</h2>
            </div>

            {/* Status Message */}
            <div className={`mb-6 p-4 rounded-lg border ${
              isVerified 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : isAppealing 
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : isRejected 
                ? 'bg-red-50 border-red-200 text-red-800'
                : isPending
                ? 'bg-blue-50 border-blue-200 text-blue-800'
                : 'bg-gray-50 border-gray-200 text-gray-800'
            }`}>
              <p className="text-sm leading-relaxed">
                {isVerified ? (
                  <><strong>Verified:</strong> Your account is verified. No further action needed.</>
                ) : isAppealing ? (
                  <><strong>Under Review:</strong> Your documents are being reviewed by our team.</>
                ) : isRejected ? (
                  <><strong>Action Required:</strong> Please re-upload your documents to appeal the rejection.</>
                ) : isPending ? (
                  <><strong>Pending:</strong> Your verification is being processed. This may take up to 24 hours.</>
                ) : (
                  <><strong>Get Verified:</strong> Upload your documents to unlock full platform access.</>
                )}
              </p>
            </div>

            {/* Document Upload Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Government ID */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-3 block">Government ID</label>
                <div className="relative group">
                  <div 
                    className="aspect-[4/3] rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 overflow-hidden cursor-pointer hover:border-blue-400 transition-colors"
                    onClick={() => mediaUrls.government_id_key && setShowImagePreview({ 
                      show: true, 
                      url: mediaUrls.government_id_key, 
                      title: 'Government ID' 
                    })}
                  >
                    {mediaUrls.government_id_key ? (
                      <img
                        src={mediaUrls.government_id_key}
                        alt="Government ID"
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                        <Image className="h-8 w-8 mb-2" />
                        <span className="text-xs">No image</span>
                      </div>
                    )}
                  </div>
                  
                  {canSubmitDocuments && (
                    <label className="mt-2 flex items-center justify-center space-x-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors">
                      <Upload className="h-4 w-4" />
                      <span>{mediaUrls.government_id_key ? 'Change' : 'Upload'}</span>
                      <input
                        type="file"
                        name="government_id_key"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Selfie with ID */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-3 block">Selfie with ID</label>
                <div className="relative group">
                  <div 
                    className="aspect-[4/3] rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 overflow-hidden cursor-pointer hover:border-blue-400 transition-colors"
                    onClick={() => mediaUrls.selfie_id_key && setShowImagePreview({ 
                      show: true, 
                      url: mediaUrls.selfie_id_key, 
                      title: 'Selfie with ID' 
                    })}
                  >
                    {mediaUrls.selfie_id_key ? (
                      <img
                        src={mediaUrls.selfie_id_key}
                        alt="Selfie ID"
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                        <Image className="h-8 w-8 mb-2" />
                        <span className="text-xs">No image</span>
                      </div>
                    )}
                  </div>
                  
                  {canSubmitDocuments && (
                    <label className="mt-2 flex items-center justify-center space-x-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors">
                      <Upload className="h-4 w-4" />
                      <span>{mediaUrls.selfie_id_key ? 'Change' : 'Upload'}</span>
                      <input
                        type="file"
                        name="selfie_id_key"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Verification Video */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-3 block">Verification Video</label>
                <div className="aspect-[4/3] rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 overflow-hidden">
                  {files["verification_video_key"] || mediaUrls.verification_video_key_for_preview ? (
                    <video 
                      src={mediaUrls.verification_video_key_for_preview || URL.createObjectURL(files["verification_video_key"])} 
                      controls 
                      className="w-full h-full object-cover"
                    />
                  ) : mediaUrls.verification_video_key ? (
                    <video 
                      src={mediaUrls.verification_video_key} 
                      controls 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                      <Video className="h-8 w-8 mb-2" />
                      <span className="text-xs">No video</span>
                    </div>
                  )}
                </div>
                
                {canSubmitDocuments && (
                  <button
                    type="button"
                    onClick={openVideoModal}
                    className="mt-2 w-full flex items-center justify-center space-x-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Camera className="h-4 w-4" />
                    <span>Record Video</span>
                  </button>
                )}
              </div>
            </div>

            {/* Submit Button */}
            {canSubmitDocuments && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, true)}
                  disabled={appealing}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {appealing ? "Submitting..." : isRejected ? "Submit Appeal" : "Submit for Verification"}
                </button>
              </div>
            )}
          </section>

          {/* Notification Settings Section */}
          <section>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
            </div>
            <UserNotificationSettings />
          </section>
        </div>
      </div>

      {/* Image Preview Modal */}
      {showImagePreview.show && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setShowImagePreview({ show: false, url: '', title: '' })}
        >
          <div className="relative w-full max-w-4xl">
            <button
              onClick={() => setShowImagePreview({ show: false, url: '', title: '' })}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={showImagePreview.url}
              alt={showImagePreview.title}
              className="w-full h-auto rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Video Recording Modal */}
      {showVideoModal && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => !isRecording && closeVideoModal()}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {recordedVideoUrl ? 'Review Your Video' : 'Record Verification Video'}
              </h3>
              <button 
                onClick={closeVideoModal}
                disabled={isRecording}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Video Area */}
            <div className="relative bg-black aspect-video">
              {recordedVideoUrl ? (
                <video
                  src={recordedVideoUrl}
                  controls
                  playsInline
                  className="w-full h-full"
                />
              ) : (
                <>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Pre-countdown Overlay */}
                  {preCountdown > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <div className="text-white text-7xl font-bold">
                        {preCountdown}
                      </div>
                    </div>
                  )}

                  {/* Recording Indicator */}
                  {isRecording && (
                    <div className="absolute top-4 right-4 flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-full">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      <span className="text-sm font-medium">{timeLeft}s</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              {recordedVideoUrl ? (
                <div className="flex items-center justify-end space-x-3">
                  <button
                    onClick={() => {
                      if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);
                      setRecordedVideoUrl(null);
                      recordedBlobRef.current = null;
                      recordedChunksRef.current = [];
                      setPreCountdown(0);
                      setTimeLeft(0);
                      openVideoModal();
                    }}
                    className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Retake</span>
                  </button>
                  <button
                    onClick={() => {
                      if (recordedBlobRef.current) {
                        const videoFile = new File([recordedBlobRef.current], "verification-video.webm", { type: "video/webm" });
                        setFiles(prev => ({ ...prev, verification_video_key: videoFile }));
                        const previewUrl = URL.createObjectURL(recordedBlobRef.current);
                        setMediaUrls(prev => ({ ...prev, verification_video_key_for_preview: previewUrl }));
                      }
                      closeVideoModal();
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <Check className="h-4 w-4" />
                    <span>Use This Video</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  {isRecording ? (
                    <button 
                      onClick={stopRecording}
                      className="flex items-center space-x-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      <div className="w-3 h-3 bg-white rounded-sm" />
                      <span>Stop Recording</span>
                    </button>
                  ) : (
                    <button 
                      onClick={startRecording}
                      disabled={preCountdown > 0}
                      className="flex items-center space-x-2 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg transition-colors"
                    >
                      <div className="w-3 h-3 bg-white rounded-full" />
                      <span>{preCountdown > 0 ? `Starting in ${preCountdown}...` : 'Start Recording'}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}