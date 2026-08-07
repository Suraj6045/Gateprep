import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/shared/Layout'
import useSWR from 'swr'
import { fetcher } from '../api/api'
import { SUBJECTS, SERIES_LABELS, TYPE_LABELS } from '../utils/constants'
import { useTestNavigation } from '../hooks/useTestNavigation'
import Clock from 'lucide-react/dist/esm/icons/clock'
import BookOpen from 'lucide-react/dist/esm/icons/book-open'
import Target from 'lucide-react/dist/esm/icons/target'
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right'
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right'
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle'
import clsx from 'clsx'
import { TestCardSkeleton } from '../components/shared/Skeletons'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

function scoreBadgeClass(pct) {
  if (pct >= 75) return 'bg-[var(--success-text)]/10 text-success-text dark:text-success-text'
  if (pct >= 50) return 'bg-[var(--warning-text)]/10 text-warning-text dark:text-warning-text'
  return 'bg-[var(--destructive)]/10 text-destructive dark:text-destructive'
}

function TestCardFooter({ done, attempt, test }) {
  return (
    <CardFooter className="p-4 pt-0">
      {done ? (
        <Button asChild variant="outline" className="w-full border-primary/30 text-primary hover:bg-primary/10 h-8 text-xs">
          <Link to={`/results/${attempt.id}`}>
            View Result <ArrowRight size={12} className="ml-1.5" />
          </Link>
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

function TestCard({ test, attempt }) {
  const done = attempt?.status === 'submitted'
  const pct = done && attempt?.total_marks
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
            Score: {attempt.score?.toFixed(1)}/{attempt.total_marks} ({pct}%)
          </div>
        )}
      </CardContent>
      <TestCardFooter done={done} attempt={attempt} test={test} />
    </Card>
  )
}

// ── Breadcrumb ────────────────────────────────────────────────────
function Breadcrumb({ steps, onBack }) {
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
function NavCard({ label, count, onClick }) {
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

function CategoryPicker({ tests, push }) {
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

function WeeklyQuizSubjects({ tests, push, breadcrumbs, goBack }) {
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

function OptionPicker({ items, getLabel, getCount, onSelect, breadcrumbs, goBack, gapClassName = 'gap-4' }) {
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

function TestSeriesPicker({ tests, push, breadcrumbs, goBack }) {
  const items = ['made_easy', 'go_classes'].map(value => ({ value }))
  return <OptionPicker items={items} getLabel={i => SERIES_LABELS[i.value]} 
    getCount={i => tests.filter(t => t.category === 'test_series' && t.series_name === i.value).length}
    onSelect={val => push('series', val)} breadcrumbs={breadcrumbs} goBack={goBack} />
}

function TestTypePicker({ tests, nav, push, breadcrumbs, goBack }) {
  const items = ['subject_wise', 'topic_wise', 'full_length'].map(value => ({ value }))
  return <OptionPicker items={items} getLabel={i => TYPE_LABELS[i.value]}
    getCount={i => tests.filter(t => t.category === 'test_series' && t.series_name === nav[1].value && t.test_type === i.value).length}
    onSelect={val => push('type', val)} breadcrumbs={breadcrumbs} goBack={goBack} />
}

function TopicWiseSubjects({ filteredTests, push, breadcrumbs, goBack }) {
  const items = SUBJECTS.map(value => ({ value }))
  return <OptionPicker items={items} getLabel={i => i.value} gapClassName="gap-3"
    getCount={i => filteredTests.filter(t => t.subject === i.value).length}
    onSelect={val => push('subject', val)} breadcrumbs={breadcrumbs} goBack={goBack} />
}

function TestList({ filteredTests, history, breadcrumbs, goBack }) {
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

const isRoot = (nav) => nav.length === 0
const isWeeklyQuizCategory = (nav) => nav.length === 1 && nav[0].value === 'weekly_quiz'
// Note: Originally this fell back to TestSeriesPicker for ANY non-'weekly_quiz' category.
// Now it strictly requires 'test_series'. If new categories are added upstream, update ROUTES.
const isTestSeriesCategory = (nav) => nav.length === 1 && nav[0].value === 'test_series'
const isTestSeriesTypeLevel = (nav) => nav.length === 2 && nav[0].value === 'test_series'
const isTopicWiseLevel = (currentNav) => currentNav?.type === 'type' && currentNav?.value === 'topic_wise'

const ROUTES = [
  { test: ({ nav }) => isRoot(nav), Component: CategoryPicker },
  { test: ({ nav }) => isWeeklyQuizCategory(nav), Component: WeeklyQuizSubjects },
  { test: ({ nav }) => isTestSeriesCategory(nav), Component: TestSeriesPicker },
  { test: ({ nav }) => isTestSeriesTypeLevel(nav), Component: TestTypePicker },
  { test: ({ currentNav }) => isTopicWiseLevel(currentNav), Component: TopicWiseSubjects },
]

function resolveView(props) {
  const route = ROUTES.find(r => r.test(props))
  const Component = route ? route.Component : TestList
  return <Component {...props} />
}

export default function TestsPage() {
  const { data: testsData, isLoading: testsLoading } = useSWR('/tests', fetcher)
  const { data: historyData, isLoading: historyLoading } = useSWR('/tests/my/history', fetcher)

  const loading = testsLoading || historyLoading
  const tests = testsData || []

  const history = useMemo(() => {
    if (!historyData) return {}
    const map = {}
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
