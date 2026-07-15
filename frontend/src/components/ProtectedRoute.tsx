import { Navigate, Outlet } from 'react-router-dom'

import { useAuth } from '@/context/AuthContext'

/** Gate for admin routes: unauthenticated users are redirected to /login. */
export function ProtectedRoute() {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}
