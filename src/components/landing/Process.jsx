import { RotateCcw, CreditCard } from "lucide-react"

export default function Process() {
  return (
    <section className="py-16 sm:py-24 lg:py-32 px-5 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 sm:mb-16 lg:mb-20">
          <h2 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 sm:mb-8 leading-tight px-4">
            <span className="block text-black">SIMPLE</span>
            <span className="block text-gray-500">PROCESS</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 xl:gap-16">
          <div className="bg-gray-50 border border-gray-200 p-6 sm:p-8 lg:p-12 rounded-xl sm:rounded-2xl lg:rounded-3xl text-center space-y-5 sm:space-y-6 lg:space-y-8 hover:bg-gray-100 transition-all duration-500 hover:scale-105 hover:shadow-elegant group backdrop-blur-sm">
            <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-black text-white flex items-center justify-center mx-auto rounded-xl sm:rounded-2xl lg:rounded-3xl group-hover:shadow-glow transition-all duration-300">
              <RotateCcw className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12" />
            </div>
            <h3 className="text-xl sm:text-2xl lg:text-4xl font-bold tracking-[0.1em] text-black px-4">
              EASY RETURNS
            </h3>
            <p className="text-gray-600 font-light leading-relaxed text-sm sm:text-base lg:text-xl px-4 sm:px-0">
              Hassle-free return process at our España, Manila location. Quick inspection and immediate confirmation.
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 p-6 sm:p-8 lg:p-12 rounded-xl sm:rounded-2xl lg:rounded-3xl text-center space-y-5 sm:space-y-6 lg:space-y-8 hover:bg-gray-100 transition-all duration-500 hover:scale-105 hover:shadow-elegant group backdrop-blur-sm">
            <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-black text-white flex items-center justify-center mx-auto rounded-xl sm:rounded-2xl lg:rounded-3xl group-hover:shadow-glow transition-all duration-300">
              <CreditCard className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12" />
            </div>
            <h3 className="text-xl sm:text-2xl lg:text-4xl font-bold tracking-[0.1em] text-black px-4">
              SECURE PAYMENTS
            </h3>
            <p className="text-gray-600 font-light leading-relaxed text-sm sm:text-base lg:text-xl px-4 sm:px-0">
              Multiple payment options with bank-level security. GCash, card payments, and online banking accepted.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
