import { Link } from 'react-router-dom'
import { FiCompass } from 'react-icons/fi'
import { EmptyState } from '../components/ui'

export default function NotFound() {
  return (
    <div className="fullpage">
      <EmptyState icon={FiCompass} title="Page not found" text="That page does not exist." action={<Link className="btn btn-primary" to="/">Go home</Link>} />
    </div>
  )
}
