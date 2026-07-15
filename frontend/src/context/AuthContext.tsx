import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'

import { api, setAuthToken } from '@/lib/api'
import type { ApiEnvelope, LoginResponse, User } from '@/types'

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  // Token + user live in React state (in memory only). On refresh the user is
  // logged out by design — no token is persisted to storage.
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)

  const login = useCallback(async (email: string, password: string) => {
    const resp = await api.post<ApiEnvelope<LoginResponse>>('/api/auth/login', {
      email,
      password,
    })
    const { access_token, user: loggedInUser } = resp.data.data
    setAuthToken(access_token) // mirror into the Axios interceptor
    setToken(access_token)
    setUser(loggedInUser)
  }, [])

  const logout = useCallback(() => {
    setAuthToken(null)
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{ token, user, isAuthenticated: token !== null, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
