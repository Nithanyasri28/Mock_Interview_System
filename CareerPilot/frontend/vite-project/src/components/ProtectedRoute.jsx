import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/authContext'
import { ErrorState, FullPageSpinner } from './ui'

/** Only lets logged-in users through; everyone else is sent to /login. */
export default function ProtectedRoute() {
  const { token, user, loading, authError, retry } = useAuth()
  const location = useLocation()

  if (!token) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (loading) return <FullPageSpinner />
  if (authError && !user) {
    return (
      <div className="fullpage">
        <div style={{ maxWidth: 480 }}>
          <ErrorState message={authError} onRetry={retry} />
        </div>
      </div>
    )
  }
  return <Outlet />
}

/** Login and register pages: logged-in users go straight to the dashboard. */
export function PublicOnlyRoute() {
  const { token } = useAuth()
  if (token) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
