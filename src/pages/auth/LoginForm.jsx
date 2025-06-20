import { useState } from 'react'
import { supabase } from '../../services/supabaseClient'

export default function LoginForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const { data, error } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password
    })

    if (error) {
      alert(error.message)
    } else {
      alert('Logged in!')
      console.log('User:', data)
    }
  }

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google'
    })
    if (error) alert(error.message)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md">
      <div>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Email"
          required
          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Password"
          required
          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <button 
        type="submit"
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors"
      >
        Log In
      </button>
      <button
        type="button"
        onClick={handleGoogleLogin}
        className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 transition-colors"
      >
        Sign in with Google
      </button>
    </form>
  )
}