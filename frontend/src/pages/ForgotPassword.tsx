import { Link } from 'react-router-dom'
import Logo from '../components/shared/Logo'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { ArrowLeft, ShieldCheck } from 'lucide-react'

export default function ForgotPasswordPage() {
  return (
    <div className="theme-light-surface min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md animate-slide-up">
        <div className="flex items-center gap-2 mb-8">
          <Logo size="md" />
          <span className="font-bold text-lg" style={{ color: 'var(--text)' }}>GATEPrep</span>
        </div>

        <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>Account recovery</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        </p>

        <Card
          className="border border-border/80 shadow-sm"
          style={Object.assign({ background: 'var(--bg-card)' }, { '--card-spacing': '1.5rem' })}
        >
          <CardContent>
            <div className="flex items-start gap-4">
            <div className="size-10 rounded bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
              <ShieldCheck size={18} className="text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-base" style={{ color: 'var(--text)' }}>Admin-assisted reset</h3>
              <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Contact administrator to receive a secure reset link.
              </p>
            </div>
          </div>

            <Button
              asChild
              variant="outline"
              className="w-full mt-6 gap-2 rounded-md border-border/80 bg-[var(--bg-panel)] text-[var(--text)] shadow-sm hover:bg-[var(--bg-panel)]/90"
            >
              <Link to="/login">
                <ArrowLeft size={15} /> Back to sign in
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
