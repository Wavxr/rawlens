import { Camera } from "lucide-react"

export default function Header() {
  return (
    <header className="border-b border-gray-200 bg-white/80 backdrop-blur-xl sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-3 lg:py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-black text-white flex items-center justify-center rounded-xl sm:rounded-2xl">
              <Camera className="h-3.5 w-3.5 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
            </div>
            <div>
              <span className="text-lg sm:text-2xl lg:text-3xl font-bold tracking-tight text-black">
                RAWLENS
              </span>
              <div className="text-[9px] sm:text-xs lg:text-sm text-gray-600 font-semibold tracking-widest uppercase">
                CAMERA RENTALS
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 sm:space-x-3 lg:space-x-4">
            <button
              onClick={() => (window.location.href = "/login")}
              className="border border-gray-300 bg-white text-black hover:bg-gray-50 hover:border-gray-400 font-medium px-3 sm:px-6 lg:px-8 py-1.5 lg:py-2.5 text-xs sm:text-sm lg:text-base tracking-wide transition-all duration-300 hover:scale-105 active:scale-95 rounded-lg sm:rounded-xl lg:rounded-2xl"
            >
              LOGIN
            </button>
            <button
              onClick={() => (window.location.href = "/signup")}
              className="bg-black text-white hover:shadow-glow font-semibold px-3 sm:px-6 lg:px-8 py-1.5 lg:py-2.5 text-xs sm:text-sm lg:text-base tracking-wide transition-all duration-300 hover:scale-105 active:scale-95 rounded-lg sm:rounded-xl lg:rounded-2xl"
            >
              SIGN UP
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
