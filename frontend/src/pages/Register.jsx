import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../api/api'
import toast from 'react-hot-toast'
import Spinner from '../components/shared/Spinner'
import { Eye, EyeOff, Mail, KeyRound, CheckCircle } from 'lucide-react'

export default function RegisterPage() {
  const { saveUser } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1=form, 2=otp
  const [form, setForm] = useState({ email: '', full_name: '', password: '', confirm: '' })
  const [otp, setOtp] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  const handle = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const sendOTP = async e => {
    e.preventDefault()
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      await authAPI.registerSendOTP({
        email: form.email,
        full_name: form.full_name,
        password: form.password
      })
      toast.success('OTP sent! Check your email.')
      setStep(2)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    } finally { setLoading(false) }
  }

  const verifyOTP = async e => {
    e.preventDefault()
    if (otp.length !== 6) { toast.error('Enter the 6-digit OTP'); return }
    setLoading(true)
    try {
      const res = await authAPI.registerVerify({ email: form.email, otp })
      const user = saveUser(res.data)
      toast.success('Account created! Welcome to GATEPrep.')
      if (user.role === 'admin') navigate('/admin', { replace: true })
      else navigate('/pending', { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid OTP')
    } finally { setLoading(false) }
  }

  const resend = async () => {
    setResending(true)
    try {
      await authAPI.registerResendOTP(form.email)
      toast.success('New OTP sent!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Please wait before resending')
    } finally { setResending(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded bg-sky-600 flex items-center justify-center">
            <span className="font-bold text-white">G</span>
          </div>
          <span className="font-bold text-white text-lg">GATEPrep</span>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          <div className={`flex items-center gap-1.5 text-xs font-medium ${step >= 1 ? 'text-sky-400' : 'text-slate-500'}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs
              ${step > 1 ? 'bg-green-500 text-white' : step === 1 ? 'bg-sky-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
              {step > 1 ? <CheckCircle size={12} /> : '1'}
            </div>
            Account Details
          </div>
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          <div className={`flex items-center gap-1.5 text-xs font-medium ${step >= 2 ? 'text-sky-400' : 'text-slate-500'}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs
              ${step === 2 ? 'bg-sky-600 text-white' : 'bg-slate-700 text-slate-400'}`}>2</div>
            Verify Email
          </div>
        </div>

        <div className="gate-card p-6">
          {step === 1 ? (
            <>
              <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text)' }}>Create Account</h2>
              <form onSubmit={sendOTP} className="space-y-4">
                <div>
                  <label className="label">Full Name</label>
                  <input type="text" required value={form.full_name} onChange={handle('full_name')}
                    placeholder="Rahul Sharma" className="input" autoFocus />
                </div>
                <div>
                  <label className="label">Email Address</label>
                  <input type="email" required value={form.email} onChange={handle('email')}
                    placeholder="you@example.com" className="input" />
                </div>
                <div>
                  <label className="label">Password</label>
                  <div className="relative">
                    <input type={show ? 'text' : 'password'} required value={form.password}
                      onChange={handle('password')} placeholder="Min. 6 characters" className="input pr-10" />
                    <button type="button" onClick={() => setShow(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                      {show ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label">Confirm Password</label>
                  <input type="password" required value={form.confirm} onChange={handle('confirm')}
                    placeholder="Re-enter password" className="input" />
                </div>
                <button type="submit" disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
                  {loading ? <Spinner size={15} /> : <Mail size={15} />}
                  {loading ? 'Sending OTP...' : 'Send Verification OTP'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>Verify Your Email</h2>
              <div className="p-3 rounded mb-4 text-sm" style={{ background: 'var(--bg-panel)', color: 'var(--text-muted)' }}>
                We sent a 6-digit OTP to <span className="text-sky-400 font-medium">{form.email}</span>
              </div>
              <form onSubmit={verifyOTP} className="space-y-4">
                <div>
                  <label className="label">Enter OTP</label>
                  <input
                    type="text" maxLength={6} required autoFocus
                    value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="input text-center text-3xl font-mono tracking-[0.5em] h-14"
                  />
                </div>
                <button type="submit" disabled={loading || otp.length !== 6}
                  className="btn-primary w-full flex items-center justify-center gap-2">
                  {loading ? <Spinner size={15} /> : <KeyRound size={15} />}
                  {loading ? 'Verifying...' : 'Verify & Create Account'}
                </button>
                <div className="flex items-center justify-between text-sm">
                  <button type="button" onClick={() => { setStep(1); setOtp('') }}
                    className="hover:text-sky-400 transition-colors" style={{ color: 'var(--text-muted)' }}>
                    ← Change email
                  </button>
                  <button type="button" onClick={resend} disabled={resending}
                    className="text-sky-400 hover:text-sky-300 transition-colors">
                    {resending ? 'Resending...' : 'Resend OTP'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        <p className="text-center mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" className="text-sky-400 hover:text-sky-300 font-medium">Sign in</Link>
        </p>

        {/* Note for admin */}
        <div className="mt-4 p-3 rounded text-xs border border-dashed border-slate-700"
             style={{ color: 'var(--text-muted)' }}>
          💡 No SMTP configured? OTP prints in the backend terminal for testing.
        </div>
      </div>
    </div>
  )
}
