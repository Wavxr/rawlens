import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { FileText, Loader2, X, Download, Info, Send } from 'lucide-react';
import { generateSignedContractPdf } from '../../services/pdfService';
import { getPublicCameraByName, calculateRentalQuote } from '../../services/publicService';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'react-toastify';

// Contract Generator Modal (identical content to page version, adapted for modal)
export default function ContractGeneratorModal({ open, onClose, initialData = {} }) {
  const [form] = useState({
    customerName: initialData?.name || '',
    cameraName: initialData?.equipment || '',
    startDate: initialData?.startDate || '',
    endDate: initialData?.endDate || ''
  });
  const [errors, setErrors] = useState({});
  const [signatureDataUrl, setSignatureDataUrl] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const sigCanvasRef = useRef(null);
  const canvasWrapperRef = useRef(null);
  const [selectedCameraPricing, setSelectedCameraPricing] = useState({ price_1to3: null, price_4plus: null });
  const [estimate, setEstimate] = useState(null);
  const pricingType = estimate?.days && estimate.days > 3 ? 'Discounted' : 'Standard';

  // No field inputs shown; we only display summary from initialData

  // No camera selection; cameraName is from initial data

  const clearSignature = () => {
    sigCanvasRef.current?.clear();
    setSignatureDataUrl(null);
  };

  const saveSignature = () => {
    if (!sigCanvasRef.current) return;
    if (sigCanvasRef.current.isEmpty()) {
      setErrors(prev => ({ ...prev, signature: 'Please provide a signature.' }));
      return;
    }
    const data = sigCanvasRef.current.toDataURL();
    setSignatureDataUrl(data);
    setErrors(prev => ({ ...prev, signature: '' }));
  };

  const validate = () => {
    const next = {};
    // Name, device, dates come from parent form; only require signature here
    if (!signatureDataUrl) next.signature = 'Signature required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // Canvas fix similar to page
  useLayoutEffect(() => {
    if (!open) return;
    if (!canvasWrapperRef.current || !sigCanvasRef.current) return;
    const wrapper = canvasWrapperRef.current;
    const canvas = sigCanvasRef.current.canvas;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = wrapper.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
  }, [open, signatureDataUrl]);

  // No reset UX in modal

  // When camera or dates change, fetch pricing and compute estimate
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function run() {
      const camName = initialData?.equipment || form.cameraName;
      if (!camName) { setSelectedCameraPricing({ price_1to3: null, price_4plus: null }); setEstimate(null); return; }
      const { data } = await getPublicCameraByName(camName);
      if (cancelled) return;
      const pricing = { price_1to3: data?.price_1to3 ?? null, price_4plus: data?.price_4plus ?? null };
      setSelectedCameraPricing(pricing);
      const s = initialData?.startDate || form.startDate;
      const e = initialData?.endDate || form.endDate;
      if (s && e) {
        const days = Math.ceil((new Date(e) - new Date(s)) / (1000 * 60 * 60 * 24)) + 1;
        if (!isNaN(days) && days > 0) {
          const total = calculateRentalQuote({ days, price_1to3: pricing.price_1to3, price_4plus: pricing.price_4plus });
          setEstimate({ days, total });
        } else {
          setEstimate(null);
        }
      } else {
        setEstimate(null);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [open, initialData?.equipment, initialData?.startDate, initialData?.endDate]);

  const arrayBufferToBase64 = (bytes) => {
    let binary = '';
    const len = bytes.length;
    const chunkSize = 0x8000;
    for (let i = 0; i < len; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
      binary += String.fromCharCode.apply(null, chunk);
    }
    return btoa(binary);
  };

  // Prevent background scroll while modal is open (mobile + desktop)
  // Must be declared before any early returns to keep hooks order stable
  useEffect(() => {
    if (!open) return;
    const originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalBodyOverflow;
    };
  }, [open]);

  // Modal no longer offers a separate Generate PDF button

  const handleSendEmail = async () => {
    if (!validate()) return;
    setSendingEmail(true);
    try {
      // Generate PDF bytes for attachment
      const rentalDetails = {
        cameraName: initialData?.equipment || form.cameraName,
        startDate: initialData?.startDate || form.startDate,
        endDate: initialData?.endDate || form.endDate,
        customerName: initialData?.name || form.customerName
      };
      const pdfBytes = await generateSignedContractPdf(signatureDataUrl, rentalDetails);
      const base64 = arrayBufferToBase64(new Uint8Array(pdfBytes));

      const payload = {
        // Original inquiry fields from the landing form
  name: initialData?.name || form.customerName,
  email: initialData?.email || '',
  phone: initialData?.phone || '',
  social: initialData?.social || '',
  equipment: initialData?.equipment || form.cameraName,
  startDate: initialData?.startDate || form.startDate,
  endDate: initialData?.endDate || form.endDate,
        rentalDuration: estimate?.days || null,
        additionalDetails: initialData?.additionalDetails || '',
        // Rate details
        rate: {
          price_1to3: selectedCameraPricing.price_1to3,
          price_4plus: selectedCameraPricing.price_4plus,
          days: estimate?.days || null,
          total: estimate?.total || null,
          tier: pricingType,
        },
        // Attachment
        contractPdfBase64: base64,
        contractFileName: `RawLens-Rental-Agreement-${form.customerName || 'renter'}.pdf`,
      };

      const { error } = await supabase.functions.invoke('send-email-inquiry', {
        body: payload,
      });
      if (error) throw error;
      toast.success('Inquiry sent with contract attached. We\'ll get back to you soon.');
      onClose?.();
    } catch (e) {
      console.error('Send email failed', e);
      toast.error(e.message || 'Failed to send email.');
    } finally {
      setSendingEmail(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
  <div className="absolute inset-0 bg-black/50" onClick={onClose} />
  <div className="relative bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full sm:max-w-4xl mx-3 my-4 sm:mx-0 sm:my-0 max-h-[92svh] sm:max-h-[90vh] overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-700" />
            <h2 className="text-sm sm:text-base font-semibold text-slate-800">Rental Agreement</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
  <div className="overflow-y-auto max-h-[calc(92svh-56px)] sm:max-h-[calc(90vh-56px)] p-4 sm:p-6 overscroll-contain">
          <div className="bg-white">
            <section className="space-y-4">
              <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-lg p-3 sm:p-4">
                <Info className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
                <p className="text-[11px] sm:text-xs md:text-sm text-slate-600 leading-relaxed">
                  Review the summary below and sign. After sending, the contract PDF will be attached to the email we receive.
                </p>
              </div>
              {/* Rental Summary (styled like ContractSigningModal) */}
              <div className="mb-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-800 mb-2">Rental Summary</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="font-medium">Camera:</span>
                  <span>{initialData?.equipment || form.cameraName || '—'}</span>
                  <span className="font-medium">Rental Period:</span>
                  <span>{(initialData?.startDate || form.startDate) ? new Date(initialData?.startDate || form.startDate).toLocaleDateString() : '—'} to {(initialData?.endDate || form.endDate) ? new Date(initialData?.endDate || form.endDate).toLocaleDateString() : '—'}</span>
                  <span className="font-medium">Duration:</span>
                  <span>{estimate?.days != null ? `${estimate.days} day${estimate.days === 1 ? '' : 's'}` : '—'}</span>
                  <span className="font-medium">Total Price:</span>
                  <span className="font-bold text-lg">
                    {estimate?.total != null
                      ? `₱${Number(estimate.total).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '—'}
                  </span>
                  <span className="font-medium">Rate Tier:</span>
                  <span>{pricingType}</span>
                  <span className="font-medium">Rates:</span>
                  <span className="text-slate-700">
                    {selectedCameraPricing.price_1to3 != null ? `1–3 ₱${Number(selectedCameraPricing.price_1to3).toLocaleString('en-PH')}/day` : '—'}
                    {" \u00A0•\u00A0 "}
                    {selectedCameraPricing.price_4plus != null ? `4+ ₱${Number(selectedCameraPricing.price_4plus).toLocaleString('en-PH')}/day` : '—'}
                  </span>
                </div>
              </div>
              {/* Rate details removed per request */}
            </section>

            <section className="space-y-3 mt-6">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-sm font-semibold text-gray-800">Terms & Conditions</h2>
                <a
                  href="/RawLens Camera Agreement.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-xs sm:text-sm text-blue-600 hover:text-blue-800"
                >
                  <Download className="mr-1 h-4 w-4" />
                  View Full Agreement (PDF)
                </a>
              </div>
              <div className="border border-gray-300 rounded-lg p-4 h-60 sm:h-72 md:h-80 overflow-y-auto text-sm text-gray-700 bg-gray-50">
                <p className="mb-3">
                  This Camera Rental Agreement is made and entered into by the undersigned renter
                  <span className="font-semibold"> _____________________________________________ </span>
                  and RawLens PH. By signing this Agreement, the Renter agrees to comply with the terms and conditions outlined herein.
                </p>
                <p className="mb-3">
                  The Renter acknowledges and agrees that RawLens PH may collect and securely store personal information, including Full Name, Phone Number, Email Address, Current Address, social media usernames, rental details, and valid IDs, as well as a reference from a close family member. This data will be used solely for security purposes and to ensure the safe and responsible rental of our equipment. All information will be kept confidential and protected.
                </p>
                <p className="mb-3">
                  The condition of the camera upon its return will be determined solely by RawLens PH. We will thoroughly inspect the equipment to assess its state, ensuring it is consistent with the condition in which it was provided. Any discrepancies, including damage or missing accessories, will be documented, and the renter will be held accountable for any necessary repairs or replacements as determined by RawLens PH.
                </p>
                <p className="mb-3">
                  To ensure the safety of the equipment, RawLens PH reserves the right to track the rented camera via GPS during the rental period. This is for security purposes and to ensure the equipment is returned in a timely manner.
                </p>
                <p className="font-semibold mb-2">IMPORTANT POLICIES</p>
                <p className="mb-3">
                  If the renter fails to return the camera on the agreed date and time, and the delay affects the next renter’s booking, the original renter will be required to shoulder the full rental amount for the affected dates—even in cases of delayed flights, emergencies, or acts of God.
                </p>
                <p className="mb-3">
                  In the event of any damage to the camera or its accessories, the cost of reimbursement will be solely determined by the owner (RawLens PH) based on the assessment of a certified professional technician. This ensures a fair and accurate evaluation of the repair or replacement costs.
                </p>
                <p className="font-semibold mb-2">FAQs</p>
                <p className="font-semibold mb-1">Shipping Option:</p>
                <p className="mb-3">
                  Renters have the option to meet up for pick-up and return or use shipping. For meetups, our location is located at Espana, Manila. Shipping expenses (including delivery guarantee fees) are to be shouldered by the renter.
                </p>
                <p className="font-semibold mb-1">Pick-up & Return Schedule:</p>
                <p className="mb-3">
                  Pickups are made during the start of your renting day. The return day must be within your booking date. Pickup time are flexible and return time is until 11:30 PM only. For any concern regarding schedule of both, you may contact the page for the time.
                </p>
                <p className="font-semibold mb-1">How to Reserve:</p>
                <p className="mb-3">
                  To reserve, complete the form, submit the first four requirements, understand the agreement fully, and sign upon meet-up/prior to booking a rider. A 50% down payment (non-refundable) is required, with the remaining balance due at the pickup or before booking a rider.
                </p>
                <p className="font-semibold mb-1">Mode of Payment (MOP):</p>
                <p className="mb-3">
                  We accept GCASH, PAYMAYA, and SEABANK (bank fees will be shouldered by the renter). Proof of payment must be sent.
                </p>
                <p className="font-semibold mb-1">Students with 1 Valid ID:</p>
                <p className="mb-3">
                  Students may present their student ID and registration form, along with a valid ID of a parent or any family member with the same surname. Renters under the age of 18 are not allowed without any valid ID of the parent.
                </p>
                <p className="font-semibold mb-1">Can the Rental be Extended?</p>
                <p className="mb-3">Yes, as long as the camera is available plus the added fees.</p>
                <p className="font-semibold mb-1">When to Pay & Return Security Deposit:</p>
                <p className="mb-3">
                  For meet-ups: At the time of receiving the camera, the renter must pay the security deposit. For shipping: Renters are required to pay the security deposit on the date they intend to rent and prior to booking a rider. The camera will be inspected once returned, and a refund will be made.
                </p>
                <p className="font-semibold mb-1">Will the Camera be in Good Working Order?</p>
                <p className="mb-3">
                  All cameras are purchased brand new and are tested before issuing. The renter may test the camera during the meet-up.
                </p>
                <p className="font-semibold mb-2">Terms and Conditions</p>
                <ul className="list-disc pl-5 mb-3 space-y-2">
                  <li>The renter agrees to return the camera and its accessories in the same condition as received, transfer all pictures and videos before handing over the camera, and ensure that the battery is fully charged or at least partially charged.</li>
                  <li>A 50% down payment is required to secure the booking, and the remaining balance is to be paid on the rental date along with the PHP 1,000 security deposit.</li>
                  <li>Cancellations are not allowed, and the reservation fee/down payment is non-refundable.</li>
                  <li>For late returns, the renter will be charged the daily camera rate multiplied by the number of calendar days delayed.</li>
                  <li>The renter is responsible for any loss, theft, or damage to the equipment and must bear the cost of replacement or repair.</li>
                  <li>The renter acknowledges that the given reference person will be contacted as part of the verification process.</li>
                  <li>The renter consents to the publication of their rental experience on social media. If the camera is not returned after the rental period, legal action will be taken.</li>
                  <li>The renter assumes full responsibility for any loss or damage that may occur during the shipment of the camera via Lalamove or any other shipping method.</li>
                </ul>
                <p>
                  <strong>Acceptance:</strong> By signing below, you confirm having read and agreed to the terms and conditions of this rental agreement, the rental price, and the full content of the linked PDF document.
                </p>
              </div>
            </section>

            <section className="space-y-4 mt-6">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Signature</h2>
              {!signatureDataUrl ? (
                <>
                  <div ref={canvasWrapperRef} className="border-2 border-dashed border-slate-300 rounded-lg bg-white h-40 sm:h-48 p-2">
                    <SignatureCanvas
                      ref={sigCanvasRef}
                      penColor="black"
                      canvasProps={{ className: 'w-full h-full rounded' }}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={clearSignature} type="button" className="px-3 py-2 text-xs rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700">Clear</button>
                    <button onClick={saveSignature} type="button" className="px-4 py-2 text-xs rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium">Save Signature</button>
                  </div>
                  {errors.signature && <p className="text-xs text-red-600">{errors.signature}</p>}
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-green-600 text-sm font-medium">Signature captured.</p>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setSignatureDataUrl(null)} className="px-3 py-2 text-xs rounded-lg border border-slate-300 hover:bg-slate-50">Resign</button>
                  </div>
                </div>
              )}
            </section>

            <section className="space-y-4 mt-6">
              {errors.submit && <p className="text-xs text-red-600">{errors.submit}</p>}
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-center">
                <button
                  type="button"
                  onClick={handleSendEmail}
                  disabled={sendingEmail}
                  className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-6 h-11 rounded-lg bg-[#052844] hover:bg-[#063a5e] text-white text-sm font-medium disabled:opacity-60"
                >
                  {sendingEmail && <Loader2 className="h-4 w-4 animate-spin" />}
                  {sendingEmail ? 'Sending Email...' : (<><Send className="h-4 w-4"/> Send Email</>)}
                </button>
                {/* No separate generate/reset/download in modal */}
              </div>
              {/* No preview iframe in modal */}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
