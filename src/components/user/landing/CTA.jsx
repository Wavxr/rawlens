import { Instagram, ArrowRight } from "lucide-react"

export default function CTA() {
  const navigateToSignup = () => {
    window.location.href = "/signup"
  }

  return (
    <section className="py-16 sm:py-24 lg:py-32 px-5 lg:px-8 bg-gradient-surface">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-20 items-center">
          <div className="space-y-6 sm:space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center bg-success/10 border border-success/20 text-success px-3 py-1.5 sm:px-4 sm:py-2 font-medium tracking-[0.15em] text-[10px] sm:text-xs rounded-full backdrop-blur-sm">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-success rounded-full mr-2 sm:mr-3 animate-glow-pulse"></div>
              LET'S CONNECT
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
              <span className="block text-foreground">READY TO</span>
              <span className="block text-muted-foreground">CAPTURE MORE?</span>
            </h2>
            <p className="text-base sm:text-lg lg:text-2xl text-muted-foreground font-light leading-relaxed max-w-xl mx-auto lg:mx-0 px-4 sm:px-0">
              Whether you're planning a shoot, have questions about our equipment, or just want to chat about your
              creative vision — we're here to help make it happen.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start px-4 sm:px-0">
              <button
                onClick={navigateToSignup}
                className="bg-primary text-primary-foreground font-semibold px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base tracking-[0.15em] transition-all duration-300 hover:shadow-glow hover:scale-105 active:scale-95 rounded-lg sm:rounded-xl"
              >
                LOGIN OR SIGN UP
              </button>
            </div>
          </div>

          <div className="bg-card border border-border p-6 sm:p-8 lg:p-12 rounded-xl lg:rounded-2xl backdrop-blur-sm shadow-elegant hover:shadow-glow transition-all duration-500 hover:scale-105 modern-card">
            <div className="text-center space-y-6 sm:space-y-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-gradient-accent flex items-center justify-center mx-auto rounded-xl lg:rounded-2xl shadow-glow">
                <Instagram className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl lg:text-4xl font-bold tracking-[0.1em] text-foreground">
                QUICK MESSAGE
              </h3>
              <p className="text-muted-foreground font-light leading-relaxed text-sm sm:text-base lg:text-xl px-4 sm:px-0">
                Need a faster response? Send us a direct message on Instagram and we'll get back to you right away.
              </p>
              <a
                href="https://www.instagram.com/rawlensph/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 sm:gap-3 bg-primary text-primary-foreground font-semibold px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base tracking-[0.15em] transition-all duration-300 hover:shadow-glow hover:scale-105 active:scale-95 rounded-lg sm:rounded-xl"
              >
                <Instagram className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>MESSAGE US</span>
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
