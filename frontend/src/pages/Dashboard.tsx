import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/shared/Layout'
import { useAuth } from '../context/AuthContext'
import useSWR from 'swr'
import { fetcher } from '../api/api'
import type { HistoryItem, TestCatalogItem } from '../types/api'
import { BookOpen, Clock, Target, ArrowRight, CheckCircle } from 'lucide-react'
import clsx from 'clsx'
import { SkeletonBlock, TestCardSkeleton } from '../components/shared/Skeletons'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BADGE_COLORS } from '@/utils/badgeStyles'

export function getAttemptMap<T extends Pick<HistoryItem, 'test_id'> = HistoryItem>(
  history: T[] = []
): Partial<Record<number, T>> {
  return Object.fromEntries(history.map((item) => [item.test_id, item]))
}

export function getCompletedCount(history: Pick<HistoryItem, 'test_id' | 'status'>[] = []): number {
  const submitted = history.filter((item) => item.status === 'submitted')
  return new Set(submitted.map((item) => item.test_id)).size
}

export function getAttemptPercentage(
  attempt: Pick<HistoryItem, 'score' | 'total_marks'> | null | undefined
): number | null {
  if (!attempt || !attempt.total_marks || Number(attempt.total_marks) <= 0) {
    return null
  }

  return Math.round((Number(attempt.score ?? 0) / Number(attempt.total_marks)) * 100)
}

export function getScoreToneClass(percentage: number): string {
  if (percentage >= 75) {
    return 'bg-[var(--success-text)]/10 border-[var(--success-text)]/20 text-success-text dark:text-success-text'
  }

  if (percentage >= 50) {
    return 'bg-[var(--warning-text)]/10 border-[var(--warning-text)]/20 text-warning-text dark:text-warning-text'
  }

  return 'bg-[var(--destructive)]/10 border-[var(--destructive)]/20 text-destructive dark:text-destructive'
}

export interface DashboardStatsProps {
  tests: TestCatalogItem[]
  completedCount: number
  testsLoading: boolean
  historyLoading: boolean
}

function DashboardStats({ tests, completedCount, testsLoading, historyLoading }: DashboardStatsProps) {
  const stats = [
    { label: 'Tests Available', value: tests.length, isLoading: testsLoading, icon: BookOpen, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Completed', value: completedCount, isLoading: historyLoading, icon: CheckCircle, color: 'text-success-text', bg: 'bg-[var(--success-text)]/10' },
  ]

  return (
    <div className="grid grid-cols-2 gap-4">
      {stats.map(({ label, value, isLoading, icon: Icon, color, bg }) => (
        <Card key={label} className="border-border">
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className={`w-8 h-8 shrink-0 rounded-lg ${bg} flex items-center justify-center`}>
              <Icon size={16} className={color} />
            </div>
            <div className="min-w-0">
              {isLoading ? (
                <SkeletonBlock className="h-5 w-12" />
              ) : (
                <p className="text-xl font-bold text-foreground leading-none">{value}</p>
              )}
              <p className="text-muted-foreground text-xs mt-1 truncate">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export interface DashboardTestCardProps {
  testItem: TestCatalogItem
  attempt: HistoryItem | undefined
  done: boolean
  percentage: number | null
}

function DashboardTestCard({ testItem, attempt, done, percentage }: DashboardTestCardProps) {
  const resultTone = percentage !== null ? getScoreToneClass(percentage) : ''

  return (
    <Card key={testItem.id} data-testid="test-card" className="flex flex-col hover:border-primary/50 transition-colors border-border">
      <CardHeader className="p-3 pb-1.5">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm leading-snug">{testItem.title}</CardTitle>
          {done && <Badge variant="outline" className={`${BADGE_COLORS.green} flex-shrink-0`}>Done</Badge>}
        </div>
        {testItem.description && <CardDescription className="text-xs line-clamp-2">{testItem.description}</CardDescription>}
      </CardHeader>
      <CardContent className="p-3 pt-0 flex-1 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><Clock size={12} />{testItem.duration_minutes} min</span>
          <span className="flex items-center gap-1.5"><BookOpen size={12} />{testItem.question_count} questions</span>
          <span className="flex items-center gap-1.5"><Target size={12} />{testItem.total_marks} marks</span>
        </div>
        {percentage !== null && (
          <div className={clsx('px-2.5 py-1.5 rounded-md border text-xs', resultTone)}>
            Score: {
              // @ts-expect-error TODO(null-safety): percentage implies a present attempt; without one, score access would throw.
              attempt.score?.toFixed(1)
            } / {
              // @ts-expect-error TODO(null-safety): percentage implies a present attempt with truthy total_marks; otherwise access would throw.
              attempt.total_marks
            } ({percentage}%)
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t-0 bg-transparent p-3 pt-1">
        {done ? (
          <Button asChild variant="outline" className="w-full border-primary/30 text-primary hover:bg-primary/10">
            {
              // @ts-expect-error TODO(null-safety): done implies attempt exists; if that correlation breaks, reading id would throw.
              <Link to={`/results/${attempt.id}`}>
                View Result <ArrowRight size={16} className="ml-2" />
              </Link>
            }
          </Button>
        ) : (
          <Button asChild className="w-full">
            <Link to={`/tests/${testItem.id}`}>
              Start Test <ArrowRight size={16} className="ml-2" />
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

export interface DashboardTestsProps {
  tests: TestCatalogItem[]
  attemptMap: Partial<Record<number, HistoryItem>>
  isInitialDataLoading: boolean
}

function DashboardTests({ tests, attemptMap, isInitialDataLoading }: DashboardTestsProps) {
  const recentTests = tests.slice(0, 9)

  if (isInitialDataLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5" aria-label="Loading available tests">
        <TestCardSkeleton />
        <TestCardSkeleton />
        <TestCardSkeleton />
      </div>
    )
  }

  if (tests.length === 0) {
    return (
      <Card className="border-border">
        <CardContent className="p-10 text-center flex flex-col items-center">
          <BookOpen size={36} className="text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No tests available yet. Check back later.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
      {recentTests.map((testItem) => {
        const attempt = attemptMap[testItem.id]
        const done = attempt?.status === 'submitted'
        const percentage = done ? getAttemptPercentage(attempt) : null

        return (
          <DashboardTestCard
            key={testItem.id}
            testItem={testItem}
            attempt={attempt}
            done={done}
            percentage={percentage}
          />
        )
      })}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()

  const { data: tests = [], isLoading: testsLoading } = useSWR<TestCatalogItem[]>('/tests', fetcher)
  const { data: history = [], isLoading: historyLoading } = useSWR<HistoryItem[]>('/tests/my/history', fetcher)
  const isInitialDataLoading = testsLoading || historyLoading

  const attemptMap = useMemo(() => getAttemptMap(history), [history])
  const completedCount = useMemo(() => getCompletedCount(history), [history])

  return (
    <Layout>
      <div className="flex flex-col gap-8 animate-fade-in">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Hello, {user?.full_name?.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground mt-1">Ready to practice? Pick a test below.</p>
        </div>

        <DashboardStats
          tests={tests}
          completedCount={completedCount}
          testsLoading={testsLoading}
          historyLoading={historyLoading}
        />

        <div>
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-semibold text-foreground">Recent Tests</h2>
            {tests.length > 9 && (
              <Link to="/tests" className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline">
                View all tests <ArrowRight size={14} />
              </Link>
            )}
          </div>
          <DashboardTests tests={tests} attemptMap={attemptMap} isInitialDataLoading={isInitialDataLoading} />
        </div>
      </div>
    </Layout>
  )
}
