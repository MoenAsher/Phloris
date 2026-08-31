import axios from 'axios'

// Same-origin base URL (empty string → requests go to the current origin).
// In dev the browser talks only to the Vite server (localhost:5173) and Vite
// proxies /api, /track, and /report to the Flask backend (see vite.config.ts).
// This keeps every request same-origin, so there is no cross-origin CORS
// preflight and none of the browser local-/private-network gating (Chrome's
// Private Network Access, Safari's local-network prompt) that blocks a page on
// localhost from calling 127.0.0.1 directly. In production Flask serves the
// built bundle and the API from the same origin, so relative URLs work there
// unchanged.
const BASE_URL = ''

// The JWT is held ONLY in memory (module scope), never in localStorage or
// sessionStorage, per the project security convention. AuthContext keeps the
// canonical copy in React state and mirrors it here via setAuthToken so the
// Axios request interceptor can attach it without importing React.
let authToken: string | null = null

export function setAuthToken(token: string | null) {
  authToken = token
}

// Called when an authenticated request is rejected with 401 (e.g. the access
// token has expired or been tampered with). AuthContext registers a handler
// that clears the session so the router falls back to the Login screen.
let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn
}

export const api = axios.create({ baseURL: BASE_URL })

// Attach the bearer token to every outgoing request when authenticated.
api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`
  }
  return config
})

// Treat a 401 on an authenticated admin call as session expiry: clear the
// session so protected routes redirect to Login. The login/register attempts
// legitimately return 401 (bad credentials) and must NOT trigger this, so we
// only react when a token is currently held and the call is not an auth call.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const url: string = error.config?.url ?? ''
    const isAuthCall = url.includes('/api/auth/login') || url.includes('/api/auth/register')
    if (status === 401 && authToken && !isAuthCall) {
      onUnauthorized?.()
    }
    return Promise.reject(error)
  },
)
