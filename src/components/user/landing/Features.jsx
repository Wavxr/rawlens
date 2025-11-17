import { Heart, Clock, Shield, Smartphone } from "lucide-react"

const featuresList = [
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

export default function Features() {
  return (
    <section className="py-24 lg:py-32 px-5 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-8 leading-tight">
            <span className="block text-black">PROFESSIONAL</span>
            <span className="block text-gray-500">GRADE</span>
          </h2>
          <p className="text-lg lg:text-2xl text-gray-600 font-light max-w-3xl mx-auto leading-relaxed">
            Every camera in our collection is meticulously maintained and tested to ensure peak performance for your
            creative projects.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {featuresList.map((feature, index) => (
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
  )
}
