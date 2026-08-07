import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/shared/Layout'
import { useAuth } from '../context/AuthContext'
import useSWR from 'swr'
import { fetcher } from '../api/api'
import BookOpen from 'lucide-react/dist/esm/icons/book-open'
import Clock from 'lucide-react/dist/esm/icons/clock'
import Target from 'lucide-react/dist/esm/icons/target'
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right'
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle'
import clsx from 'clsx'
import { SkeletonBlock, TestCardSkeleton } from '../components/shared/Skeletons'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BADGE_COLORS } from '@/utils/badgeStyles'

export default function Dashboard() {
  const { user } = useAuth()
  
  const { data: tests = [], isLoading: testsLoading } = useSWR('/tests', fetcher)
  const { data: history = [], isLoading: historyLoading } = useSWR('/tests/my/history', fetcher)
  const isInitialDataLoading = testsLoading || historyLoading

  const { submitted, completedCount, attemptMap } = useMemo(() => {
    const submitted = history.filter(h => h.status === 'submitted')
    const completedCount = new Set(submitted.map(h => h.test_id)).size
    const attemptMap = Object.fromEntries(history.map(h => [h.test_id, h]))
    return { submitted, completedCount, attemptMap }
  }, [history])

  return (
    <Layout>
      <div className="flex flex-col gap-8 animate-fade-in">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Hello, {user?.full_name?.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground mt-1">Ready to practice? Pick a test below.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Tests Available', value: tests.length, isLoading: testsLoading, icon: BookOpen, color: 'text-primary', bg: 'bg-primary/10' },
            { label: 'Completed', value: completedCount, isLoading: historyLoading, icon: CheckCircle, color: 'text-success-text', bg: 'bg-[var(--success-text)]/10' },
          ].map(({ label, value, isLoading, icon: Icon, color, bg }) => (
            <Card key={label} className="flex flex-col border-border">
              <CardContent className="p-5 flex flex-col gap-2">
                <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
                  <Icon size={18} className={color} />
                </div>
                {isLoading ? (
                  <SkeletonBlock className="mt-1 h-8 w-14" />
                ) : (
                  <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
                )}
                <p className="text-muted-foreground text-sm">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tests */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Available Tests</h2>
          {isInitialDataLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" aria-label="Loading available tests">
              <TestCardSkeleton />
              <TestCardSkeleton />
              <TestCardSkeleton />
            </div>
          ) : tests.length === 0 ? (
            <Card className="border-border">
              <CardContent className="p-10 text-center flex flex-col items-center">
                <BookOpen size={36} className="text-muted-foreground mb-3"/>
                <p className="text-muted-foreground">No tests available yet. Check back later.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tests.map(t => {
                const attempt = attemptMap[t.id]
                const done = attempt?.status === 'submitted'
                const pct = done && attempt?.total_marks ? Math.round(attempt.score / attempt.total_marks * 100) : null
                return (
                  <Card key={t.id} data-testid="test-card" className="flex flex-col hover:border-primary/50 transition-colors border-border">
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base leading-snug">{t.title}</CardTitle>
                        {done && <Badge variant="outline" className={`${BADGE_COLORS.green} flex-shrink-0`}>Done</Badge>}
                      </div>
                      {t.description && <CardDescription className="line-clamp-2">{t.description}</CardDescription>}
                    </CardHeader>
                    <CardContent className="p-5 pt-0 flex-1 flex flex-col gap-3">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5"><Clock size={12}/>{t.duration_minutes} min</span>
                        <span className="flex items-center gap-1.5"><BookOpen size={12}/>{t.question_count} questions</span>
                        <span className="flex items-center gap-1.5"><Target size={12}/>{t.total_marks} marks</span>
                      </div>
                      {pct !== null && (
                        <div className={clsx('px-3 py-2 rounded-lg border text-xs',
                          pct >= 75 ? 'bg-[var(--success-text)]/10 border-[var(--success-text)]/20 text-success-text dark:text-success-text' :
                          pct >= 50 ? 'bg-[var(--warning-text)]/10 border-[var(--warning-text)]/20 text-warning-text dark:text-warning-text' : 'bg-[var(--destructive)]/10 border-[var(--destructive)]/20 text-destructive dark:text-destructive'
                        )}>
                          Score: {attempt.score?.toFixed(1)} / {attempt.total_marks} ({pct}%)
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="p-5 pt-0">
                      {done ? (
                        <Button asChild variant="outline" className="w-full border-primary/30 text-primary hover:bg-primary/10">
                          <Link to={`/results/${attempt.id}`}>
                            View Result <ArrowRight size={16} className="ml-2"/>
                          </Link>
                        </Button>
                      ) : (
                        <Button asChild className="w-full">
                          <Link to={`/tests/${t.id}`}>
                            Start Test <ArrowRight size={16} className="ml-2"/>
                          </Link>
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
