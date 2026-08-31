import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { ShieldAlert } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function emailError(email: string, touched: boolean): string | null {
  if (!touched) return null
  if (!email) return 'Email is required'
  if (!EMAIL_RE.test(email)) return 'Enter a valid email address'
  return null
}

function passwordError(password: string, touched: boolean): string | null {
  if (!touched) return null
  if (!password) return 'Password is required'
  return null
}

export function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [touched, setTouched] = useState({ email: false, password: false })
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const emailErr = emailError(email, touched.email)
  const passwordErr = passwordError(password, touched.password)

  function touch(field: 'email' | 'password') {
    setTouched((t) => ({ ...t, [field]: true }))
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setTouched({ email: true, password: true })
    if (!email || !EMAIL_RE.test(email) || !password) return
    setServerError(null)
    setLoading(true)
    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.error) {
        setServerError(String(err.response.data.error))
      } else if (isAxiosError(err) && err.request) {
        setServerError('Cannot reach the backend. Is it running on port 5001?')
      } else {
        setServerError('Login failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <div className="mb-2 flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold tracking-tight">Phloris</span>
          </div>
          <CardTitle>Admin sign in</CardTitle>
          <CardDescription>
            Access the phishing simulation dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="admin@simulation.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => touch('email')}
                aria-invalid={!!emailErr}
              />
              {emailErr ? (
                <p className="text-xs font-medium text-destructive">{emailErr}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => touch('password')}
                aria-invalid={!!passwordErr}
              />
              {passwordErr ? (
                <p className="text-xs font-medium text-destructive">{passwordErr}</p>
              ) : null}
            </div>
            {serverError ? (
              <p className="text-sm font-medium text-destructive">{serverError}</p>
            ) : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
