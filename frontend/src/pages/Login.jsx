import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../api/api'
import toast from 'react-hot-toast'
import Spinner from '../components/shared/Spinner'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import Eye from 'lucide-react/dist/esm/icons/eye'
import EyeOff from 'lucide-react/dist/esm/icons/eye-off'
import LogIn from 'lucide-react/dist/esm/icons/log-in'
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2'
import ListChecks from 'lucide-react/dist/esm/icons/list-checks'
import Hash from 'lucide-react/dist/esm/icons/hash'

export default function LoginPage() {
  const { saveUser } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  const handle = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await authAPI.login({ email: form.email, password: form.password })
      const user = saveUser(res.data)
      toast.success(`Welcome back, ${user.full_name.split(' ')[0]}!`)
      if (user.role === 'admin') navigate('/admin', { replace: true })
      else if (user.role === 'aspirant' || user.role === 'user') navigate('/dashboard', { replace: true })
      else navigate('/pending', { replace: true })
    } catch (err) {
      const errMsg = err.response 
        ? (err.response.data?.detail || 'Invalid email or password')
        : 'Network Error: Could not connect to the server.'
      toast.error(errMsg)
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-between w-5/12 p-12"
           style={{ background: 'var(--header-bg)', borderRight: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="size-9 rounded bg-primary flex items-center justify-center">
            <span className="font-bold text-text-base text-lg">G</span>
          </div>
          <span className="font-bold text-text-base text-xl">GATEPrep</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold text-text-base leading-tight mb-4">
            Crack GATE with<br />
            <span className="text-primary">precision practice.</span>
          </h1>
          <p className="text-text-muted dark:text-text-muted leading-relaxed">
            MCQ · MSQ · NAT · GATE-accurate scoring<br />
            Timed tests · Leaderboards · Analytics
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            ['MCQ', 'Single correct', <CheckCircle2 size={16} />],
            ['MSQ', 'Multi-select', <ListChecks size={16} />],
            ['NAT', 'Numerical', <Hash size={16} />]
          ].map(([t, d, icon]) => (
            <div key={t} className="p-4 rounded-lg border border-[var(--border)] bg-bg hover:bg-bg-secondary dark:bg-bg-secondary flex flex-col items-start transition-colors shadow-sm hover:shadow">
              <div className="text-primary mb-2">{icon}</div>
              <p className="font-bold text-primary">{t}</p>
              <p className="text-text-muted text-xs mt-0.5">{d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="theme-light-surface flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-slide-up">
          <div className="lg:hidden mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="size-8 rounded bg-primary flex items-center justify-center">
                <span className="font-bold text-text-base">G</span>
              </div>
              <span className="font-bold text-lg" style={{ color: 'var(--text)' }}>GATEPrep</span>
            </div>
            <h1 className="text-2xl font-bold leading-tight" style={{ color: 'var(--text)' }}>
              Crack GATE with <span className="text-primary">precision practice.</span>
            </h1>
          </div>

          <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>Sign in</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Enter your credentials to continue</p>

          <Card
            className="border border-border/80 shadow-sm"
            style={{ background: 'var(--bg-card)', '--card-spacing': '1.5rem' }}
          >
            <CardContent>
              <form onSubmit={submit} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email" style={{ color: 'var(--text-muted)' }}>Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={handle('email')}
                    placeholder="you@example.com"
                    autoFocus
                    className="h-11 rounded-md bg-[var(--bg-card)] px-4 text-sm shadow-sm"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="password" style={{ color: 'var(--text-muted)' }}>Password</Label>
                    <Link to="/forgot-password" className="text-xs text-primary hover:text-primary font-medium">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={show ? 'text' : 'password'}
                      required
                      value={form.password}
                      onChange={handle('password')}
                      placeholder="••••••••"
                      className="h-11 rounded-md bg-[var(--bg-card)] px-4 pr-11 text-sm shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShow(s => !s)}
                      aria-label="Toggle password visibility"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary"
                    >
                      {show ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="mt-4 h-11 w-full rounded-md px-5 gap-2 shadow-sm"
                >
                  {loading ? <Spinner size={18} /> : <LogIn size={18} />}
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
            Don't have an account?{' '}
            <Link to="/register" className="text-primary hover:text-primary font-medium">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
