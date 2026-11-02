import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, Eye, EyeOff, KeyRound } from 'lucide-react'
import { authAPI } from '../api/api'
import { getApiErrorDetail } from '../lib/apiError'
import Spinner from '../components/shared/Spinner'
import Logo from '../components/shared/Logo'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''
  const [form, setForm] = useState<{ password: string; confirm: string }>({ password: '', confirm: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  const handle = (key: 'password' | 'confirm') => (event: ChangeEvent<HTMLInputElement>): void =>
    setForm(formState => ({ ...formState, [key]: event.target.value }))

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (!token) { toast.error('Invalid reset link'); return }
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return }
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return }

    setLoading(true)
    try {
      await authAPI.resetPassword({ token, password: form.password })
      toast.success('Password updated. Sign in again.')
      navigate('/login', { replace: true })
    } catch (err: unknown) {
      toast.error(getApiErrorDetail(err) || 'Password reset failed')
    } finally {
      setLoading(false)
    }

  }

  return (
    <div className="theme-light-surface min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md animate-slide-up">
        <div className="flex items-center gap-2 mb-8">
          <Logo size="md" />
          <span className="font-bold text-lg" style={{ color: 'var(--text)' }}>GATEPrep</span>
        </div>

        <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>Reset password</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Choose a new password for your account</p>

        <Card
          className="border border-border/80 shadow-sm"
          style={Object.assign({ background: 'var(--bg-card)' }, { '--card-spacing': '1.5rem' })}
        >
          <CardContent>
          {!token ? (
            <div className="text-center">
              <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>This reset link is invalid.</p>
              <Button
                asChild
                variant="outline"
                className="w-full gap-2 rounded-md border-border/80 bg-[var(--bg-panel)] text-[var(--text)] shadow-sm hover:bg-[var(--bg-panel)]/90"
              >
                <Link to="/login">
                  <ArrowLeft size={15} /> Back to sign in
                </Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="password" style={{ color: 'var(--text-muted)' }}>New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={form.password}
                    onChange={handle('password')}
                    placeholder="Min. 8 characters"
                    className="h-11 rounded-md bg-[var(--bg-card)] px-4 pr-11 text-sm shadow-sm"
                    autoComplete="new-password"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    aria-label="Toggle new password visibility"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="confirm" style={{ color: 'var(--text-muted)' }}>Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirm"
                    type={showConfirm ? 'text' : 'password'}
                    required
                    value={form.confirm}
                    onChange={handle('confirm')}
                    placeholder="Re-enter password"
                    className="h-11 rounded-md bg-[var(--bg-card)] px-4 pr-11 text-sm shadow-sm"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(s => !s)}
                    aria-label="Toggle confirm password visibility"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="mt-2 h-11 w-full gap-2 rounded-md px-5 shadow-sm"
              >
                {loading ? <Spinner size={15} /> : <KeyRound size={15} />}
                {loading ? 'Updating password...' : 'Update Password'}
              </Button>
            </form>
          )}
          </CardContent>
        </Card>

        <p className="text-center mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
          Remember your password?{' '}
          <Link to="/login" className="text-primary hover:text-primary font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
