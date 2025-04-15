import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Agreement from './pages/Agreement'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/rent" element={<Agreement />} />
    </Routes>
  )
}

export default App