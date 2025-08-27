"use client"

import { useState, useEffect, useRef } from "react"
import {
  Camera,
  ArrowRight,
  MapPin,
  Clock,
  Heart,
  Shield,
  Smartphone,
  CreditCard,
  RotateCcw,
} from "lucide-react"

/* -------------------------------------------------------------------------- */
/*  Mock auth hook                                                            */
/* -------------------------------------------------------------------------- */
const useAuth = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  return { user, loading, setUser }
}

/* -------------------------------------------------------------------------- */
/*  Scroll Animation Hook                                                     */
/* -------------------------------------------------------------------------- */
const useScrollAnimation = () => {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [])

  return [ref, isVisible]
}

/* -------------------------------------------------------------------------- */
/*  Data                                                                      */
/* -------------------------------------------------------------------------- */
const cameras = [
  {
    id: 1,
    name: "Canon PowerShot G7X Mark II",
    category: "Compact Premium",
    price1to3: 550,
    price4plus: 500,
    image: "/g7xmarkii.png",
    features: ["20.1MP 1-inch", "4.2x Optical Zoom", "Full HD Video"],
    description: "Reliable compact camera for all occasions",
    inclusions: ["Camera Body", "Battery", "Charger", "Memory Card", "Camera Bag"],
  },
  {
    id: 2,
    name: "Canon PowerShot G7X Mark III",
    category: "Travel Companion",
    price1to3: 600,
    price4plus: 550,
    image: "/g7xmarkiii.png",
    features: ["20.1MP 1-inch Sensor", "4K Video Recording", "Live Streaming Ready"],
    description: "Perfect for content creators and travel enthusiasts",
    inclusions: ["Camera Body", "Battery", "Charger", "Memory Card", "Carrying Case"],
  },
  {
    id: 3,
    name: "Canon EOS M100",
    category: "Content Creator",
    price1to3: 500,
    price4plus: 450,
    image: "/eosm100.webp",
    features: ["24.2MP APS-C", "Dual Pixel CMOS AF", "Built-in WiFi"],
    description: "Lightweight mirrorless for everyday photography",
    inclusions: ["Camera Body", "Kit Lens", "Battery", "Charger", "Memory Card"],
  },
  {
    id: 4,
    name: "DJI Osmo Pocket 3",
    category: "Cinematic",
    price1to3: 550,
    price4plus: 500,
    image: "/dji_osmo_3.webp",
    features: ["4K/120fps Video", "3-Axis Mechanical Gimbal", "ActiveTrack 6.0"],
    description: "Professional cinematic shots in your pocket",
    inclusions: ["DJI Pocket 3", "Creator Combo Pack", "Magnetic Mount", "Memory Cards"],
  },
  {
    id: 5,
    name: "Ricoh GR IIIx",
    category: "Street Photography",
    price1to3: 700,
    price4plus: 650,
    image: "/ricoh_gh_iiix.png",
    features: ["24.2MP APS-C", "40mm f/2.8 Lens", "Ultra Compact Design"],
    description: "Premium compact for street photography",
    inclusions: ["Camera Body", "Premium Strap", "Battery", "Charger", "Protective Case"],
  },
]

const features = [
  {
    icon: Heart,
    title: "FOR EVERY MEMORY",
    description:
      "Whether it's a family trip, date night, or solo adventure — we have the perfect camera for your story",
  },
  {
    icon: Clock,
    title: "FLEXIBLE RENTAL",
    description:
      "Rent for 1–3 days or longer periods with better rates. Perfect for any project timeline",
  },
  {
    icon: Shield,
    title: "RELIABLE GEAR",
    description:
      "Professionally maintained cameras and lenses, ready to perform every time",
  },
  {
    icon: Smartphone,
    title: "EASY TO BOOK",
    description:
      "Seamless booking through our app or website — rent in just a few taps",
  },
]


