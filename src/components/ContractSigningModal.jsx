// src/components/ContractSigningModal.jsx
import React, { useState, useRef, useLayoutEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { X, FileText, Loader2, Download } from 'lucide-react';

const ContractSigningModal = ({
  isOpen,
  onClose,
  camera,
  startDate,
  endDate,
  calculatedPrice,
  onSubmitRequest,
  isSubmitting, // This prop indicates if the parent is processing the request
  isGeneratingContract, // This prop indicates if the PDF is being generated
}) => {
  const [signatureDataUrl, setSignatureDataUrl] = useState(null);
  const canvasWrapperRef = useRef(null);
  const sigCanvasRef = useRef();

  const clearSignature = () => {
    if (sigCanvasRef.current) {
      sigCanvasRef.current.clear();
      setSignatureDataUrl(null);
    }
  };

  const saveSignature = () => {
    if (sigCanvasRef.current) {
      const dataURL = sigCanvasRef.current.toDataURL();
      const isEmpty = dataURL === 'image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      if (dataURL && !isEmpty) {
        setSignatureDataUrl(dataURL);
      } else {
        alert('Please provide a signature.');
      }
    }
  };

  useLayoutEffect(() => {
    let isCancelled = false;

    const fixCanvasOffset = () => {
      if (isOpen && sigCanvasRef.current && sigCanvasRef.current._sigPad && sigCanvasRef.current.canvas && canvasWrapperRef.current) {
        try {
          const canvas = sigCanvasRef.current.canvas;
          const signaturePad = sigCanvasRef.current._sigPad;
          const wrapperDiv = canvasWrapperRef.current;

          const dpr = window.devicePixelRatio || 1;
          console.log(`[ContractModal Canvas Fix] Detected Device Pixel Ratio: ${dpr}`);

          const rect = wrapperDiv.getBoundingClientRect();
          const cssWidth = rect.width;
          const cssHeight = rect.height;

          if (cssWidth <= 0 || cssHeight <= 0) {
              console.warn("[ContractModal Canvas Fix] Wrapper div has invalid dimensions.");
              return;
          }

          const newCanvasWidth = Math.round(cssWidth * dpr);
          const newCanvasHeight = Math.round(cssHeight * dpr);

          let signatureData = null;
          if (!signaturePad.isEmpty()) {
              signatureData = signaturePad.toData();
              console.log("[ContractModal Canvas Fix] Stored existing signature data.");
          }

          sigCanvasRef.current.clear();
          signaturePad.clear();

          canvas.width = newCanvasWidth;
          canvas.height = newCanvasHeight;
          canvas.style.width = `${cssWidth}px`;
          canvas.style.height = `${cssHeight}px`;
          canvas.style.maxWidth = '100%';
          canvas.style.maxHeight = '100%';
          console.log(`[ContractModal Canvas Fix] Canvas attributes set to ${newCanvasWidth} x ${newCanvasHeight}, CSS size: ${cssWidth} x ${cssHeight}`);

          const ctx = canvas.getContext('2d');
          if (ctx) {
              ctx.setTransform(1, 0, 0, 1, 0, 0);
              ctx.scale(dpr, dpr);
              console.log(`[ContractModal Canvas Fix] Canvas 2D context scaled by ${dpr}x.`);
          } else {
              console.error("[ContractModal Canvas Fix] Failed to get 2D context for canvas.");
              return;
          }

          if (signatureData && signatureData.length > 0) {
              const isValidForNewSize = signatureData.every(stroke =>
                  stroke.points.every(p => p.x >= 0 && p.x <= cssWidth && p.y >= 0 && p.y <= cssHeight)
              );

              if (isValidForNewSize && !isCancelled) {
                  setTimeout(() => {
                      if (!isCancelled && sigCanvasRef.current && sigCanvasRef.current._sigPad) {
                          sigCanvasRef.current._sigPad.fromData(signatureData);
                          console.log("[ContractModal Canvas Fix] Restored signature data to corrected canvas.");
                      }
                  }, 20);
              } else {
                  console.warn("[ContractModal Canvas Fix] Signature data seems incompatible or component unmounted, not restoring.");
              }
          }

          console.log("[ContractModal Canvas Fix] Signature canvas offset fix process completed.");
        } catch (error) {
          console.error("[ContractModal Canvas Fix] An error occurred:", error);
        }
      }
    };

    if (isOpen && sigCanvasRef.current && canvasWrapperRef.current) {
      const timerId = setTimeout(() => {
          if (!isCancelled) {
              fixCanvasOffset();
          }
      }, 50);

      return () => {
          isCancelled = true;
          clearTimeout(timerId);
      };
    }
  }, [isOpen]);

  const handleSubmitClick = () => {
    if (signatureDataUrl) {
      onSubmitRequest(signatureDataUrl);
    }
  };

  if (!isOpen) return null;

  // Determine if the final submit button should be disabled
  const isSubmitDisabled = isSubmitting || isGeneratingContract;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">

          {/* --- HEADER SECTION --- */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Rental Agreement</h2>
            <button
              onClick={onClose}
              disabled={isSubmitDisabled} // Disable close button during submission
              className="text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* --- RENTAL SUMMARY SECTION --- */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">Rental Summary</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="font-medium">Camera:</span>
              <span>{camera?.name}</span>
              <span className="font-medium">Rental Period:</span>
              <span>{new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}</span>
              <span className="font-medium">Duration:</span>
              <span>{calculatedPrice?.days} days</span>
              <span className="font-medium">Total Price:</span>
              <span className="font-bold text-lg">₱{calculatedPrice?.total?.toFixed(2)}</span>
            </div>
          </div>

          {/* --- TERMS & CONDITIONS SECTION --- */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-gray-800">Terms & Conditions</h3>
              <a
                href="/RawLens Camera Agreement.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-sm text-blue-600 hover:text-blue-800"
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
          </div>

          {/* --- SIGNATURE SECTION --- */}
          {!signatureDataUrl ? (
            <>
              <div className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-2">Sign Below:</h3>
                <div
                  ref={canvasWrapperRef}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-2 bg-white w-full h-48"
                >
                  <SignatureCanvas
                    ref={sigCanvasRef}
                    penColor="black"
                    canvasProps={{
                      className: 'sigCanvas w-full h-full border rounded cursor-crosshair'
                    }}
                  />
                </div>
                <button
                  onClick={clearSignature}
                  disabled={isSubmitDisabled} // Disable clear during submission
                  className="mt-2 px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear
                </button>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={onClose}
                  disabled={isSubmitDisabled} // Disable cancel during submission
                  className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={saveSignature}
                  disabled={isSubmitDisabled} // Disable save during submission
                  className={`px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Save Signature
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center">
              <p className="mb-4 text-green-600 font-medium">Signature captured!</p>
              {/* Show either the processing message or the submit button */}
              {isGeneratingContract ? ( // Use the prop passed down for PDF generation
                <div className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>Processing contract and submitting request...</span>
                </div>
              ) : (
                <div className="flex space-x-3">
                  <button
                    onClick={() => setSignatureDataUrl(null)}
                    disabled={isSubmitDisabled} // Disable resign during submission
                    className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Resign
                  </button>
                  {/* The main submit button with loading state */}
                  <button
                    onClick={handleSubmitClick}
                    disabled={isSubmitDisabled} // Main disable condition
                    className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? ( // Show spinner if parent is submitting
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 h-4 w-4" />
                        Submit Rental Request
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContractSigningModal;