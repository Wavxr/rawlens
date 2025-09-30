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
  Play,
  Mail,
  Send,
  Instagram,
  Facebook,
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
      { threshold: 0.1 },
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
    description: "Rent for 1–3 days or longer periods with better rates. Perfect for any project timeline",
  },
  {
    icon: Shield,
    title: "RELIABLE GEAR",
    description: "Professionally maintained cameras and lenses, ready to perform every time",
  },
  {
    icon: Smartphone,
    title: "EASY TO BOOK",
    description: "Seamless booking through our app or website — rent in just a few taps",
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
  const [emailFormRef, emailFormVisible] = useScrollAnimation()
  const [contactCtaRef, contactCtaVisible] = useScrollAnimation()
  const [socialRef, socialVisible] = useScrollAnimation()

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    equipment: "",
    rentalDates: "",
    additionalDetails: "",
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const subject = encodeURIComponent(`Camera Rental Inquiry from ${formData.name}`)
    const body = encodeURIComponent(
      `Name: ${formData.name}\nEmail: ${formData.email}\nPhone: ${formData.phone}\nEquipment Needed: ${formData.equipment}\nRental Dates: ${formData.rentalDates}\n\nAdditional Details:\n${formData.additionalDetails}`,
    )
    window.location.href = `mailto:paradeza@rawlensph.cam?subject=${subject}&body=${body}`
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex items-center space-x-4">
          <div className="w-6 h-6 border-2 border-black border-t-transparent animate-spin rounded-full"></div>
          <div className="text-black text-lg font-medium">
            Loading...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-black font-sans antialiased">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-xl sticky top-0 z-50 transition-all duration-300">
  <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-3 lg:py-5">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3 sm:space-x-4">
        <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-black text-white flex items-center justify-center rounded-xl sm:rounded-2xl">
          <Camera className="h-3.5 w-3.5 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
        </div>
        <div>
          <span className="text-lg sm:text-2xl lg:text-3xl font-bold tracking-tight text-black">RAWLENS</span>
          <div className="text-[9px] sm:text-xs lg:text-sm text-gray-600 font-semibold tracking-widest uppercase">CAMERA RENTALS</div>
        </div>
      </div>

      <div className="flex items-center space-x-1.5 sm:space-x-3 lg:space-x-6">
        {user ? (
          <button
            onClick={() => (window.location.href = "/dashboard")}
            className="bg-black text-white font-semibold px-3 sm:px-6 lg:px-8 py-1.5 lg:py-2.5 text-xs sm:text-sm lg:text-base tracking-wide transition-all duration-300 hover:shadow-glow hover:scale-105 active:scale-95 rounded-lg sm:rounded-xl lg:rounded-2xl"
          >
            DASHBOARD
          </button>
        ) : (
          <div className="flex space-x-1.5 sm:space-x-3 lg:space-x-4">
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
        )}
      </div>
    </div>
  </div>
</header>

      {/* Hero Section */}
      <section
        ref={heroRef}
        className="relative py-5 lg:py-0 px-5 lg:px-8 overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 tech-grid"
      >
        <div className="absolute inset-0 hero-background-glow"></div>
        <div className="max-w-7xl mx-auto relative">
          <div
            className={`grid lg:grid-cols-2 gap-12 lg:gap-20 items-center min-h-[85vh] transition-all duration-1000 ease-out ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}
          >
            <div className="space-y-6 lg:space-y-10 text-center lg:text-left">
              <div className="space-y-4 lg:space-y-8">
                <div className="inline-flex items-center bg-blue-100 border border-blue-200 text-blue-600 px-3 py-1.5 font-medium tracking-[0.15em] text-xs rounded-full backdrop-blur-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 animate-glow-pulse"></div>
                  ESPAÑA, MANILA • PREMIUM RENTALS
                </div>

                <h1 className="text-4xl sm:text-7xl md:text-8xl lg:text-8xl font-bold leading-[0.85] tracking-tight">
                  <div className="overflow-hidden">
                    <span className="block animate-fade-in-up text-black">CAPTURE</span>
                  </div>
                  <div className="overflow-hidden">
                    <span className="block text-gray-500 animate-fade-in-up [animation-delay:200ms] [animation-fill-mode:both]">
                      EVERYTHING
                    </span>
                  </div>
                </h1>

                <p className="text-lg lg:text-2xl text-gray-600 font-light leading-relaxed max-w-xl mx-auto lg:mx-0 animate-fade-in [animation-delay:400ms] [animation-fill-mode:both]">
                  Professional camera equipment for creators, travelers, and storytellers. Premium quality made
                  accessible.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 lg:gap-6 justify-center lg:justify-start animate-fade-in [animation-delay:600ms] [animation-fill-mode:both]">
                <button
                  onClick={() => document.getElementById("cameras")?.scrollIntoView({ behavior: "smooth" })}
                  className="group bg-black text-white font-semibold px-6 py-3 text-base tracking-wide transition-all duration-300 hover:shadow-glow hover:scale-105 active:scale-95 inline-flex items-center justify-center rounded-2xl lg:px-8 lg:py-4 lg:text-lg"
                >
                  <span>EXPLORE COLLECTION</span>
                  <ArrowRight className="ml-3 h-4 w-4 lg:h-5 lg:w-5 group-hover:translate-x-1 transition-transform duration-300" />
                </button>

                  <button
                    onClick={() => contactCtaRef.current?.scrollIntoView({ behavior: "smooth" })}
                    className="group border border-gray-300 bg-white/60 backdrop-blur-sm text-black hover:bg-gray-50 hover:border-gray-400 font-semibold px-6 py-3 text-base tracking-wide transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center rounded-2xl lg:px-8 lg:py-4 lg:text-lg">
                    <Play className="mr-3 h-4 w-4 lg:h-5 lg:w-5 group-hover:scale-110 transition-transform duration-300" />
                    <span>GET STARTED?</span>
                  </button>
              </div>
            </div>

            <div className="relative lg:mt-0">
              <div className="relative">
                {/* Enhanced background glow - bigger and more noticeable */}
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

      {/* Features Section */}
      <section ref={featuresRef} className="py-24 lg:py-32 px-5 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className={`text-center mb-20 transition-all duration-1000 ${featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-8 leading-tight">
              <span className="block text-black">PROFESSIONAL</span>
              <span className="block text-gray-500">GRADE</span>
            </h2>
            <p className="text-lg lg:text-2xl text-gray-600 font-light max-w-3xl mx-auto leading-relaxed">
              Every camera in our collection is meticulously maintained and tested to ensure 
              peak performance for your creative projects.
            </p>
          </div>

          <div className={`grid md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 transition-all duration-1000 delay-300 ${featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
            {features.map((feature, index) => (
              <div key={index} className="text-center space-y-6 group hover:scale-105 transition-transform duration-300">
                <div className="w-20 h-20 bg-black text-white flex items-center justify-center mx-auto rounded-3xl group-hover:shadow-glow transition-all duration-300">
                  <feature.icon className="h-10 w-10" />
                </div>
                <h3 className="text-base lg:text-lg font-bold tracking-[0.15em] text-black">{feature.title}</h3>
                <p className="text-gray-600 font-light leading-relaxed text-sm lg:text-base">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Camera Collection */}
      <section id="cameras" ref={camerasRef} className="py-16 lg:py-32 px-5 lg:px-8 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className={`text-center mb-16 lg:mb-24 transition-all duration-1000 ${camerasVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-8 leading-tight">
              <span className="block text-black">OUR</span>
              <span className="block text-gray-500">COLLECTION</span>
            </h2>
          </div>

          <div className="space-y-16 lg:space-y-40">
            {cameras.map((camera, index) => (
              <div 
                key={camera.id} 
                className={`grid lg:grid-cols-2 gap-10 lg:gap-20 items-center transition-all duration-1000 ${camerasVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                style={{ transitionDelay: `${index * 200}ms` }}
              >
                <div className={`${index % 2 === 1 ? 'lg:order-2' : ''} relative group`}>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-[3rem] transform rotate-1 scale-105 opacity-5 group-hover:opacity-10 transition-opacity duration-500"></div>
                  <img 
                    src={camera.image || "/placeholder.svg"} 
                    alt={camera.name}
                    className="relative w-full max-w-sm lg:max-w-xl mx-auto object-contain group-hover:scale-105 transition-transform duration-700 rounded-3xl"
                  />
                </div>
                
                <div className={`space-y-6 lg:space-y-8 ${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                  <div>
                    <div className="text-xs lg:text-sm text-blue-500 font-medium mb-3 lg:mb-4 tracking-[0.15em] uppercase">
                      {camera.category}
                    </div>
                    <h3 className="text-2xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 lg:mb-6 leading-tight text-black">{camera.name}</h3>
                    <p className="text-base lg:text-2xl text-gray-600 font-light mb-6 lg:mb-8 leading-relaxed">{camera.description}</p>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 p-5 lg:p-8 rounded-3xl backdrop-blur-sm">
                    <div className="grid grid-cols-2 gap-6 lg:gap-8 mb-6 lg:mb-8">
                      <div>
                        <div className="text-xs lg:text-sm text-gray-600 mb-2 lg:mb-3 tracking-[0.15em] font-medium">1-3 DAYS</div>
                        <div className="text-xl lg:text-3xl font-bold text-black">₱{camera.price1to3}</div>
                      </div>
                      <div>
                        <div className="text-xs lg:text-sm text-gray-600 mb-2 lg:mb-3 tracking-[0.15em] font-medium">4+ DAYS</div>
                        <div className="text-xl lg:text-3xl font-bold text-blue-500">₱{camera.price4plus}</div>
                      </div>
                    </div>

                    <div className="space-y-3 lg:space-y-4">
                      {camera.features.map((feature, i) => (
                        <div key={i} className="flex items-center text-black">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 lg:mr-4"></div>
                          <span className="font-medium text-sm lg:text-base">{feature}</span>
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
      <section ref={processRef} className="py-24 lg:py-32 px-5 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div
            className={`text-center mb-20 transition-all duration-1000 ${processVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}
          >
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-8 leading-tight">
              <span className="block text-black">SIMPLE</span>
              <span className="block text-gray-500">PROCESS</span>
            </h2>
          </div>

          <div
            className={`grid md:grid-cols-2 gap-12 lg:gap-16 transition-all duration-1000 delay-300 ${processVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}
          >
            <div className="bg-gray-50 border border-gray-200 p-8 lg:p-12 rounded-3xl text-center space-y-8 hover:bg-gray-100 transition-all duration-500 hover:scale-105 hover:shadow-elegant group backdrop-blur-sm">
              <div className="w-24 h-24 bg-black text-white flex items-center justify-center mx-auto rounded-3xl group-hover:shadow-glow transition-all duration-300">
                <RotateCcw className="h-12 w-12" />
              </div>
              <h3 className="text-2xl lg:text-4xl font-bold tracking-[0.1em] text-black">EASY RETURNS</h3>
              <p className="text-gray-600 font-light leading-relaxed text-base lg:text-xl">
                Hassle-free return process at our España, Manila location. Quick inspection and immediate confirmation.
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 p-8 lg:p-12 rounded-3xl text-center space-y-8 hover:bg-gray-100 transition-all duration-500 hover:scale-105 hover:shadow-elegant group backdrop-blur-sm">
              <div className="w-24 h-24 bg-black text-white flex items-center justify-center mx-auto rounded-3xl group-hover:shadow-glow transition-all duration-300">
                <CreditCard className="h-12 w-12" />
              </div>
              <h3 className="text-2xl lg:text-4xl font-bold tracking-[0.1em] text-black">SECURE PAYMENTS</h3>
              <p className="text-gray-600 font-light leading-relaxed text-base lg:text-xl">
                Multiple payment options with bank-level security. GCash, card payments, and online banking accepted.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Email Form Section */}
      <section ref={emailFormRef} className="py-24 lg:py-32 px-5 lg:px-8 bg-background">
        <div className="max-w-5xl mx-auto">
          <div
            className={`text-center mb-16 transition-all duration-1000 ${emailFormVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}
          >
            <div className="inline-flex items-center bg-accent/10 border border-accent/20 text-accent px-4 py-2 font-semibold tracking-[0.15em] text-xs lg:text-sm mb-8 rounded-full backdrop-blur-sm">
              <Mail className="w-4 h-4 mr-3" />
              GET IN TOUCH
            </div>
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-8 leading-tight">
              <span className="block text-foreground">SEND US</span>
              <span className="block text-muted-foreground">AN EMAIL</span>
            </h2>
            <p className="text-lg lg:text-2xl text-muted-foreground font-light max-w-3xl mx-auto leading-relaxed">
              Fill out the form below and we'll get back to you with availability and pricing details.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className={`bg-card border border-border p-8 lg:p-12 rounded-2xl backdrop-blur-sm shadow-elegant transition-all duration-1000 delay-300 ${emailFormVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}
          >
            <div className="grid md:grid-cols-2 gap-6 lg:gap-8 mb-6 lg:mb-8">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm lg:text-base font-semibold text-foreground mb-3 tracking-wide"
                >
                  NAME *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 lg:px-6 py-3 lg:py-4 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm lg:text-base font-semibold text-foreground mb-3 tracking-wide"
                >
                  EMAIL *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 lg:px-6 py-3 lg:py-4 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300"
                  placeholder="your.email@example.com"
                />
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm lg:text-base font-semibold text-foreground mb-3 tracking-wide"
                >
                  PHONE NUMBER *
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 lg:px-6 py-3 lg:py-4 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300"
                  placeholder="+63 XXX XXX XXXX"
                />
              </div>

              <div>
                <label
                  htmlFor="equipment"
                  className="block text-sm lg:text-base font-semibold text-foreground mb-3 tracking-wide"
                >
                  EQUIPMENT NEEDED *
                </label>
                <input
                  type="text"
                  id="equipment"
                  name="equipment"
                  required
                  value={formData.equipment}
                  onChange={handleInputChange}
                  className="w-full px-4 lg:px-6 py-3 lg:py-4 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300"
                  placeholder="e.g., Canon G7X Mark III"
                />
              </div>
            </div>

            <div className="mb-6 lg:mb-8">
              <label
                htmlFor="rentalDates"
                className="block text-sm lg:text-base font-semibold text-foreground mb-3 tracking-wide"
              >
                RENTAL DATES *
              </label>
              <input
                type="text"
                id="rentalDates"
                name="rentalDates"
                required
                value={formData.rentalDates}
                onChange={handleInputChange}
                className="w-full px-4 lg:px-6 py-3 lg:py-4 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300"
                placeholder="e.g., March 15-18, 2025"
              />
            </div>

            <div className="mb-8 lg:mb-10">
              <label
                htmlFor="additionalDetails"
                className="block text-sm lg:text-base font-semibold text-foreground mb-3 tracking-wide"
              >
                ADDITIONAL DETAILS
              </label>
              <textarea
                id="additionalDetails"
                name="additionalDetails"
                rows={6}
                value={formData.additionalDetails}
                onChange={handleInputChange}
                className="w-full px-4 lg:px-6 py-3 lg:py-4 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300 resize-none"
                placeholder="Tell us more about your project, special requirements, or any questions you have..."
              />
            </div>

            <button
              type="submit"
              className="w-full bg-primary text-primary-foreground font-semibold px-8 py-4 lg:py-5 text-base lg:text-lg tracking-[0.15em] transition-all duration-300 hover:shadow-glow hover:scale-105 active:scale-95 rounded-xl flex items-center justify-center gap-3"
            >
              <Send className="h-5 w-5" />
              <span>SEND INQUIRY</span>
            </button>
          </form>
        </div>
      </section>

      {/* CTA with Instagram Quick Message */}
      <section ref={contactCtaRef} className="py-24 lg:py-32 px-5 lg:px-8 bg-gradient-surface">
        <div className="max-w-7xl mx-auto">
          <div
            className={`grid lg:grid-cols-2 gap-12 lg:gap-20 items-center transition-all duration-1000 ${contactCtaVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}
          >
            {/* Left: Call to Action */}
            <div className="space-y-8 text-center lg:text-left">
              <div className="inline-flex items-center bg-success/10 border border-success/20 text-success px-4 py-2 font-medium tracking-[0.15em] text-xs rounded-full backdrop-blur-sm">
                <div className="w-2 h-2 bg-success rounded-full mr-3 animate-glow-pulse"></div>
                LET'S CONNECT
              </div>
              <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
                <span className="block text-foreground">READY TO</span>
                <span className="block text-muted-foreground">CAPTURE MORE?</span>
              </h2>
              <p className="text-lg lg:text-2xl text-muted-foreground font-light leading-relaxed max-w-xl mx-auto lg:mx-0">
                Whether you're planning a shoot, have questions about our equipment, or just want to chat about your
                creative vision — we're here to help make it happen.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <button
                  onClick={() => (window.location.href = "/signup")}
                  className="bg-primary text-primary-foreground font-semibold px-8 py-4 text-base tracking-[0.15em] transition-all duration-300 hover:shadow-glow hover:scale-105 active:scale-95 rounded-xl"
                >
                  LOGIN OR SIGN UP
                </button>
              </div>
            </div>

            {/* Right: Instagram Quick Message */}
            <div className="bg-card border border-border p-8 lg:p-12 rounded-2xl backdrop-blur-sm shadow-elegant hover:shadow-glow transition-all duration-500 hover:scale-105 modern-card">
              <div className="text-center space-y-8">
                <div className="w-24 h-24 bg-gradient-accent flex items-center justify-center mx-auto rounded-2xl shadow-glow">
                  <Instagram className="h-12 w-12 text-white" />
                </div>
                <h3 className="text-2xl lg:text-4xl font-bold tracking-[0.1em] text-foreground">QUICK MESSAGE</h3>
                <p className="text-muted-foreground font-light leading-relaxed text-base lg:text-xl">
                  Need a faster response? Send us a direct message on Instagram and we'll get back to you right away.
                </p>
                <a
                  href="https://www.instagram.com/rawlensph/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 bg-primary text-primary-foreground font-semibold px-8 py-4 text-base tracking-[0.15em] transition-all duration-300 hover:shadow-glow hover:scale-105 active:scale-95 rounded-xl"
                >
                  <Instagram className="h-5 w-5" />
                  <span>MESSAGE US</span>
                  <ArrowRight className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Follow Us Section */}
      <section ref={socialRef} className="py-16 lg:py-20 px-5 lg:px-8 bg-background border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div
            className={`text-center transition-all duration-1000 ${socialVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}
          >
            <h3 className="text-2xl lg:text-4xl font-bold tracking-tight mb-8 text-foreground">FOLLOW US ON</h3>
            <p className="text-base lg:text-xl text-muted-foreground font-light mb-10 leading-relaxed">
              Stay updated with our latest gear, special offers, and creative inspiration.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 lg:gap-6 justify-center">
              <a
                href="https://www.instagram.com/rawlensph/"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center justify-center gap-3 bg-gradient-accent text-white font-semibold px-8 py-4 text-base tracking-[0.15em] transition-all duration-300 hover:shadow-glow hover:scale-105 active:scale-95 rounded-xl"
              >
                <Instagram className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
                <span>INSTAGRAM</span>
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61568426289637"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center justify-center gap-3 bg-accent text-accent-foreground font-semibold px-8 py-4 text-base tracking-[0.15em] transition-all duration-300 hover:shadow-glow hover:scale-105 active:scale-95 rounded-xl"
              >
                <Facebook className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
                <span>FACEBOOK</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-20 lg:py-24 px-5 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12 lg:gap-16 mb-16">
            <div>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-primary-foreground text-primary flex items-center justify-center rounded-2xl">
                  <Camera className="h-6 w-6" />
                </div>
                <span className="text-2xl lg:text-4xl font-bold tracking-tight">RAWLENS</span>
              </div>
              <p className="text-primary-foreground/80 font-light leading-relaxed text-base lg:text-lg">
                Professional camera rentals in España, Manila. Making premium equipment accessible to all creators.
              </p>
            </div>

            <div>
              <h4 className="text-lg lg:text-xl font-bold tracking-[0.15em] mb-8">CONTACT</h4>
              <div className="space-y-4 text-primary-foreground/80 font-light text-base lg:text-lg">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5" />
                  <span>España, Manila</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5" />
                  <span>Available 24/7</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-lg lg:text-xl font-bold tracking-[0.15em] mb-8">RENTAL</h4>
              <div className="space-y-4 text-primary-foreground/80 font-light text-base lg:text-lg">
                <div>Professional Grade Equipment</div>
                <div>Flexible Rental Periods</div>
                <div>Full Insurance Coverage</div>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-primary-foreground/20 text-center">
            <p className="text-primary-foreground/60 font-light text-base lg:text-lg">
              © 2025 RAWLENS PH. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}