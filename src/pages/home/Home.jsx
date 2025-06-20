import { useNavigate } from 'react-router-dom'

function Home() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <h1 className="text-4xl font-bold text-gray-900">RawLensPH</h1>
      <p className="mt-4 text-xl text-gray-600">Rent Professional Cameras</p>
      <button
        onClick={() => navigate('/auth')}
        className="mt-8 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      >
        Rent Now
      </button>
    </div>
  )
}

export default Home
