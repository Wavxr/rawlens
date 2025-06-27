"use client"

import { useState } from "react"
import { Camera, Play, Star, Shield, Clock, Headphones, ArrowRight, CheckCircle } from "lucide-react"

// Your existing auth hook - replace with your actual implementation
const useAuth = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  return { user, loading, setUser }
}

const cameras = [
  {
    id: 1,
    name: "Canon EOS M100",
    category: "Mirrorless",
    price: 45,
    rating: 4.8,
    reviews: 124,
    image: "/eosm100.webp",
    features: ["24.2MP APS-C", "Dual Pixel AF", "WiFi/Bluetooth"],
    popular: true,
  },
  {
    id: 2,
    name: "Canon PowerShot G7X Mark II",
    category: "Compact",
    price: 35,
    rating: 4.7,
    reviews: 89,
    image: "/g7xmarkii.png",
    features: ["20.1MP 1-inch", "4.2x Optical Zoom", "Full HD Video"],
    popular: false,
  },
  {
    id: 3,
    name: "Canon PowerShot G7X Mark III",
    category: "Compact",
    price: 55,
    rating: 4.9,
    reviews: 156,
    image: "/g7xmarkiii.png",
    features: ["20.1MP 1-inch", "4K Video", "Live Streaming"],
    popular: true,
  },
  {
    id: 4,
    name: "DJI Osmo Action",
    category: "Action",
    price: 40,
    rating: 4.6,
    reviews: 203,
    image: "/placeholder.svg?height=300&width=400",
    features: ["4K HDR Video", "Dual Screens", "RockSteady"],
    popular: false,
  },
]

const features = [
  {
    icon: Camera,
    title: "Professional Grade",
    description: "Access to high-end cameras from top brands like Canon, Sony, and Nikon",
  },
  {
    icon: Shield,
    title: "Fully Insured",
    description: "All equipment is fully insured and protected during your rental period",
  },
  {
    icon: Clock,
    title: "Flexible Rental",
    description: "Rent for hours, days, or weeks. Perfect for any project timeline",
  },
  {
    icon: Headphones,
    title: "24/7 Support",
    description: "Expert technical support available whenever you need assistance",
  },
]

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Wedding Photographer",
    content:
      "Rawlens saved my wedding season! The Canon R5 I rented was in perfect condition and the process was seamless.",
    rating: 5,
    avatar: "/placeholder.svg?height=60&width=60",
  },
  {
    name: "Mike Rodriguez",
    role: "Content Creator",
    content: "Amazing service and quality equipment. The Sony FX3 helped me create my best content yet.",
    rating: 5,
    avatar: "/placeholder.svg?height=60&width=60",
  },
]

