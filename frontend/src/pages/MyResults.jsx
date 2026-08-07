import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/shared/Layout'
import useSWR from 'swr'
import { fetcher } from '../api/api'
import ClipboardList from 'lucide-react/dist/esm/icons/clipboard-list'
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right'
import Spinner from '../components/shared/Spinner'
import { ResultCardSkeleton } from '../components/shared/Skeletons'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function MyResults() {
  const { data: historyData, isLoading: historyLoading } = useSWR('/tests/my/history', fetcher)
  const { data: testsData, isLoading: testsLoading } = useSWR('/tests', fetcher)
  
  const loading = historyLoading || testsLoading
  const history = historyData || []
  
  const tests = useMemo(() => {
    if (!testsData) return {}
    return Object.fromEntries(testsData.map(t => [t.id, t]))
  }, [testsData])

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col gap-6 animate-fade-in max-w-2xl">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>My Results</h1>
            <div className="h-4 w-24 bg-muted rounded animate-pulse mt-2" />
          </div>
          <div className="flex flex-col gap-2">
            <ResultCardSkeleton />
            <ResultCardSkeleton />
            <ResultCardSkeleton />
            <ResultCardSkeleton />
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="flex flex-col gap-6 animate-fade-in max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>My Results</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {history.length} completed test{history.length !== 1 ? 's' : ''}
          </p>
        </div>

        {history.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center">
              <ClipboardList size={36} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
              <p style={{ color: 'var(--text-muted)' }}>No completed tests yet</p>
              <Link to="/tests" className="text-primary text-sm hover:text-primary mt-2 block">
                Browse tests →
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {history.map(a => {
              const t   = tests[a.test_id]
              const pct = a.total_marks ? Math.round(a.score / a.total_marks * 100) : 0
              const color = pct >= 75 ? 'text-success-text' : pct >= 50 ? 'text-warning-text' : 'text-destructive'
              const bg    = pct >= 75 ? 'color-mix(in srgb, var(--success-text) 10%, transparent)' : pct >= 50 ? 'color-mix(in srgb, var(--warning-text) 10%, transparent)' : 'rgba(255,107,107,0.1)'
              return (
                <Card key={a.id}>
                  <CardContent className="p-4 flex items-center gap-4">
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
                    <Button asChild size="sm" variant="ghost">
                      <Link to={`/results/${a.id}`}
                        className="text-sm flex items-center gap-1.5 flex-shrink-0">
                        View <ArrowRight size={13} />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
