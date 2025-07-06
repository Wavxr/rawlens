"use client"

import { useState } from "react"
import {
  Camera,
  Star,
  Shield,
  ArrowRight,
  CheckCircle,
  MapPin,
  Clock,
  Heart,
  Zap,
  Quote,
  Calendar,
  Share2,
} from "lucide-react"

/* -------------------------------------------------------------------------- */
/*  Mock auth hook – replace with your real implementation                    */
/* -------------------------------------------------------------------------- */
const useAuth = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  return { user, loading, setUser }
}

/* -------------------------------------------------------------------------- */
/*  Data                                                                      */
/* -------------------------------------------------------------------------- */
const cameras = [
  /* … same camera objects you supplied … */
  {
    id: 1,
    name: "Canon PowerShot G7X Mark II",
    category: "Compact Premium",
    price1to3: 550,
    price4plus: 500,
    image: "/g7xmarkii.png",
    features: ["20.1MP 1-inch", "4.2x Optical Zoom", "Full HD Video"],
    popular: true,
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
    popular: true,
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
    popular: true,
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
    popular: false,
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
    popular: false,
    description: "Premium compact for street photography",
    inclusions: ["Camera Body", "Premium Strap", "Battery", "Charger", "Protective Case"],
  },
]

const features = [
  /* … unchanged … */
  {
    icon: Heart,
    title: "For Every Memory",
    description:
      "Whether it's a family trip, date night, or solo adventure - we have the perfect camera for your story",
    gradient: "from-pink-500 to-rose-500",
  },
  {
    icon: Clock,
    title: "Flexible Rental",
    description: "Rent for 1-3 days or longer periods with better rates. Perfect for any project timeline",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Shield,
    title: "Worry-Free Rental",
    description: "Fully insured equipment with simple pickup and return process in España, Manila",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    icon: Share2,
    title: "Share & Save",
    description: "Get ₱50 off per day when you share your amazing photos with us on social media",
    gradient: "from-violet-500 to-purple-500",
  },
]

