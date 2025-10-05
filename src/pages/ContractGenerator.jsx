import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { FileText, Loader2, Camera, User, ArrowLeft, Download, RefreshCw, Info } from 'lucide-react';
import { generateSignedContractPdf } from '../services/pdfService';
import DateFilterInput from '../components/forms/DateFilterInput';

// Static camera catalog for quick contract creation (public, no auth)
const CAMERAS = [
  { id: 1, name: 'Canon PowerShot G7X Mark II' },
  { id: 2, name: 'Canon PowerShot G7X Mark III' },
  { id: 3, name: 'Canon EOS M100' },
  { id: 4, name: 'DJI Osmo Pocket 3' },
  { id: 5, name: 'Ricoh GR IIIx' },
];

/*
  Public Contract Generator Page
  - No authentication required
  - Collects minimal rental info + signature
  - Generates an in-browser PDF (downloads directly)
  - Does NOT upload to Supabase (offline / quick flow for IG inquiries)
*/
export default function ContractGenerator() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    customerName: '',
    cameraName: '', // resolved camera name
    startDate: '',
    endDate: ''
  });
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [errors, setErrors] = useState({});
  const [signatureDataUrl, setSignatureDataUrl] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBlobUrl, setGeneratedBlobUrl] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const sigCanvasRef = useRef(null);
  const canvasWrapperRef = useRef(null);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleCameraSelect = (value) => {
    setSelectedCameraId(value);
    const cam = CAMERAS.find(c => String(c.id) === String(value));
    handleChange('cameraName', cam ? cam.name : '');
  };

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
    if (!form.customerName.trim()) next.customerName = 'Name required';
    if (!form.cameraName.trim()) next.cameraName = 'Device required';
    if (!form.startDate) next.startDate = 'Start date required';
    if (!form.endDate) next.endDate = 'End date required';
    if (form.startDate && form.endDate) {
      if (new Date(form.endDate) < new Date(form.startDate)) {
        next.endDate = 'Return date must be after start';
      }
    }
    if (!signatureDataUrl) next.signature = 'Signature required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleGenerate = async () => {
    if (!validate()) return;
    setIsGenerating(true);
    setGeneratedBlobUrl(old => { if (old) URL.revokeObjectURL(old); return null; });
    try {
      // Reuse generateSignedContractPdf but bypass upload; fabricate minimal rentalDetails
      const rentalDetails = {
        cameraName: form.cameraName,
        startDate: form.startDate,
        endDate: form.endDate,
        customerName: form.customerName
      };
      const pdfBytes = await generateSignedContractPdf(signatureDataUrl, rentalDetails);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setGeneratedBlobUrl(url);
      setShowPreview(true);
    } catch (e) {
      console.error(e);
      setErrors(prev => ({ ...prev, submit: e.message || 'Failed to generate PDF' }));
    } finally {
      setIsGenerating(false);
    }
  };

  // Canvas fix similar to modal (simplified)
  useLayoutEffect(() => {
    if (!canvasWrapperRef.current || !sigCanvasRef.current) return;
    const wrapper = canvasWrapperRef.current;
    const canvas = sigCanvasRef.current.canvas; // internal canvas
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = wrapper.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
  }, [isGenerating, signatureDataUrl]);

  const resetAll = () => {
    setForm({ customerName: '', cameraName: '', startDate: '', endDate: '' });
    setSelectedCameraId('');
    setErrors({});
    clearSignature();
    setSignatureDataUrl(null);
    setGeneratedBlobUrl(old => { if (old) URL.revokeObjectURL(old); return null; });
    setShowPreview(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex flex-col">
      <header className="px-4 sm:px-6 py-4 border-b bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 active:scale-95 transition" aria-label="Back to Landing">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg sm:text-xl font-semibold text-slate-800">Rental Agreement</h1>
          <span className="ml-auto text-[10px] sm:text-xs text-slate-500">No data stored</span>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-28">
          <div className="bg-white shadow-sm border border-slate-200 rounded-xl p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6">
            <section className="space-y-4">
              <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-lg p-3 sm:p-4">
                <Info className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
                <p className="text-[11px] sm:text-xs md:text-sm text-slate-600 leading-relaxed">
                  Fill out this rental agreement and sign to generate your contract. No personal data is saved on our servers. After downloading the PDF, keep a copy for your records.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wide text-slate-600 flex items-center gap-1">
                    <User className="h-4 w-4" /> Renter Name
                  </label>
                  <input
                    type="text"
                    value={form.customerName}
                    onChange={e => handleChange('customerName', e.target.value)}
                    placeholder="Juan Dela Cruz"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-700"
                  />
                  {errors.customerName && <p className="text-[11px] text-red-600">{errors.customerName}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wide text-slate-600 flex items-center gap-1">
                    <Camera className="h-4 w-4" /> Device Borrowed
                  </label>
                  <select
                    value={selectedCameraId}
                    onChange={e => handleCameraSelect(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-700"
                  >
                    <option value="">Select a device</option>
                    {CAMERAS.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {errors.cameraName && <p className="text-[11px] text-red-600">{errors.cameraName}</p>}
                </div>
                {/* Rental Period using DateFilterInput */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-medium uppercase tracking-wide text-slate-600">Rental Period</label>
                    {(errors.startDate || errors.endDate) && (
                      <span className="text-[11px] text-red-600">{errors.startDate || errors.endDate}</span>
                    )}
                  </div>
                  <DateFilterInput
                    startDate={form.startDate}
                    endDate={form.endDate}
                    onStartDateChange={(e) => handleChange('startDate', e.target.value)}
                    onEndDateChange={(e) => handleChange('endDate', e.target.value)}
                    layout="horizontal"
                    theme="light"
                  />
                </div>
              </div>
            </section>

            {/* Terms & Conditions (full, matching ContractSigningModal) */}
            <section className="space-y-3">
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
              <div className="border border-gray-300 rounded-lg p-4 h-96 overflow-y-auto text-sm text-gray-700 bg-gray-50">
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

            {/* Signature Section */}
            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Signature</h2>
              {!signatureDataUrl ? (
                <>
                  <div ref={canvasWrapperRef} className="border-2 border-dashed border-slate-300 rounded-lg bg-white h-48 p-2">
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
                    <button onClick={() => setSignatureDataUrl(null)} className="px-3 py-2 text-xs rounded-lg border border-slate-300 hover:bg-slate-50">Resign</button>
                  </div>
                </div>
              )}
            </section>

            {/* Actions */}
            <section className="space-y-4">
              {errors.submit && <p className="text-xs text-red-600">{errors.submit}</p>}
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-center">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-6 h-11 rounded-lg bg-[#052844] hover:bg-[#063a5e] text-white text-sm font-medium disabled:opacity-60"
                >
                  {isGenerating && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isGenerating ? 'Generating PDF...' : 'Generate PDF'}
                </button>
                <button
                  type="button"
                  onClick={resetAll}
                  disabled={isGenerating}
                  className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-5 h-11 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium"
                >
                  <RefreshCw className="h-4 w-4" /> Reset
                </button>
                {generatedBlobUrl && (
                  <a
                    href={generatedBlobUrl}
                    download={`rental-contract-${form.customerName || 'renter'}.pdf`}
                    className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-6 h-11 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium"
                  >
                    <FileText className="h-4 w-4" /> Download PDF
                  </a>
                )}
              </div>
              {showPreview && generatedBlobUrl && (
                <div className="mt-2 sm:mt-4 border border-slate-200 rounded-lg overflow-hidden">
                  <iframe title="Contract Preview" src={generatedBlobUrl} className="w-full h-[550px] sm:h-[600px] bg-white" />
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      <footer className="pb-6 text-center text-[10px] sm:text-xs text-slate-500">
        RawLens PH • Rental Agreement Generator • No data stored on server
      </footer>
    </div>
  );
}
