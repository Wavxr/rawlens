import { useState, useEffect } from "react"
import { Mail, Send } from "lucide-react"
import DateFilterInput from "../forms/DateFilterInput"
import ContractGeneratorModal from "../modals/ContractGeneratorModal"
import { calculateRentalQuote } from "../../services/publicService"

export default function InquiryForm({ cameraNames = [], cameras = [] }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    social: "",
    equipment: "",
    startDate: "",
    endDate: "",
    additionalDetails: "",
  })
  const [liveEstimate, setLiveEstimate] = useState(null)
  const [liveRateTier, setLiveRateTier] = useState(null)
  const [showContractModal, setShowContractModal] = useState(false)
  const [isSubmitting] = useState(false)

  const currentCamera = cameras.find((camera) => camera.name === formData.equipment)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const selectedEquipment = formData.equipment
  const selectedStartDate = formData.startDate
  const selectedEndDate = formData.endDate

  useEffect(() => {
    if (!selectedEquipment || !selectedStartDate || !selectedEndDate) {
      setLiveEstimate(null)
      return
    }

    const start = new Date(selectedStartDate)
    const end = new Date(selectedEndDate)
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1

    if (isNaN(days) || days < 1) {
      setLiveEstimate(null)
      return
    }

    const camera = cameras.find((c) => c.name === selectedEquipment)
    if (!camera) {
      setLiveEstimate(null)
      return
    }

    const total = calculateRentalQuote({
      days,
      price_1to3: camera.price_1to3,
      price_4plus: camera.price_4plus,
    })

    setLiveEstimate({ days, total })
    setLiveRateTier(days > 3 ? "Discounted" : "Standard")
  }, [selectedEquipment, selectedStartDate, selectedEndDate, cameras])

  const handleSubmit = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setShowContractModal(true)
  }

  return (
    <section id="contact" className="py-24 lg:py-32 px-5 lg:px-8 bg-background">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12 lg:mb-16">
          <div className="inline-flex items-center bg-accent/10 border border-accent/20 text-accent px-3 py-1.5 lg:px-4 lg:py-2 font-semibold tracking-[0.15em] text-[10px] sm:text-xs lg:text-sm mb-6 lg:mb-8 rounded-full backdrop-blur-sm">
            <Mail className="w-3 h-3 lg:w-4 lg:h-4 mr-2 lg:mr-3" />
            GET IN TOUCH
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 lg:mb-8 leading-tight px-4">
            <span className="block text-foreground">SEND US</span>
            <span className="block text-muted-foreground">AN EMAIL</span>
          </h2>
          <p className="text-base sm:text-lg lg:text-2xl text-muted-foreground font-light max-w-3xl mx-auto leading-relaxed px-4">
            Fill out the form below and we'll get back to you with availability and pricing details.
          </p>
        </div>

        <div
          className="bg-card border border-border p-4 sm:p-6 lg:p-12 rounded-xl lg:rounded-2xl backdrop-blur-sm shadow-elegant"
          role="form"
          aria-label="Send inquiry form"
        >
          <div className="grid md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-4 sm:mb-6 lg:mb-8">
            <div>
              <label
                htmlFor="name"
                className="block text-xs sm:text-sm lg:text-base font-semibold text-foreground mb-2 lg:mb-3 tracking-wide"
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
                className="w-full px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 lg:py-4 text-sm lg:text-base bg-background border border-border rounded-lg lg:rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300"
                placeholder="Your full name"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-xs sm:text-sm lg:text-base font-semibold text-foreground mb-2 lg:mb-3 tracking-wide"
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
                className="w-full px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 lg:py-4 text-sm lg:text-base bg-background border border-border rounded-lg lg:rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300"
                placeholder="your.email@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-xs sm:text-sm lg:text-base font-semibold text-foreground mb-2 lg:mb-3 tracking-wide"
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
                className="w-full px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 lg:py-4 text-sm lg:text-base bg-background border border-border rounded-lg lg:rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300"
                placeholder="+63 XXX XXX XXXX"
              />
            </div>

            <div>
              <label
                htmlFor="social"
                className="block text-xs sm:text-sm lg:text-base font-semibold text-foreground mb-2 lg:mb-3 tracking-wide"
              >
                SOCIAL (OPTIONAL)
              </label>
              <input
                type="text"
                id="social"
                name="social"
                value={formData.social}
                onChange={handleInputChange}
                className="w-full px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 lg:py-4 text-sm lg:text-base bg-background border border-border rounded-lg lg:rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300"
                placeholder="@username or link (Instagram, Facebook, etc.)"
              />
            </div>

            <div>
              <label
                htmlFor="equipment"
                className="block text-xs sm:text-sm lg:text-base font-semibold text-foreground mb-2 lg:mb-3 tracking-wide"
              >
                EQUIPMENT NEEDED *
              </label>
              <select
                id="equipment"
                name="equipment"
                required
                value={formData.equipment}
                onChange={handleInputChange}
                className="w-full px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 lg:py-4 text-sm lg:text-base bg-background border border-border rounded-lg lg:rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300"
              >
                <option value="">Select a camera</option>
                {cameraNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
                <option value="Other">Other (please specify in details)</option>
              </select>
            </div>
          </div>

          <div className="mb-4 sm:mb-6 lg:mb-8">
            <label className="block text-xs sm:text-sm lg:text-base font-semibold text-foreground mb-2 lg:mb-3 tracking-wide">
              RENTAL DATES *
            </label>
            <div className="[&>div]:space-y-0 [&>div]:grid [&>div]:grid-cols-1 [&>div]:sm:grid-cols-2 [&>div]:gap-4 [&>div]:sm:gap-6 [&>div]:lg:gap-8">
              <DateFilterInput
                startDate={formData.startDate}
                endDate={formData.endDate}
                onStartDateChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                onEndDateChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                idPrefix="inquiry"
              />
            </div>
          </div>

          <div className="mb-3 sm:mb-4 lg:mb-5">
            <label
              htmlFor="additionalDetails"
              className="block text-xs sm:text-sm lg:text-base font-semibold text-foreground mb-2 lg:mb-3 tracking-wide"
            >
              ADDITIONAL DETAILS
            </label>
            <textarea
              id="additionalDetails"
              name="additionalDetails"
              rows={4}
              value={formData.additionalDetails}
              onChange={handleInputChange}
              className="w-full px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 lg:py-4 text-sm lg:text-base bg-background border border-border rounded-lg lg:rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300 resize-none"
              placeholder="Tell us more about your project, special requirements, or any questions you have..."
            />
          </div>

          {liveEstimate && (
            <div className="mb-6 sm:mb-8 lg:mb-10">
              <div className="p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[11px] sm:text-xs text-blue-800 font-semibold">Rental Summary</div>
                  <div className="text-[10px] sm:text-xs text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200">
                    {liveRateTier}
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] sm:text-xs text-blue-900">
                  <div className="opacity-70">Camera</div>
                  <div className="font-medium text-right truncate">{formData.equipment || "—"}</div>
                  <div className="opacity-70">Period</div>
                  <div className="font-medium text-right">
                    {formData.startDate ? new Date(formData.startDate).toLocaleDateString() : "—"} —{" "}
                    {formData.endDate ? new Date(formData.endDate).toLocaleDateString() : "—"}
                  </div>
                  <div className="opacity-70">Duration</div>
                  <div className="font-medium text-right">
                    {liveEstimate.days} day{liveEstimate.days === 1 ? "" : "s"}
                  </div>
                  <div className="opacity-70">Rates</div>
                  <div className="text-right text-blue-900">
                    {currentCamera?.price_1to3 != null
                      ? `1–3 ₱${Number(currentCamera.price_1to3).toLocaleString("en-PH")}/day`
                      : "—"}
                    {" \u00A0•\u00A0 "}
                    {currentCamera?.price_4plus != null
                      ? `4+ ₱${Number(currentCamera.price_4plus).toLocaleString("en-PH")}/day`
                      : "—"}
                  </div>
                  <div className="opacity-70">Estimated Total</div>
                  <div className="font-bold text-right text-blue-900 flex items-center justify-end gap-2">
                    <span>₱{Number(liveEstimate.total).toLocaleString("en-PH")}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="w-full bg-primary text-primary-foreground font-semibold px-6 sm:px-8 py-3 sm:py-4 lg:py-5 text-sm sm:text-base lg:text-lg tracking-[0.15em] transition-all duration-300 hover:shadow-glow hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 rounded-lg lg:rounded-xl flex items-center justify-center gap-2 sm:gap-3"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                  <span>SENDING...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>SEND INQUIRY</span>
                </>
              )}
            </button>
          </div>
        </div>

        <ContractGeneratorModal
          open={showContractModal}
          onClose={() => setShowContractModal(false)}
          initialData={{
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            social: formData.social,
            equipment: formData.equipment,
            startDate: formData.startDate,
            endDate: formData.endDate,
            additionalDetails: formData.additionalDetails,
          }}
        />
      </div>
    </section>
  )
}
