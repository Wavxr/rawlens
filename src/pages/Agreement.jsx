import { Link } from 'react-router-dom'
import RentForm from '../components/RentForm'

function Agreement() {
  return (
    <div>
      <h1>Agreement Page</h1>
      <RentForm />
      <Link to="/">
        <button>Back to Home</button>
      </Link>
    </div>
  )
}

export default Agreement