import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import Clock from 'lucide-react/dist/esm/icons/clock'
import LogOut from 'lucide-react/dist/esm/icons/log-out'

export default function PendingPage() {
  const { user, logout } = useAuth()
  return (
    <div className="theme-light-surface min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <Card
        className="w-full max-w-md animate-slide-up border border-border/80 shadow-sm text-center"
        style={{ background: 'var(--bg-card)', '--card-spacing': '1.5rem' }}
      >
        <CardContent>
          <div className="flex flex-col items-center">
            <div className="size-16 rounded-2xl bg-[var(--warning-text)]/10 border border-[var(--warning-text)]/20 flex items-center justify-center mb-6">
              <Clock size={28} className="text-warning-text" />
            </div>
            <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--text)' }}>Awaiting Approval</h2>
            <p className="leading-relaxed mb-2" style={{ color: 'var(--text-muted)' }}>
              Hey <span style={{ color: 'var(--text)' }}>{user?.full_name}</span>, your account is pending admin approval.
            </p>
            <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
              Once approved as an aspirant, you'll be able to access all tests.
            </p>
            <Button onClick={logout} variant="outline" className="gap-2 rounded-md bg-[var(--bg-panel)] text-[var(--text)] shadow-sm hover:bg-[var(--bg-panel)]/90">
              <LogOut size={16} /> Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
