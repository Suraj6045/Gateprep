import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/shared/Layout'
import useSWR from 'swr'
import { fetcher } from '../api/api'
import type { HistoryItem, TestCatalogItem } from '../types/api'
import { SUBJECTS, SERIES_LABELS, TYPE_LABELS } from '../utils/constants'
import { useTestNavigation } from '../hooks/useTestNavigation'
import type { NavigationStep, NavigationType } from '../hooks/useTestNavigation'
import { Clock, BookOpen, Target, ArrowRight, ChevronRight, CheckCircle } from 'lucide-react'
import clsx from 'clsx'
import { TestCardSkeleton } from '../components/shared/Skeletons'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

function scoreBadgeClass(pct: number): string {
  if (pct >= 75) return 'bg-[var(--success-text)]/10 text-success-text dark:text-success-text'
  if (pct >= 50) return 'bg-[var(--warning-text)]/10 text-warning-text dark:text-warning-text'
  return 'bg-[var(--destructive)]/10 text-destructive dark:text-destructive'
}

export interface TestCardFooterProps {
  done: boolean
  attempt: HistoryItem | undefined
  test: TestCatalogItem
}

function TestCardFooter({ done, attempt, test }: TestCardFooterProps) {
  return (
    <CardFooter className="border-t-0 bg-transparent p-4 pt-0">
      {done ? (
        <Button asChild className="w-full h-8 text-xs">
          {
            // @ts-expect-error TODO(null-safety): done implies attempt exists; if that correlation breaks, reading id would throw.
            <Link to={`/results/${attempt.id}`}>
              View Result <ArrowRight size={12} className="ml-1.5" />
            </Link>
          }
        </Button>
      ) : (
        <Button asChild className="w-full h-8 text-xs">
          <Link to={`/tests/${test.id}`}>
            Start Test <ArrowRight size={12} className="ml-1.5" />
          </Link>
        </Button>
      )}
    </CardFooter>
  )
}

export interface TestCardProps {
  test: TestCatalogItem
  attempt: HistoryItem | undefined
}

function TestCard({ test, attempt }: TestCardProps) {
  const done = attempt?.status === 'submitted'
  const pct = done && attempt?.total_marks
    // @ts-expect-error TODO(null-safety): score may be null before submit; Math.round(null / total_marks * 100) is 0.
    ? Math.round(attempt.score / attempt.total_marks * 100) : null

  return (
    <Card className="flex flex-col hover:border-primary/50 transition-colors border-border">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="font-medium text-sm leading-snug">{test.title}</CardTitle>
          {done && <CheckCircle size={15} className="text-success-text flex-shrink-0 mt-0.5" />}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-1 flex flex-col gap-3">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock size={11} />{test.duration_minutes}m</span>
          <span className="flex items-center gap-1"><BookOpen size={11} />{test.question_count} Qs</span>
          <span className="flex items-center gap-1"><Target size={11} />{test.total_marks}M</span>
        </div>
        {pct !== null && (
          <div className={clsx('text-xs px-2.5 py-1.5 rounded', scoreBadgeClass(pct))}>
            Score: {
              // @ts-expect-error TODO(null-safety): pct implies a present attempt; without one, score access would throw.
              attempt.score?.toFixed(1)
            }/{
              // @ts-expect-error TODO(null-safety): pct implies a present attempt with truthy total_marks; otherwise access would throw.
              attempt.total_marks
            } ({pct}%)
          </div>
        )}
      </CardContent>
      <TestCardFooter done={done} attempt={attempt} test={test} />
    </Card>
  )
}

// ── Breadcrumb ────────────────────────────────────────────────────
export interface BreadcrumbProps {
  steps: string[]
  onBack: (index: number) => void
}

function Breadcrumb({ steps, onBack }: BreadcrumbProps) {
  return (
    <div className="flex items-center gap-2 text-sm mb-6">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          {i < steps.length - 1 ? (
            <button onClick={() => onBack(i)} className="text-primary hover:text-primary transition-colors">{s}</button>
          ) : (
            <span className="font-semibold" style={{ color: 'var(--text)' }}>{s}</span>
          )}
          {i < steps.length - 1 && <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />}
        </div>
      ))}
    </div>
  )
}

// ── Nav Card ──────────────────────────────────────────────────────
export interface NavCardProps {
  label: string
  count?: number
  onClick: () => void
}

function NavCard({ label, count, onClick }: NavCardProps) {
  return (
    <Card className="hover:border-primary/50 transition-all group w-full cursor-pointer border-border" onClick={onClick}>
      <CardContent className="p-5 flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-foreground">{label}</p>
          {count !== undefined && (
            <p className="text-xs mt-1 text-muted-foreground">{count} test{count !== 1 ? 's' : ''}</p>
          )}
        </div>
        <ChevronRight size={18} className="text-primary group-hover:translate-x-1 transition-transform flex-shrink-0" />
      </CardContent>
    </Card>
  )
}