export default function Landing() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-blue-400 text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-900 bg-black/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Camera className="h-8 w-8 text-blue-400" />
            <span className="text-2xl font-bold">Rawlens</span>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <button
                onClick={() => (window.location.href = "/dashboard")}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Dashboard
              </button>
            ) : (
              <div className="flex space-x-3">
                <button
                  onClick={() => (window.location.href = "/login")}
                  className="border border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-white hover:border-blue-500 px-6 py-2 rounded-lg transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={() => (window.location.href = "/signup")}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 to-black"></div>
        <div className="container mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <span className="bg-blue-600/20 text-blue-400 border border-blue-600/30 px-3 py-1 rounded-full text-sm">
                  Professional Camera Rentals
                </span>
                <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                  Capture Your Vision with
                  <span className="text-blue-400"> Professional Gear</span>
                </h1>
                <p className="text-xl text-gray-400 leading-relaxed">
                  Access high-end cameras and equipment without the hefty price tag. Perfect for photographers,
                  filmmakers, and content creators.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg rounded-lg transition-colors flex items-center justify-center"
                  onClick={() => document.getElementById("cameras")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Browse Cameras
                  <ArrowRight className="ml-2 h-5 w-5" />
                </button>
                <button className="border border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-white hover:border-blue-500 px-8 py-3 text-lg rounded-lg transition-colors flex items-center justify-center">
                  <Play className="mr-2 h-5 w-5" />
                  Watch Demo
                </button>
              </div>
            </div>
            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <img
                    src="/eosm100.webp"
                    alt="Canon EOS M100"
                    className="w-full h-48 object-cover rounded-lg border border-gray-800 shadow-2xl"
                  />
                  <img
                    src="/g7xmarkii.png"
                    alt="Canon G7X Mark II"
                    className="w-full h-48 object-cover rounded-lg border border-gray-800 shadow-2xl"
                  />
                </div>
                <div className="space-y-4 mt-8">
                  <img
                    src="/g7xmarkiii.png"
                    alt="Canon G7X Mark III"
                    className="w-full h-48 object-cover rounded-lg border border-gray-800 shadow-2xl"
                  />
                  <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                    <div className="flex items-center space-x-2 text-blue-400 mb-2">
                      <Play className="h-4 w-4" />
                      <span className="text-sm font-medium">DJI Osmo Action</span>
                    </div>
                    <p className="text-xs text-gray-500">4K Action Camera</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-gray-950/50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why Choose Rawlens?</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              We make professional photography accessible to everyone with our premium rental service
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-gray-900 border border-gray-800 hover:border-blue-600/50 transition-colors rounded-lg p-6 text-center"
              >
                <feature.icon className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-white">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Camera Showcase */}
      <section id="cameras" className="py-20 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Our Camera Collection</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              From mirrorless to action cameras, find the perfect gear for your next project
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {cameras.map((camera) => (
              <div
                key={camera.id}
                className="bg-gray-900 border border-gray-800 hover:border-blue-600/50 transition-all hover:scale-105 rounded-lg overflow-hidden"
              >
                <div className="relative">
                  <img
                    src={camera.image || "/placeholder.svg"}
                    alt={camera.name}
                    className="w-full h-48 object-cover"
                  />
                  {camera.popular && (
                    <span className="absolute top-3 left-3 bg-blue-600 text-white px-2 py-1 rounded text-xs">
                      Popular
                    </span>
                  )}
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="border border-gray-700 text-gray-400 bg-gray-800 px-2 py-1 rounded text-xs">
                      {camera.category}
                    </span>
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="text-sm text-gray-400">{camera.rating}</span>
                      <span className="text-xs text-gray-600">({camera.reviews})</span>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-white">{camera.name}</h3>
                  <ul className="space-y-1 mb-4">
                    {camera.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm text-gray-400">
                        <CheckCircle className="h-3 w-3 text-blue-400 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-bold text-blue-400">${camera.price}</span>
                      <span className="text-gray-500">/day</span>
                    </div>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors">
                      Rent Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6 bg-gray-950/50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">What Our Customers Say</h2>
            <p className="text-xl text-gray-400">Trusted by photographers and creators worldwide</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-400 mb-4 italic">"{testimonial.content}"</p>
                <div className="flex items-center">
                  <img
                    src={testimonial.avatar || "/placeholder.svg"}
                    alt={testimonial.name}
                    className="w-10 h-10 rounded-full mr-3"
                  />
                  <div>
                    <p className="font-semibold text-white">{testimonial.name}</p>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-blue-900/10 to-black">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Start Creating?</h2>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Join thousands of creators who trust Rawlens for their professional camera needs
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg rounded-lg transition-colors"
              onClick={() => (window.location.href = "/signup")}
            >
              Get Started Today
            </button>
            <button className="border border-gray-700 bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-white hover:border-blue-500 px-8 py-3 text-lg rounded-lg transition-colors">
              Contact Sales
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black border-t border-gray-900 py-12 px-6">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Camera className="h-6 w-6 text-blue-400" />
              <span className="text-xl font-bold">Rawlens</span>
            </div>
            <div className="flex space-x-6 text-gray-500">
              <a href="#" className="hover:text-blue-400 transition-colors">
                Privacy
              </a>
              <a href="#" className="hover:text-blue-400 transition-colors">
                Terms
              </a>
              <a href="#" className="hover:text-blue-400 transition-colors">
                Support
              </a>
              <a href="#" className="hover:text-blue-400 transition-colors">
                Contact
              </a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-900 text-center text-gray-600">
            <p>© 2025 Rawlens. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