const testimonials = [
  /* … unchanged … */
  {
    role: "Travel Blogger",
    content:
      "Rented the G7X for my Baguio trip and the photos came out amazing! The booking process was super smooth and the camera was in perfect condition.",
    rating: 5,
  },
  {
    role: "Content Creator",
    content:
      "The EOS M100 was perfect for my girlfriend's birthday shoot. Quality cameras, hassle-free process, and great customer service!",
    rating: 5,
  },
  {
    role: "Photography Student",
    content:
      "As a student, the flexible pricing really helped. The longer rental discount made it affordable for my week-long project.",
    rating: 5,
  },
]

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */
export default function Landing() {
  const { user, loading } = useAuth()

  /* ------------------------- Loading state (unchanged) -------------------- */
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-blue-400 text-xl font-light">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white">
      {/* -------------------------------------------------------------------- */}
      {/*  FLOATERS, HEADER (unchanged)                                         */}
      {/* -------------------------------------------------------------------- */}
      {/* small floating dots */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-400 rounded-full opacity-60 animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-cyan-400 rounded-full opacity-40 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-3/4 w-1.5 h-1.5 bg-blue-300 rounded-full opacity-50 animate-pulse delay-2000"></div>
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-blue-500 rounded-full opacity-30 animate-pulse delay-3000"></div>
      </div>

      {/* Header (same) */}
      <header className="relative border-b border-white/10 bg-black/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-2xl">
                  <Camera className="h-5 w-5 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-pink-400 to-rose-500 rounded-full animate-pulse"></div>
              </div>
              <div>
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  RawLens PH
                </span>
                <div className="text-xs text-blue-400/80 font-light tracking-wider">CAMERA RENTALS</div>
              </div>
            </div>

            {/* Auth buttons (same) */}
            <div className="flex items-center space-x-4">
              {user ? (
                <button
                  onClick={() => (window.location.href = "/dashboard")}
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold px-6 py-2 rounded-full shadow-2xl hover:shadow-blue-500/25 transition-all duration-300"
                >
                  Dashboard
                </button>
              ) : (
                <div className="flex space-x-3">
                  <button
                    onClick={() => (window.location.href = "/login")}
                    className="border border-white/20 bg-white/5 text-white hover:bg-white/10 hover:border-white/30 backdrop-blur-sm px-4 py-2 rounded-full font-medium transition-all duration-300"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => (window.location.href = "/signup")}
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold px-6 py-2 rounded-full shadow-2xl hover:shadow-blue-500/25 transition-all duration-300"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* -------------------------------------------------------------------- */}
      {/*  HERO – tighter spacing, reduced negative space                      */}
      {/* -------------------------------------------------------------------- */}
      <section className="relative py-12 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/20 via-transparent to-cyan-900/20"></div>

        <div className="container mx-auto relative z-10">
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            {/* ---------- Copy & buttons ------------------------------------ */}
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-3">
                <div className="inline-flex items-center bg-blue-500/10 border border-blue-500/20 px-4 py-1.5 rounded-full text-blue-400 font-medium backdrop-blur-sm">
                  <MapPin className="w-4 h-4 mr-2" />
                  España, Manila • Premium Camera Rentals
                </div>

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
                  <span className="block text-white/90">Capture</span>
                  <span className="block bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                    Your Story
                  </span>
                </h1>

                <p className="text-lg md:text-xl text-slate-300 leading-relaxed max-w-xl">
                  From weekend getaways to special moments, rent premium cameras that turn your memories into
                  masterpieces.
                </p>

                <div className="flex items-center space-x-6 text-slate-400">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    <span className="text-sm">G7X • Pocket 3 • EOS M100 • Ricoh</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse delay-500"></div>
                    <span className="text-sm">Flexible Rates</span>
                  </div>
                </div>
              </div>

              {/* Buttons – tighter spacing */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => document.getElementById("cameras")?.scrollIntoView({ behavior: "smooth" })}
                  className="group bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold px-6 py-2.5 rounded-full text-base md:text-lg shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 inline-flex items-center justify-center"
                >
                  <span>Rent Now</span>
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </button>

                <button className="group border border-white/20 bg-white/5 text-white hover:bg-white/10 hover:border-white/30 backdrop-blur-sm px-6 py-2.5 rounded-full font-medium text-base md:text-lg transition-all duration-300 flex items-center justify-center">
                  <Calendar className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                  <span>Check Availability</span>
                </button>
              </div>
            </div>

            {/* ---------- Image cluster - tighter positioning --------------- */}
            <div className="lg:col-span-5 relative mt-8 lg:mt-0">
              {/* Main card */}
              <div className="relative z-20 rotate-2 hover:rotate-0 transition-transform duration-700">
                <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl p-5 border border-white/20 shadow-2xl">
                  <img src="/g7xmarkiii.png" alt="Canon G7X Mark III" className="w-full h-56 object-contain" />
                  <div className="mt-4 text-center">
                    <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                      ₱600/day
                    </div>
                    <div className="text-slate-400 text-sm">1-3 days • ₱550 for 4+ days</div>
                  </div>
                </div>
              </div>

              {/* Secondary floating images - moved closer */}
              <img
                src="/g7xmarkii.png"
                alt="Canon G7X Mark II"
                className="absolute -bottom-6 -left-6 w-32 sm:w-36 rotate-[-8deg] rounded-2xl shadow-xl opacity-80 hover:opacity-100 transition-all duration-500"
              />
              <img
                src="/eosm100.webp"
                alt="Canon EOS M100"
                className="absolute top-4 -right-10 w-36 sm:w-44 rotate-6 rounded-2xl shadow-xl opacity-75 hover:opacity-100 transition-all duration-500"
              />

              {/* Floating labels - adjusted positions */}
              <div className="absolute -top-4 -right-4 bg-gradient-to-br from-pink-500/20 to-rose-500/20 backdrop-blur-xl rounded-2xl p-2.5 border border-pink-500/20">
                <div className="flex items-center space-x-1 text-pink-400">
                  <Heart className="h-4 w-4" />
                  <span className="text-xs font-medium">Most Loved</span>
                </div>
              </div>
              <div className="absolute -bottom-2 -left-2 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 backdrop-blur-xl rounded-2xl p-2.5 border border-emerald-500/20">
                <div className="flex items-center space-x-1 text-emerald-400">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-xs font-medium">Available Now</span>
                </div>
              </div>
              <div className="absolute top-1/2 -right-6 bg-gradient-to-br from-violet-500/20 to-purple-500/20 backdrop-blur-xl rounded-2xl p-2.5 border border-violet-500/20">
                <div className="flex items-center space-x-1 text-violet-400">
                  <Share2 className="h-4 w-4" />
                  <span className="text-xs font-medium">₱50 Off</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/*  STATS, FEATURES (unchanged)                                          */}
      {/* -------------------------------------------------------------------- */}
      {/* Stats */}
      <section className="py-16 px-6">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { number: "5+", label: "Camera Models", icon: Camera },
              { number: "₱50", label: "Daily Discount", icon: Share2 },
              { number: "24/7", label: "Support", icon: Clock },
              { number: "España", label: "Manila Location", icon: MapPin },
            ].map((stat, index) => (
              <div key={index} className="text-center group">
                <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-2xl group-hover:scale-105 transition-all duration-300">
                  <stat.icon className="h-6 w-6 text-blue-400 mx-auto mb-3" />
                  <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-1">
                    {stat.number}
                  </div>
                  <div className="text-slate-400 text-sm font-medium">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        {/* … identical to original … */}
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center bg-violet-500/10 border border-violet-500/20 px-4 py-2 rounded-full text-violet-400 font-medium backdrop-blur-sm mb-6">
              <Zap className="w-4 h-4 mr-2" />
              Why Choose RawLens PH
            </div>
            <h2 className="text-4xl font-bold mb-6">
              <span className="block text-white/90">Made for</span>
              <span className="block bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Memory Makers
              </span>
            </h2>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
              We believe every moment deserves to be captured beautifully. That's why we make premium cameras accessible
              for everyone in Manila.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 hover:border-white/30 transition-all duration-500 hover:scale-105 rounded-2xl p-6 text-center"
              >
                <div
                  className={`w-12 h-12 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center mx-auto mb-4 shadow-2xl group-hover:scale-110 transition-transform duration-300`}
                >
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold mb-3 text-white">{feature.title}</h3>
                <p className="text-slate-300 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/*  CAMERAS – modern symmetric cards                                    */}
      {/* -------------------------------------------------------------------- */}
      <section id="cameras" className="py-20 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full text-emerald-400 font-medium backdrop-blur-sm mb-6">
              <Camera className="w-4 h-4 mr-2" />
              Our Collection
            </div>
            <h2 className="text-4xl font-bold mb-6">
              <span className="block text-white/90">Perfect Camera</span>
              <span className="block bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Every Story
              </span>
            </h2>
          </div>

          {/* Uniform Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {cameras.map((camera) => (
              <div key={camera.id} className="group relative">
                <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 hover:border-white/30 transition-all duration-500 hover:scale-[1.02] rounded-2xl overflow-hidden shadow-2xl h-full flex flex-col">
                  {/* image */}
                  <div className="relative overflow-hidden">
                    <img
                      src={camera.image || "/placeholder.svg"}
                      alt={camera.name}
                      className="w-full h-56 object-contain transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

                    {camera.popular && (
                      <div className="absolute top-4 left-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold px-3 py-1 rounded-full text-xs shadow-xl">
                        Most Popular
                      </div>
                    )}

                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="flex items-center justify-between">
                        <div className="bg-black/50 backdrop-blur-md rounded-xl px-3 py-1"> 
                        </div>
                        <div className="bg-black/50 backdrop-blur-md rounded-xl px-3 py-1">
                          <div className="text-right">
                            <div className="text-blue-400 font-bold">₱{camera.price1to3}</div>
                            <div className="text-white/70 text-xs">1-3 days</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* body - modern card design */}
                  <div className="p-5 flex flex-col flex-1">
                    <div className="mb-3">
                      <div className="text-xs text-blue-400 font-medium mb-1 uppercase tracking-wider">
                        {camera.category}
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">{camera.name}</h3>
                      <p className="text-slate-300 text-sm mb-4">{camera.description}</p>
                    </div>

                    <div className="bg-white/5 rounded-xl p-3 mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-300">1-3 days:</span>
                        <span className="text-blue-400 font-bold">₱{camera.price1to3}/day</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-300">4+ days:</span>
                        <span className="text-emerald-400 font-bold">₱{camera.price4plus}/day</span>
                      </div>
                    </div>

                    <ul className="space-y-1.5 mb-5">
                      {camera.features.slice(0, 3).map((feature, i) => (
                        <li key={i} className="flex items-center text-slate-300 text-sm">
                          <CheckCircle className="h-3 w-3 text-emerald-400 mr-2 flex-shrink-0" />
                          <span className="truncate">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <button className="mt-auto w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold py-2.5 rounded-lg shadow-xl hover:shadow-blue-500/25 transition-all duration-300 flex items-center justify-center group">
                      <Calendar className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                      Rent Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Offer banner (unchanged) */}
          <div className="mt-12 text-center">
            <div className="bg-gradient-to-r from-violet-500/20 to-purple-500/20 backdrop-blur-xl rounded-2xl p-6 border border-violet-500/20 max-w-2xl mx-auto">
              <div className="flex items-center justify-center space-x-2 text-violet-400 mb-3">
                <Share2 className="h-5 w-5" />
                <span className="font-bold text-lg">Special Offer</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">₱50 OFF PER DAY</h3>
              <p className="text-slate-300">When you share your amazing photos with us on social media!</p>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/*  TESTIMONIALS, CTA, FOOTER (unchanged)                                */}
      {/* -------------------------------------------------------------------- */}
      {/* Testimonials */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-full text-rose-400 font-medium backdrop-blur-sm mb-6">
              <Quote className="w-4 h-4 mr-2" />
              What Our Customers Say
            </div>
            <h2 className="text-4xl font-bold mb-6">
              <span className="block text-white/90">Real Stories</span>
              <span className="block bg-gradient-to-r from-rose-400 to-pink-400 bg-clip-text text-transparent">
                Real Moments
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {testimonials.map((test, i) => (
              <div
                key={i}
                className="group bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 hover:border-white/30 transition-all duration-500 hover:scale-105 rounded-2xl p-6 shadow-2xl"
              >
                <div className="flex items-center mb-4">
                  {[...Array(test.rating)].map((_, j) => (
                    <Star key={j} className="h-4 w-4 text-yellow-400 fill-current" />
                  ))}
                </div>
                <blockquote className="text-slate-300 mb-4 leading-relaxed italic text-sm">
                  "{test.content}"
                </blockquote>
                <div className="text-blue-400 font-medium text-sm">— {test.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 relative overflow-hidden">
        {/* … identical CTA … */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/20 via-cyan-900/20 to-blue-900/20"></div>
        <div className="container mx-auto text-center relative z-10">
          <div className="max-w-3xl mx-auto">
            <div className="inline-flex items-center bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-full text-blue-400 font-medium backdrop-blur-sm mb-6">
              <MapPin className="w-4 h-4 mr-2" />
              Ready to Capture Your Story?
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
              <span className="block text-white/90">Start Your</span>
              <span className="block bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Adventure Today
              </span>
            </h2>
            <p className="text-lg text-slate-300 mb-8 max-w-xl mx-auto leading-relaxed">
              Join hundreds of memory makers in Manila. Flexible rates, premium equipment, and hassle-free rentals.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold px-8 py-3 text-lg rounded-full shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 flex items-center justify-center group">
                <Calendar className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                Book Your Rental
              </button>
              <button
                onClick={() => (window.location.href = "/signup")}
                className="border border-white/20 bg-white/5 text-white hover:bg-white/10 hover:border-white/30 backdrop-blur-sm px-8 py-3 text-lg rounded-full font-medium transition-all duration-300"
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer (unchanged) */}
      <footer className="bg-black/40 backdrop-blur-xl border-t border-white/10 py-12 px-6">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between mb-8">
            <div className="flex items-center space-x-3 mb-6 md:mb-0">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-2xl">
                  <Camera className="h-5 w-5 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-pink-400 to-rose-500 rounded-full"></div>
              </div>
              <div>
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  RawLens PH
                </span>
                <div className="text-xs text-blue-400/80 font-light tracking-wider">CAMERA RENTALS</div>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 text-slate-400">
                <MapPin className="h-4 w-4" />
                <span>España, Manila</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-400">
                <Clock className="h-4 w-4" />
                <span>Available 24/7</span>
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-white/10 text-center">
            <p className="text-slate-500">
              © 2025 RawLens PH. All rights reserved. Making memories accessible, one camera at a time.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}