// ── View components (one per nav level) ──────────────────────────

export interface CategoryPickerProps {
  tests: TestCatalogItem[]
  push: (type: NavigationType, value: string) => void
}

function CategoryPicker({ tests, push }: CategoryPickerProps) {
  const wqCount = tests.filter(t => t.category === 'weekly_quiz').length
  const tsCount = tests.filter(t => t.category === 'test_series').length
  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Tests</h1>
        <div className="grid gap-4">
          <NavCard label="Weekly Quiz" count={wqCount} onClick={() => push('category', 'weekly_quiz')} />
          <NavCard label="Test Series" count={tsCount} onClick={() => push('category', 'test_series')} />
        </div>
      </div>
    </Layout>
  )
}

export interface WeeklyQuizSubjectsProps {
  tests: TestCatalogItem[]
  push: (type: NavigationType, value: string) => void
  breadcrumbs: string[]
  goBack: (index: number) => void
}

function WeeklyQuizSubjects({ tests, push, breadcrumbs, goBack }: WeeklyQuizSubjectsProps) {
  return (
    <Layout>
      <div className="max-w-2xl mx-auto animate-fade-in">
        <Breadcrumb steps={breadcrumbs} onBack={goBack} />
        <div className="grid gap-3">
          {SUBJECTS.map(sub => {
            const count = tests.filter(t => t.category === 'weekly_quiz' && t.subject === sub).length
            if (count === 0) return null
            return <NavCard key={sub} label={sub} count={count} onClick={() => push('subject', sub)} />
          })}
          {tests.filter(t => t.category === 'weekly_quiz' && !t.subject).length > 0 && (
            <NavCard label="General"
              count={tests.filter(t => t.category === 'weekly_quiz' && !t.subject).length}
              onClick={() => push('subject', '')} />
          )}
        </div>
      </div>
    </Layout>
  )
}

// ── Generic Option Picker ─────────────────────────────────────────

export interface OptionPickerProps<TItem extends { value: string }> {
  items: TItem[]
  getLabel: (item: TItem) => string
  getCount: (item: TItem) => number
  onSelect: (value: string) => void
  breadcrumbs: string[]
  goBack: (index: number) => void
  gapClassName?: string
}

function OptionPicker<TItem extends { value: string }>({ items, getLabel, getCount, onSelect, breadcrumbs, goBack, gapClassName = 'gap-4' }: OptionPickerProps<TItem>) {
  return (
    <Layout>
      <div className="max-w-2xl mx-auto animate-fade-in">
        <Breadcrumb steps={breadcrumbs} onBack={goBack} />
        <div className={`grid ${gapClassName}`}>
          {items.map(item => {
            const count = getCount(item)
            if (count === 0) return null
            return <NavCard key={item.value} label={getLabel(item)} count={count} onClick={() => onSelect(item.value)} />
          })}
        </div>
      </div>
    </Layout>
  )
}

export interface TestSeriesPickerProps {
  tests: TestCatalogItem[]
  push: (type: NavigationType, value: string) => void
  breadcrumbs: string[]
  goBack: (index: number) => void
}

function TestSeriesPicker({ tests, push, breadcrumbs, goBack }: TestSeriesPickerProps) {
  const items = (['made_easy', 'go_classes'] as const).map(value => ({ value }))
  return <OptionPicker items={items} getLabel={i => SERIES_LABELS[i.value]} 
    getCount={i => tests.filter(t => t.category === 'test_series' && t.series_name === i.value).length}
    onSelect={val => push('series', val)} breadcrumbs={breadcrumbs} goBack={goBack} />
}

export interface TestTypePickerProps {
  tests: TestCatalogItem[]
  nav: NavigationStep[]
  push: (type: NavigationType, value: string) => void
  breadcrumbs: string[]
  goBack: (index: number) => void
}

function TestTypePicker({ tests, nav, push, breadcrumbs, goBack }: TestTypePickerProps) {
  const items = (['subject_wise', 'topic_wise', 'full_length'] as const).map(value => ({ value }))
  return <OptionPicker items={items} getLabel={i => TYPE_LABELS[i.value]}
    getCount={i => tests.filter(t => t.category === 'test_series' && t.series_name === nav[1]?.value && t.test_type === i.value).length}
    onSelect={val => push('type', val)} breadcrumbs={breadcrumbs} goBack={goBack} />
}

export interface TopicWiseSubjectsProps {
  filteredTests: TestCatalogItem[]
  push: (type: NavigationType, value: string) => void
  breadcrumbs: string[]
  goBack: (index: number) => void
}

