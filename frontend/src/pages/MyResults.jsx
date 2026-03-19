import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/shared/Layout'
import { testAPI } from '../api/api'
import { ClipboardList, ArrowRight } from 'lucide-react'
import Spinner from '../components/shared/Spinner'

export default function MyResults() {
  const [history, setHistory] = useState([])
  const [tests, setTests]     = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([testAPI.getHistory(), testAPI.getTests()])
      .then(([h, t]) => {
        setHistory(h.data)
        setTests(Object.fromEntries(t.data.map(t => [t.id, t])))
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <Layout>
      <div className="flex justify-center py-16"><Spinner size={28} className="text-sky-500" /></div>
    </Layout>
  )

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>My Results</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {history.length} completed test{history.length !== 1 ? 's' : ''}
          </p>
        </div>

        {history.length === 0 ? (
          <div className="gate-card p-10 text-center">
            <ClipboardList size={36} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-muted)' }}>No completed tests yet</p>
            <Link to="/tests" className="text-sky-400 text-sm hover:text-sky-300 mt-2 block">
              Browse tests →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map(a => {
              const t   = tests[a.test_id]
              const pct = a.total_marks ? Math.round(a.score / a.total_marks * 100) : 0
              const color = pct >= 75 ? 'text-green-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400'
              const bg    = pct >= 75 ? 'rgba(81,207,102,0.1)' : pct >= 50 ? 'rgba(245,158,11,0.1)' : 'rgba(255,107,107,0.1)'
              return (
                <div key={a.id} className="gate-card p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                       style={{ background: bg }}>
                    <span className={`font-bold text-sm ${color}`}>{pct}%</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate" style={{ color: 'var(--text)' }}>
                      {t?.title || `Test #${a.test_id}`}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Score: {a.score?.toFixed(1)} / {a.total_marks} ·{' '}
                      {new Date(a.submitted_at).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <Link to={`/results/${a.id}`}
                    className="btn-ghost text-sm py-2 px-3 flex items-center gap-1.5 flex-shrink-0">
                    View <ArrowRight size={13} />
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
