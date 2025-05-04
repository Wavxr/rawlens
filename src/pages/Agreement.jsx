import { useState, useRef } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { generateAgreementPdf } from '../utils/pdfUtils'

function Agreement() {
  const [formData, setFormData] = useState({
    device: '',
    name: '',
    address: '',
    contactNumber: '',
    dateBorrow: '',
    dateReturn: '',
    modeOfDelivery: '',
  })

  const sigCanvasRef = useRef(null)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleClear = () => {
    sigCanvasRef.current.clear()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
  
    const signatureData = sigCanvasRef.current.toDataURL('image/png')
  
    await generateAgreementPdf(formData, signatureData)
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">Rent a Camera</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Device */}
        <div>
          <label className="block font-semibold mb-1">Device:</label>
          <select
            name="device"
            value={formData.device}
            onChange={handleChange}
            className="border border-gray-300 rounded p-2 w-full"
            required
          >
            <option value="">Select a device</option>
            <option value="EOS M100">EOS M100</option>
            <option value="G7X Mark II">G7X Mark II</option>
            <option value="G7X Mark III">G7X Mark III</option>
            <option value="Osmo DJI Pocket 3">Osmo DJI Pocket 3</option>
          </select>
        </div>

        {/* Name */}
        <div>
          <label className="block font-semibold mb-1">Name:</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="border border-gray-300 rounded p-2 w-full"
            required
          />
        </div>

        {/* Address */}
        <div>
          <label className="block font-semibold mb-1">Address:</label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="border border-gray-300 rounded p-2 w-full"
            required
          />
        </div>

        {/* Contact Number */}
        <div>
          <label className="block font-semibold mb-1">Contact Number:</label>
          <input
            type="text"
            name="contactNumber"
            value={formData.contactNumber}
            onChange={handleChange}
            className="border border-gray-300 rounded p-2 w-full"
            required
          />
        </div>

        {/* Date of Borrow */}
        <div>
          <label className="block font-semibold mb-1">Date of Borrow:</label>
          <input
            type="date"
            name="dateBorrow"
            value={formData.dateBorrow}
            onChange={handleChange}
            className="border border-gray-300 rounded p-2 w-full"
            required
          />
        </div>

        {/* Date of Return */}
        <div>
          <label className="block font-semibold mb-1">Date of Return:</label>
          <input
            type="date"
            name="dateReturn"
            value={formData.dateReturn}
            onChange={handleChange}
            className="border border-gray-300 rounded p-2 w-full"
            required
          />
        </div>

        {/* Mode of Delivery */}
        <div>
          <label className="block font-semibold mb-1">Mode of Delivery:</label>
          <select
            name="modeOfDelivery"
            value={formData.modeOfDelivery}
            onChange={handleChange}
            className="border border-gray-300 rounded p-2 w-full"
            required
          >
            <option value="">Select mode of delivery</option>
            <option value="Pick Up">Pick Up</option>
            <option value="Shipping">Shipping</option>
          </select>
        </div>

        {/* Signature */}
        <div>
          <label className="block font-semibold mb-1">Signature:</label>
          <SignatureCanvas
            ref={sigCanvasRef}
            penColor="black"
            canvasProps={{ width: 400, height: 150, className: "border border-gray-300 rounded" }}
          />
          <button type="button" onClick={handleClear} className="mt-2 text-blue-500 underline">
            Clear Signature
          </button>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="bg-blue-600 text-white rounded p-2 hover:bg-blue-700 transition"
        >
          Submit
        </button>
      </form>
    </div>
  )
}

export default Agreement
