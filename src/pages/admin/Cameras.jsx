import { useState } from "react"
import { insertCamera } from "../../services/cameraService"

export default function Cameras() {
  const [camera, setCamera] = useState({
    name: "",
    description: "",
    pricePerDay: ""
  })
  const [image, setImage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleChange = e => setCamera({ ...camera, [e.target.name]: e.target.value })
  const handleImageChange = e => setImage(e.target.files[0])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess(false)

    if (!camera.name || !camera.description || !camera.pricePerDay || !image) {
      setError("All fields are required.")
      setLoading(false)
      return
    }

    const { error: insertError } = await insertCamera(camera, image)
    if (insertError) setError(insertError.message)
    else {
      setSuccess(true)
      setCamera({ name: "", description: "", pricePerDay: "" })
      setImage(null)
    }

    setLoading(false)
  }

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded shadow mt-10">
      <h2 className="text-xl font-bold mb-4">Add New Camera</h2>

      {error && <p className="text-red-500 mb-4">{error}</p>}
      {success && <p className="text-green-500 mb-4">Camera added successfully!</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input name="name" value={camera.name} onChange={handleChange}
          placeholder="Camera Name" className="w-full p-2 border rounded" />

        <textarea name="description" value={camera.description} onChange={handleChange}
          placeholder="Description" className="w-full p-2 border rounded" />

        <input name="pricePerDay" value={camera.pricePerDay} onChange={handleChange}
          type="number" step="0.01" placeholder="Price per day (₱)" className="w-full p-2 border rounded" />

        <input type="file" accept="image/*" onChange={handleImageChange}
          className="w-full border p-2 rounded" />

        <button type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          disabled={loading}>
          {loading ? "Saving..." : "Add Camera"}
        </button>
      </form>
    </div>
  )
}
