import { Camera, MapPin, Clock } from "lucide-react"

export default function Footer() {
  return (
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
  )
}
