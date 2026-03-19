import { useAuth } from '../context/AuthContext'
import { Clock, LogOut } from 'lucide-react'

export default function PendingPage() {
  const { user, logout } = useAuth()
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="text-center max-w-md animate-slide-up">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-6">
          <Clock size={28} className="text-amber-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Awaiting Approval</h2>
        <p className="text-slate-400 leading-relaxed mb-2">
          Hey <span className="text-slate-200">{user?.full_name}</span>, your account is pending admin approval.
        </p>
        <p className="text-slate-500 text-sm mb-8">
          Once approved as an aspirant, you'll be able to access all tests and study materials.
        </p>
        <button onClick={logout} className="btn-ghost flex items-center gap-2 mx-auto">
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </div>
  )
}
