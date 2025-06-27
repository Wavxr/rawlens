"use client"

import { useState } from "react"
import { signUp } from "../services/authService"
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
} from "lucide-react"

export default function Signup() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [uploadedFiles, setUploadedFiles] = useState({
    nationalID: null,
    selfieID: null,
  })
  const navigate = useNavigate()

  const handleFileUpload = (fieldName, file) => {
    setUploadedFiles((prev) => ({
      ...prev,
      [fieldName]: file,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.target)
    const firstName = formData.get("firstName")
    const lastName = formData.get("lastName")
    const middleInitial = formData.get("middleInitial")
    const email = formData.get("email")
    const address = formData.get("address")
    const contactNumber = formData.get("contactNumber")
    const password = formData.get("password")
    const nationalID = formData.get("nationalID")
    const selfieID = formData.get("selfieID")

    // Basic validation
    if (!firstName || !lastName || !email || !address || !contactNumber || !password || !nationalID || !selfieID) {
      setError("All required fields must be filled")
      setLoading(false)
      return
    }

    const userData = { firstName, lastName, middleInitial, email, address, contactNumber }
    const { error } = await signUp(email, password, userData, nationalID, selfieID)

    if (error) {
      setError(error.message)
    } else {
      navigate("/login")
    }

    setLoading(false)
  }

  const nextStep = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1)
  }

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Camera className="h-8 w-8 text-blue-400" />
            <span className="text-2xl font-bold text-white">Rawlens</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Join Rawlens</h1>
          <p className="text-gray-400">Create your account to start renting professional cameras</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    step <= currentStep ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 border border-gray-700"
                  }`}
                >
                  {step < currentStep ? <CheckCircle className="h-5 w-5" /> : step}
                </div>
                {step < 3 && (
                  <div
                    className={`w-16 h-0.5 mx-2 transition-all ${step < currentStep ? "bg-blue-600" : "bg-gray-700"}`}
                  ></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Labels */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-16 text-sm">
            <span className={currentStep >= 1 ? "text-blue-400" : "text-gray-500"}>Personal Info</span>
            <span className={currentStep >= 2 ? "text-blue-400" : "text-gray-500"}>Contact Details</span>
            <span className={currentStep >= 3 ? "text-blue-400" : "text-gray-500"}>Verification</span>
          </div>
        </div>

        {/* Form */}
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 shadow-2xl">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm flex items-center space-x-2">
              <Shield className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-white mb-2">Personal Information</h3>
                  <p className="text-gray-400 text-sm">Tell us about yourself</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                        className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="First name"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="lastName" className="text-sm font-medium text-gray-300">
                      Last Name *
                    </label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Last name"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="middleInitial" className="text-sm font-medium text-gray-300">
                    Middle Initial
                  </label>
                  <input
                    id="middleInitial"
                    name="middleInitial"
                    type="text"
                    maxLength="1"
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="M (Optional)"
                  />
                </div>

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
                      className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </div>

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
                      className="w-full pl-10 pr-12 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Create a strong password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Contact Details */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-white mb-2">Contact Details</h3>
                  <p className="text-gray-400 text-sm">How can we reach you?</p>
                </div>

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
                      className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                      placeholder="Enter your full address"
                      required
                    />
                  </div>
                </div>

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
                      className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="+1 (555) 123-4567"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Verification */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-white mb-2">Identity Verification</h3>
                  <p className="text-gray-400 text-sm">Upload your documents for account verification</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-300 flex items-center space-x-2">
                      <Shield className="h-4 w-4 text-blue-400" />
                      <span>National ID (Front & Back) *</span>
                    </label>
                    <div className="relative">
                      <input
                        name="nationalID"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload("nationalID", e.target.files[0])}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        required
                      />
                      <div className="border-2 border-dashed border-gray-700 hover:border-blue-500 rounded-lg p-6 text-center transition-colors">
                        <Upload className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">
                          {uploadedFiles.nationalID
                            ? uploadedFiles.nationalID.name
                            : "Click to upload or drag and drop"}
                        </p>
                        <p className="text-gray-600 text-xs mt-1">PNG, JPG up to 10MB</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-300 flex items-center space-x-2">
                      <Shield className="h-4 w-4 text-blue-400" />
                      <span>Selfie Holding ID *</span>
                    </label>
                    <div className="relative">
                      <input
                        name="selfieID"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload("selfieID", e.target.files[0])}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        required
                      />
                      <div className="border-2 border-dashed border-gray-700 hover:border-blue-500 rounded-lg p-6 text-center transition-colors">
                        <Upload className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">
                          {uploadedFiles.selfieID ? uploadedFiles.selfieID.name : "Click to upload or drag and drop"}
                        </p>
                        <p className="text-gray-600 text-xs mt-1">PNG, JPG up to 10MB</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-600/10 border border-blue-600/20 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <Shield className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="text-blue-400 font-medium text-sm mb-1">Why do we need this?</h4>
                        <p className="text-gray-400 text-xs">
                          We verify all users to ensure the safety and security of our camera rental community. Your
                          documents are encrypted and stored securely.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="terms"
                    className="w-4 h-4 mt-1 bg-gray-800 border border-gray-600 rounded focus:ring-2 focus:ring-blue-500 text-blue-600"
                    required
                  />
                  <label htmlFor="terms" className="text-sm text-gray-400">
                    I agree to the{" "}
                    <a href="/terms" className="text-blue-400 hover:text-blue-300 transition-colors">
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a href="/privacy" className="text-blue-400 hover:text-blue-300 transition-colors">
                      Privacy Policy
                    </a>
                  </label>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="px-6 py-3 border border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
                >
                  Previous
                </button>
              )}

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="ml-auto bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center space-x-2 group"
                >
                  <span>Next</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="ml-auto bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center space-x-2 group"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              )}
            </div>
          </form>

          {/* Login Link */}
          <div className="mt-8 pt-6 border-t border-gray-800 text-center">
            <p className="text-gray-400">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate("/")}
            className="text-gray-500 hover:text-gray-300 text-sm transition-colors flex items-center justify-center space-x-1 mx-auto"
          >
            <span>← Back to Home</span>
          </button>
        </div>
      </div>
    </div>
  )
}
