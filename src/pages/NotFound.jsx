"use client"

import { Link } from "react-router-dom"
import { CameraOff, ArrowLeft } from "lucide-react"

/**
 * 404 – Not Found
 * Clean and minimal design with Rawlens Admin dark theme
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-950 to-gray-900 text-white px-6">
      {/* Subtle background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-md w-full text-center space-y-8 animate-fade-in relative z-10">
        {/* Large 404 */}
        <h1 className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
          404
        </h1>

        {/* Icon and message */}
        <div className="space-y-4">
          <div className="w-16 h-16 flex items-center justify-center rounded-xl bg-blue-600/20 border border-blue-600/30 mx-auto">
            <CameraOff className="w-8 h-8 text-blue-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white">Page Not Found</h2>
            <p className="text-gray-400">The page you're looking for doesn't exist.</p>
          </div>
        </div>

        {/* Back button */}
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>

      <style>{`
        @keyframes fade-in { 
          from { opacity: 0; transform: translateY(12px); } 
          to { opacity: 1; transform: translateY(0); } 
        }
        .animate-fade-in { 
          animation: fade-in 0.6s ease-out both; 
        }
      `}</style>
    </div>
  )
}
