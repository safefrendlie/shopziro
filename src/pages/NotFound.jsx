import { Link } from 'react-router-dom'
import { Empty } from '../components/ui'

export default function NotFound() {
  return (
    <div className="container page">
      <Empty
        icon="search"
        title="Page not found"
        text="The page you are looking for does not exist or has moved."
        action={
          <Link to="/" className="btn btn-primary">
            Back to home
          </Link>
        }
      />
    </div>
  )
}
