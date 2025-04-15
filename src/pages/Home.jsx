import { Link } from 'react-router-dom'
import LandingPage from '../components/LandingPage'

function Home() {
  return (
    <div>
      <h1>Home Page</h1>
      <LandingPage />
      <Link to="/rent">
        <button>Go to Rent Form</button>
      </Link>
    </div>
  )
}

export default Home