export default function CameraCollection({ cameras = [] }) {
  const hasCameras = cameras.length > 0

  return (
    <section id="cameras" className="py-10 sm:py-14 lg:py-24 px-5 lg:px-8 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10 sm:mb-14 lg:mb-20">
          <h2 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 sm:mb-6 leading-tight px-4">
            <span className="block text-black">OUR</span>
            <span className="block text-gray-500">COLLECTION</span>
          </h2>
        </div>

        {!hasCameras && (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">Loading cameras...</p>
          </div>
        )}

        <div className="space-y-10 sm:space-y-14 lg:space-y-24">
          {cameras.map((camera, index) => {
            const isEvenIndex = index % 2 === 1
            const hasInclusions = camera.inclusions && camera.inclusions.length > 0

            return (
              <div
                key={camera.name}
                className="grid lg:grid-cols-2 gap-6 sm:gap-10 lg:gap-20 items-center"
              >
                <div className={`${isEvenIndex ? "lg:order-2" : ""} relative group`}>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-2xl sm:rounded-[3rem] transform rotate-1 scale-105 opacity-5 group-hover:opacity-10 transition-opacity duration-500"></div>
                  <img
                    src={camera.image_url || "/placeholder.svg"}
                    alt={camera.name}
                    className="relative w-full max-w-xs sm:max-w-sm lg:max-w-lg mx-auto object-contain group-hover:scale-105 transition-transform duration-700 rounded-2xl sm:rounded-3xl"
                  />
                </div>

                <div className={`space-y-4 sm:space-y-6 lg:space-y-8 ${isEvenIndex ? "lg:order-1" : ""} px-4 sm:px-0`}>
                  <div>
                    <div className="text-[10px] sm:text-xs lg:text-sm text-blue-500 font-medium mb-2 sm:mb-3 lg:mb-4 tracking-[0.15em] uppercase">
                      CAMERA
                    </div>
                    <h3 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-2 sm:mb-3 lg:mb-5 leading-tight text-black">
                      {camera.name}
                    </h3>
                    <p className="text-sm sm:text-base lg:text-xl text-gray-600 font-light mb-3 sm:mb-5 lg:mb-6 leading-relaxed">
                      {camera.description}
                    </p>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 p-4 sm:p-5 lg:p-8 rounded-xl sm:rounded-2xl lg:rounded-3xl backdrop-blur-sm">
                    <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-4 sm:mb-6 lg:mb-8">
                      <div>
                        <div className="text-[10px] sm:text-xs lg:text-sm text-gray-600 mb-1.5 sm:mb-2 lg:mb-3 tracking-[0.15em] font-medium">
                          1-3 DAYS
                        </div>
                        <div className="text-lg sm:text-lg lg:text-2xl font-bold text-black">
                          ₱{camera.price_1to3 ?? "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] sm:text-xs lg:text-sm text-gray-600 mb-1.5 sm:mb-2 lg:mb-3 tracking-[0.15em] font-medium">
                          4+ DAYS
                        </div>
                        <div className="text-lg sm:text-lg lg:text-2xl font-bold text-blue-500">
                          ₱{camera.price_4plus ?? "—"}
                        </div>
                      </div>
                    </div>

                    {hasInclusions && (
                      <div className="space-y-2 sm:space-y-3 lg:space-y-4">
                        {camera.inclusions.map((feature, i) => (
                          <div key={i} className="flex items-center text-black">
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full mr-2 sm:mr-3 lg:mr-4"></div>
                            <span className="font-medium text-xs sm:text-sm lg:text-base">{feature}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
