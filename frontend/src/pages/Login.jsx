import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../api/api'
import toast from 'react-hot-toast'
import Spinner from '../components/shared/Spinner'
import { Eye, EyeOff, LogIn } from 'lucide-react'

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
      else if (user.role === 'aspirant') navigate('/dashboard', { replace: true })
      else navigate('/pending', { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid email or password')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-between w-5/12 p-12"
           style={{ background: 'var(--header-bg)', borderRight: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-sky-600 flex items-center justify-center">
            <span className="font-bold text-white text-lg">G</span>
          </div>
          <span className="font-bold text-white text-xl">GATEPrep</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Crack GATE with<br />
            <span className="text-sky-400">precision practice.</span>
          </h1>
          <p className="text-slate-400 leading-relaxed">
            MCQ · MSQ · NAT · GATE-accurate scoring<br />
            Timed tests · Leaderboards · Analytics
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[['MCQ', 'Single correct'], ['MSQ', 'Multi-select'], ['NAT', 'Numerical']].map(([t, d]) => (
            <div key={t} className="p-3 rounded border border-slate-700 bg-slate-800/40">
              <p className="font-bold text-sky-400">{t}</p>
              <p className="text-slate-500 text-xs mt-0.5">{d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-slide-up">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded bg-sky-600 flex items-center justify-center">
              <span className="font-bold text-white">G</span>
            </div>
            <span className="font-bold text-white text-lg">GATEPrep</span>
          </div>

          <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>Sign in</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Enter your credentials to continue</p>

          <div className="gate-card p-6">
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="label">Email address</label>
                <input type="email" required value={form.email} onChange={handle('email')}
                  placeholder="you@example.com" className="input" autoFocus />
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input type={show ? 'text' : 'password'} required value={form.password}
                    onChange={handle('password')} placeholder="••••••••" className="input pr-10" />
                  <button type="button" onClick={() => setShow(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--text-muted)' }}>
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
                {loading ? <Spinner size={15} /> : <LogIn size={15} />}
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>

          <p className="text-center mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
            Don't have an account?{' '}
            <Link to="/register" className="text-sky-400 hover:text-sky-300 font-medium">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
