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
import UserPlus from 'lucide-react/dist/esm/icons/user-plus'

export default function RegisterPage() {
  const { saveUser } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', full_name: '', password: '', confirm: '' })
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  const handle = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return }
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      const res = await authAPI.register({
        email: form.email,
        full_name: form.full_name,
        password: form.password
      })
      const user = saveUser(res.data)
      toast.success('Account created!')
      if (user.role === 'admin') navigate('/admin', { replace: true })
      else navigate('/pending', { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="theme-light-surface min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md animate-slide-up">
        <div className="flex items-center gap-2 mb-8">
          <div className="size-8 rounded bg-primary flex items-center justify-center">
            <span className="font-bold text-text-base">G</span>
          </div>
          <span className="font-bold text-lg" style={{ color: 'var(--text)' }}>GATEPrep</span>
        </div>

        <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>Create Account</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Fill in your details to get started</p>

        <Card
          className="border border-border/80 shadow-sm"
          style={{ background: 'var(--bg-card)', '--card-spacing': '1.5rem' }}
        >
          <CardContent>
            <form onSubmit={submit} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <Label htmlFor="full_name" style={{ color: 'var(--text-muted)' }}>Full Name</Label>
                <Input
                  id="full_name"
                  type="text"
                  required
                  value={form.full_name}
                  onChange={handle('full_name')}
                  placeholder="Rahul Sharma"
                  autoFocus
                  className="h-11 rounded-md bg-[var(--bg-card)] px-4 text-sm shadow-sm"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="email" style={{ color: 'var(--text-muted)' }}>Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={handle('email')}
                  placeholder="you@example.com"
                  className="h-11 rounded-md bg-[var(--bg-card)] px-4 text-sm shadow-sm"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="password" style={{ color: 'var(--text-muted)' }}>Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={show ? 'text' : 'password'}
                    required
                    value={form.password}
                    onChange={handle('password')}
                    placeholder="Min. 8 characters"
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

              <div className="flex flex-col gap-2">
                <Label htmlFor="confirm" style={{ color: 'var(--text-muted)' }}>Confirm Password</Label>
                <Input
                  id="confirm"
                  type="password"
                  required
                  value={form.confirm}
                  onChange={handle('confirm')}
                  placeholder="Re-enter password"
                  className="h-11 rounded-md bg-[var(--bg-card)] px-4 text-sm shadow-sm"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="mt-4 h-11 w-full rounded-md px-5 gap-2 shadow-sm"
              >
                {loading ? <Spinner size={18} /> : <UserPlus size={18} />}
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:text-primary font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
