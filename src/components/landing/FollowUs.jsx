import { Instagram, Facebook } from "lucide-react"

export default function FollowUs() {
  return (
    <section className="py-12 sm:py-16 lg:py-20 px-5 lg:px-8 bg-background border-t border-border">
      <div className="max-w-5xl mx-auto">
        <div className="text-center">
          <h3 className="text-xl sm:text-2xl lg:text-4xl font-bold tracking-tight mb-6 sm:mb-8 text-foreground">
            FOLLOW US ON
          </h3>
          <p className="text-sm sm:text-base lg:text-xl text-muted-foreground font-light mb-8 sm:mb-10 leading-relaxed px-4 sm:px-0">
            Stay updated with our latest gear, special offers, and creative inspiration.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 lg:gap-6 justify-center px-4 sm:px-0">
            <a
              href="https://www.instagram.com/rawlensph/"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center justify-center gap-2 sm:gap-3 bg-gradient-accent text-white font-semibold px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base tracking-[0.15em] transition-all duration-300 hover:shadow-glow hover:scale-105 active:scale-95 rounded-lg sm:rounded-xl"
            >
              <Instagram className="h-4 w-4 sm:h-5 sm:w-5 group-hover:scale-110 transition-transform duration-300" />
              <span>INSTAGRAM</span>
            </a>
            <a
              href="https://www.facebook.com/profile.php?id=61568426289637"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center justify-center gap-2 sm:gap-3 bg-accent text-accent-foreground font-semibold px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base tracking-[0.15em] transition-all duration-300 hover:shadow-glow hover:scale-105 active:scale-95 rounded-lg sm:rounded-xl"
            >
              <Facebook className="h-4 w-4 sm:h-5 sm:w-5 group-hover:scale-110 transition-transform duration-300" />
              <span>FACEBOOK</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