function TopicWiseSubjects({ filteredTests, push, breadcrumbs, goBack }: TopicWiseSubjectsProps) {
  const items = SUBJECTS.map(value => ({ value }))
  return <OptionPicker items={items} getLabel={i => i.value} gapClassName="gap-3"
    getCount={i => filteredTests.filter(t => t.subject === i.value).length}
    onSelect={val => push('subject', val)} breadcrumbs={breadcrumbs} goBack={goBack} />
}

export interface TestListProps {
  filteredTests: TestCatalogItem[]
  history: Record<number, HistoryItem | undefined>
  breadcrumbs: string[]
  goBack: (index: number) => void
}

function TestList({ filteredTests, history, breadcrumbs, goBack }: TestListProps) {
  return (
    <Layout>
      <div className="max-w-3xl mx-auto animate-fade-in">
        <Breadcrumb steps={breadcrumbs} onBack={goBack} />
        {filteredTests.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-12 text-center flex flex-col items-center">
              <BookOpen size={36} className="text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No tests here yet. Check back later.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filteredTests.map(t => (
              <TestCard key={t.id} test={t} attempt={history[t.id]} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}

// ── View resolver: table-driven dispatch ─────────────────────────

const isRoot = (nav: NavigationStep[]): boolean => nav.length === 0
const isWeeklyQuizCategory = (nav: NavigationStep[]): boolean => nav.length === 1 && nav[0].value === 'weekly_quiz'
// Note: Originally this fell back to TestSeriesPicker for ANY non-'weekly_quiz' category.
// Now it strictly requires 'test_series'. If new categories are added upstream, update ROUTES.
const isTestSeriesCategory = (nav: NavigationStep[]): boolean => nav.length === 1 && nav[0].value === 'test_series'
const isTestSeriesTypeLevel = (nav: NavigationStep[]): boolean => nav.length === 2 && nav[0].value === 'test_series'
const isTopicWiseLevel = (currentNav: NavigationStep | undefined): boolean => currentNav?.type === 'type' && currentNav?.value === 'topic_wise'

export interface ResolveViewProps {
  nav: NavigationStep[]
  currentNav: NavigationStep | undefined
  tests: TestCatalogItem[]
  filteredTests: TestCatalogItem[]
  history: Record<number, HistoryItem | undefined>
  push: (type: NavigationType, value: string) => void
  goBack: (index: number) => void
  breadcrumbs: string[]
}

type ViewComponent = typeof CategoryPicker | typeof WeeklyQuizSubjects | typeof TestSeriesPicker | typeof TestTypePicker | typeof TopicWiseSubjects | typeof TestList

interface ViewRoute {
  test: (props: ResolveViewProps) => boolean
  Component: ViewComponent
}

const ROUTES: ViewRoute[] = [
  { test: ({ nav }) => isRoot(nav), Component: CategoryPicker },
  { test: ({ nav }) => isWeeklyQuizCategory(nav), Component: WeeklyQuizSubjects },
  { test: ({ nav }) => isTestSeriesCategory(nav), Component: TestSeriesPicker },
  { test: ({ nav }) => isTestSeriesTypeLevel(nav), Component: TestTypePicker },
  { test: ({ currentNav }) => isTopicWiseLevel(currentNav), Component: TopicWiseSubjects },
]

function resolveView(props: ResolveViewProps) {
  const route = ROUTES.find(r => r.test(props))
  const Component = route ? route.Component : TestList
  return <Component {...props} />
}

export default function TestsPage() {
  const { data: testsData, isLoading: testsLoading } = useSWR<TestCatalogItem[]>('/tests', fetcher)
  const { data: historyData, isLoading: historyLoading } = useSWR<HistoryItem[]>('/tests/my/history', fetcher)

  const loading = testsLoading || historyLoading
  const tests = testsData || []

  const history = useMemo<Record<number, HistoryItem | undefined>>(() => {
    if (!historyData) return {}
    const map: Record<number, HistoryItem | undefined> = {}
    historyData.forEach(a => { if (!map[a.test_id] || a.status === 'submitted') map[a.test_id] = a })
    return map
  }, [historyData])

  const { nav, currentNav, push, goBack, filteredTests, breadcrumbs } = useTestNavigation(tests)

  if (loading) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto animate-fade-in">
          {nav.length === 0 ? (
            <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text)' }}>Tests</h1>
          ) : (
            <Breadcrumb steps={breadcrumbs} onBack={goBack} />
          )}
          <div className="grid md:grid-cols-2 gap-4">
            <TestCardSkeleton /><TestCardSkeleton /><TestCardSkeleton /><TestCardSkeleton />
          </div>
        </div>
      </Layout>
    )
  }

  return resolveView({ nav, currentNav, tests, filteredTests, history, push, goBack, breadcrumbs })
}
