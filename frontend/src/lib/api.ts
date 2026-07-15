import axios from 'axios'

// The Flask backend. Port 5001 (5000 is taken by macOS AirPlay Receiver).
// Use 127.0.0.1 (not "localhost") on purpose: the Flask dev server binds IPv4
// only, but macOS resolves "localhost" to IPv6 (::1) first, which would be
// refused. 127.0.0.1 forces IPv4 so the browser always reaches the backend.
const BASE_URL = 'http://127.0.0.1:5001'

// The JWT is held ONLY in memory (module scope), never in localStorage or
// sessionStorage, per the project security convention. AuthContext keeps the
// canonical copy in React state and mirrors it here via setAuthToken so the
// Axios request interceptor can attach it without importing React.
let authToken: string | null = null

export function setAuthToken(token: string | null) {
  authToken = token
}

export const api = axios.create({ baseURL: BASE_URL })

// Attach the bearer token to every outgoing request when authenticated.
api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`
  }
  return config
})
