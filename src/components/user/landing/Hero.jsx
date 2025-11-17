import { ArrowRight, Play } from "lucide-react"

export default function Hero() {
  const scrollToCameras = () => {
    document.getElementById("cameras")?.scrollIntoView({ behavior: "smooth" })
  }

  const scrollToContact = () => {
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <section className="relative py-5 lg:py-0 px-5 lg:px-8 overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 tech-grid">
      <div className="absolute inset-0 hero-background-glow"></div>
      <div className="max-w-7xl mx-auto relative">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center min-h-[85vh]">
          <div className="space-y-6 lg:space-y-10 text-center lg:text-left">
            <div className="space-y-4 lg:space-y-8">
              <div className="inline-flex items-center bg-blue-100 border border-blue-200 text-blue-600 px-3 py-1.5 font-medium tracking-[0.15em] text-xs rounded-full backdrop-blur-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 animate-glow-pulse"></div>
                ESPAÑA, MANILA • PREMIUM RENTALS
              </div>

              <h1 className="text-4xl sm:text-7xl md:text-8xl lg:text-8xl font-bold leading-[0.85] tracking-tight">
                <span className="block text-black">CAPTURE</span>
                <span className="block text-gray-500">EVERYTHING</span>
              </h1>

              <p className="text-lg lg:text-2xl text-gray-600 font-light leading-relaxed max-w-xl mx-auto lg:mx-0">
                Professional camera equipment for creators, travelers, and storytellers. Premium quality made
                accessible.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 lg:gap-6 justify-center lg:justify-start">
              <button
                onClick={scrollToCameras}
                className="group bg-black text-white font-semibold px-6 py-3 text-base tracking-wide transition-all duration-300 hover:shadow-glow hover:scale-105 active:scale-95 inline-flex items-center justify-center rounded-2xl lg:px-8 lg:py-4 lg:text-lg"
              >
                <span>EXPLORE COLLECTION</span>
                <ArrowRight className="ml-3 h-4 w-4 lg:h-5 lg:w-5 group-hover:translate-x-1 transition-transform duration-300" />
              </button>

              <button
                onClick={scrollToContact}
                className="group border border-gray-300 bg-white/60 backdrop-blur-sm text-black hover:bg-gray-50 hover:border-gray-400 font-semibold px-6 py-3 text-base tracking-wide transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center rounded-2xl lg:px-8 lg:py-4 lg:text-lg"
              >
                <Play className="mr-3 h-4 w-4 lg:h-5 lg:w-5 group-hover:scale-110 transition-transform duration-300" />
                <span>GET STARTED?</span>
              </button>
            </div>
          </div>

          <div className="relative lg:mt-0">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 rounded-[3rem] transform rotate-6 scale-110 opacity-20 blur-3xl"></div>
              <div className="absolute inset-0 bg-gradient-to-l from-blue-300 to-indigo-400 rounded-[3rem] transform -rotate-6 scale-125 opacity-15 blur-3xl"></div>

              <img
                src="/hero-camera.jpg"
                alt="Premium Camera Collection"
                className="relative w-full max-w-2xl mx-auto object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-700 rounded-3xl"
              />
              <div className="absolute -top-6 -right-6 lg:-top-8 lg:-right-8 bg-blue-500 text-white px-4 lg:px-6 py-3 lg:py-4 font-bold tracking-[0.15em] text-sm lg:text-base rounded-2xl shadow-glow animate-glow-pulse">
                PREMIUM GRADE
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