/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */
export default function Landing() {
  const { user, loading } = useAuth()
  const [heroRef, heroVisible] = useScrollAnimation()
  const [aboutRef, aboutVisible] = useScrollAnimation()
  const [featuresRef, featuresVisible] = useScrollAnimation()
  const [camerasRef, camerasVisible] = useScrollAnimation()
  const [processRef, processVisible] = useScrollAnimation()
  const [ctaRef, ctaVisible] = useScrollAnimation()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-4">
          <div className="w-6 h-6 border-2 border-black border-t-transparent animate-spin"></div>
          <div className="text-black text-lg font-light" style={{ fontFamily: 'Neue Haas Grotesk, sans-serif' }}>Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-black" style={{ fontFamily: 'Neue Haas Grotesk, sans-serif' }}>
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img
                src="/logo.png"
                alt="RAWLENS Logo"
                className="w-12 h-12 object-contain"
              />
              <div>
                <span className="text-3xl font-bold tracking-tight">RAWLENS</span>
                <div className="text-sm text-gray-600 font-light tracking-widest">CAMERA RENTALS</div>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              {user ? (
                <button
                  onClick={() => (window.location.href = "/dashboard")}
                  className="bg-black text-white font-medium px-6 py-3 tracking-wide transition-all duration-200 hover:bg-gray-800"
                >
                  DASHBOARD
                </button>
              ) : (
                <div className="flex space-x-4">
                  <button
                    onClick={() => (window.location.href = "/login")}
                    className="border border-black bg-white text-black hover:bg-black hover:text-white font-medium px-6 py-3 tracking-wide transition-all duration-200"
                  >
                    LOGIN
                  </button>
                  <button
                    onClick={() => (window.location.href = "/signup")}
                    className="bg-black text-white hover:bg-gray-800 font-medium px-6 py-3 tracking-wide transition-all duration-200"
                  >
                    SIGN UP
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section ref={heroRef} className="relative py-20 px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className={`grid lg:grid-cols-12 gap-16 items-center min-h-[70vh] transition-all duration-1000 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
            <div className="lg:col-span-6 space-y-8 relative z-10">
              <div className="space-y-6">
                <div className="inline-block bg-yellow-400 text-black px-4 py-2 font-medium tracking-widest text-sm">
                  ESPAÑA, MANILA • PREMIUM RENTALS
                </div>

                <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold leading-none tracking-tight">
                  <div className="overflow-hidden">
                    <span className="block">CAPTURE</span>
                  </div>
                  <div className="overflow-hidden">
                    <span className="block text-gray-600">EVERYTHING</span>
                  </div>
                </h1>

                <p className="text-xl text-gray-700 font-light leading-relaxed max-w-md">
                  Professional camera equipment for creators, travelers, and storytellers. 
                  Premium quality made accessible.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => document.getElementById("cameras")?.scrollIntoView({ behavior: "smooth" })}
                  className="group bg-black text-white font-medium px-8 py-4 text-lg tracking-wide transition-all duration-200 hover:bg-gray-800 inline-flex items-center justify-center"
                >
                  <span>EXPLORE COLLECTION</span>
                  <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform duration-200" />
                </button>

                <button className="group border border-black bg-white text-black hover:bg-black hover:text-white font-medium px-8 py-4 text-lg tracking-wide transition-all duration-200 flex items-center justify-center">
                  <span>CHECK AVAILABILITY</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-6 relative">
              <div className="relative">
                <img 
                  src="/g7xmarkiii.png" 
                  alt="Premium Camera" 
                  className="w-full max-w-2xl mx-auto object-contain"
                />
                <div className="absolute -top-8 -right-8 bg-yellow-400 text-black px-6 py-3 font-bold tracking-widest text-sm">
                  NEW ARRIVAL
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Product Section */}
      <section ref={aboutRef} className="py-20 px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className={`text-center mb-16 transition-all duration-1000 ${aboutVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              <span className="block">PROFESSIONAL GRADE</span>
              <span className="block text-gray-600">EQUIPMENT</span>
            </h2>
            <p className="text-xl text-gray-700 font-light max-w-2xl mx-auto">
              Every camera in our collection is meticulously maintained and tested to ensure 
              peak performance for your creative projects.
            </p>
          </div>

          <div className={`grid md:grid-cols-2 lg:grid-cols-4 gap-8 transition-all duration-1000 delay-300 ${aboutVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
            {features.map((feature, index) => (
              <div key={index} className="text-center space-y-4">
                <div className="w-16 h-16 bg-black text-white flex items-center justify-center mx-auto">
                  <feature.icon className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold tracking-widest">{feature.title}</h3>
                <p className="text-gray-700 font-light leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Camera Collection - Split Sections */}
      <section id="cameras" ref={camerasRef} className="py-20 px-8">
        <div className="max-w-7xl mx-auto">
          <div className={`text-center mb-20 transition-all duration-1000 ${camerasVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              <span className="block">OUR</span>
              <span className="block text-gray-600">COLLECTION</span>
            </h2>
          </div>

          <div className="space-y-32">
            {cameras.map((camera, index) => (
              <div 
                key={camera.id} 
                className={`grid lg:grid-cols-12 gap-16 items-center transition-all duration-1000 delay-${index * 200} ${camerasVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
              >
                <div className={`lg:col-span-6 ${index % 2 === 1 ? 'lg:order-2' : ''}`}>
                  <img 
                    src={camera.image || "/placeholder.svg"} 
                    alt={camera.name}
                    className="w-full max-w-2xl mx-auto object-contain"
                  />
                </div>
                
                <div className={`lg:col-span-6 space-y-6 ${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                  <div>
                    <div className="text-sm text-gray-600 font-medium mb-2 tracking-widest uppercase">
                      {camera.category}
                    </div>
                    <h3 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 leading-tight">{camera.name}</h3>
                    <p className="text-xl text-gray-700 font-light mb-6">{camera.description}</p>
                  </div>

                  <div className="bg-gray-100 p-6">
                    <div className="grid grid-cols-2 gap-6 mb-6">
                      <div>
                        <div className="text-sm text-gray-600 mb-2 tracking-widest">1-3 DAYS</div>
                        <div className="text-2xl font-bold">₱{camera.price1to3}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-2 tracking-widest">4+ DAYS</div>
                        <div className="text-2xl font-bold text-yellow-600">₱{camera.price4plus}</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {camera.features.map((feature, i) => (
                        <div key={i} className="flex items-center text-gray-800">
                          <div className="w-2 h-2 bg-black mr-4"></div>
                          <span className="font-medium">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section ref={processRef} className="py-20 px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className={`text-center mb-16 transition-all duration-1000 ${processVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              <span className="block">SIMPLE</span>
              <span className="block text-gray-600">PROCESS</span>
            </h2>
          </div>

          <div className={`grid md:grid-cols-2 gap-16 transition-all duration-1000 delay-300 ${processVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-black text-white flex items-center justify-center mx-auto">
                <RotateCcw className="h-10 w-10" />
              </div>
              <h3 className="text-2xl font-bold tracking-widest">EASY RETURNS</h3>
              <p className="text-gray-700 font-light leading-relaxed text-lg">
                Hassle-free return process at our España, Manila location. 
                Quick inspection and immediate confirmation.
              </p>
            </div>

            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-black text-white flex items-center justify-center mx-auto">
                <CreditCard className="h-10 w-10" />
              </div>
              <h3 className="text-2xl font-bold tracking-widest">SECURE PAYMENTS</h3>
              <p className="text-gray-700 font-light leading-relaxed text-lg">
                Multiple payment options with bank-level security. 
                GCash, card payments, and online banking accepted.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section ref={ctaRef} className="py-20 px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className={`transition-all duration-1000 ${ctaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
            <div className="inline-block bg-yellow-400 text-black px-6 py-3 font-medium tracking-widest text-sm mb-8">
              READY TO START?
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-8 leading-tight">
              <span className="block">BEGIN YOUR</span>
              <span className="block text-gray-600">CREATIVE JOURNEY</span>
            </h2>
            <p className="text-xl text-gray-700 font-light mb-12 max-w-2xl mx-auto leading-relaxed">
              Join hundreds of creators in Manila. Premium equipment, flexible rates, professional service.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <button className="bg-black text-white font-medium px-12 py-4 text-lg tracking-widest transition-all duration-200 hover:bg-gray-800">
                BOOK NOW
              </button>
              <button
                onClick={() => (window.location.href = "/signup")}
                className="border border-black bg-white text-black hover:bg-black hover:text-white font-medium px-12 py-4 text-lg tracking-widest transition-all duration-200"
              >
                CREATE ACCOUNT
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-12 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12 mb-12">
            <div>
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-8 h-8 bg-white text-black flex items-center justify-center">
                  <Camera className="h-4 w-4" />
                </div>
                <span className="text-2xl font-bold tracking-tight">RAWLENS</span>
              </div>
              <p className="text-gray-400 font-light">
                Professional camera rentals in España, Manila. Making premium equipment accessible to all creators.
              </p>
            </div>
            
            <div>
              <h4 className="text-lg font-bold tracking-widest mb-4">CONTACT</h4>
              <div className="space-y-2 text-gray-400 font-light">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4" />
                  <span>España, Manila</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Available 24/7</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-bold tracking-widest mb-4">RENTAL</h4>
              <div className="space-y-2 text-gray-400 font-light">
                <div>Professional Grade Equipment</div>
                <div>Flexible Rental Periods</div>
                <div>Full Insurance Coverage</div>
              </div>
            </div>
          </div>
          
          <div className="pt-8 border-t border-gray-800 text-center">
            <p className="text-gray-500 font-light">
              © 2025 RAWLENS PH. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}