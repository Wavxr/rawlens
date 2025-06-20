import { useState } from 'react'
import LoginForm from './LoginForm'
import SignupForm from './SignupForm'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">
          {isLogin ? 'Login' : 'Sign Up'}
        </h1>
        
        {isLogin ? <LoginForm /> : <SignupForm />}
        
        <button 
          onClick={() => setIsLogin(!isLogin)}
          className="w-full text-blue-600 hover:text-blue-700 text-sm mt-4 transition-colors"
        >
          {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
        </button>
      </div>
    </div>
  )
}