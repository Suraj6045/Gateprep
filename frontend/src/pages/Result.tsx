import { useState, useMemo, memo, useCallback } from 'react'
import type { CSSProperties, Dispatch, SetStateAction } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/shared/Layout'
import { testAPI } from '../api/api'
import { CheckCircle, XCircle, MinusCircle, ArrowLeft, ChevronDown, ChevronUp, Trophy, RotateCcw, Medal, Bookmark, BookmarkCheck, Clock, TrendingUp, Download } from 'lucide-react'
import MathText from '../components/shared/MathText'
import OptionImage from '../components/test/OptionImage'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { downloadResultReport } from '../utils/reportGenerator'
import { ResultSkeleton } from '../components/shared/Skeletons'
import { useResultData } from '../hooks/useResultData'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { BADGE_COLORS } from '../utils/badgeStyles'
import type { MyAttempt, PersistedResult, PersistedResultAnswer } from '../types/api'

export interface ScoreRingProps {
  pct: number
}

function ScoreRing({ pct }: ScoreRingProps) {
  const r = 48, c = 2 * Math.PI * r
  const filled = (pct / 100) * c
  const color = pct >= 75 ? 'var(--success-text)' : pct >= 50 ? 'var(--warning-text)' : 'var(--danger-text)'
  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--border)" strokeWidth="10"/>
      <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={`${filled} ${c}`} strokeLinecap="round" transform="rotate(-90 60 60)"
        style={{ transition: 'stroke-dasharray 1s ease' }}/>
      <text x="60" y="56" textAnchor="middle" fill="var(--text)" fontSize="20" fontWeight="700" fontFamily="Syne">{pct}%</text>
      <text x="60" y="72" textAnchor="middle" fill="var(--text-muted)" fontSize="10" fontFamily="DM Sans">score</text>
    </svg>
  )
}

export interface AnswerStatusIconProps {
  qa: PersistedResultAnswer
}

function AnswerStatusIcon({ qa }: AnswerStatusIconProps) {
  if (qa.is_correct === true) return <CheckCircle size={14} className="text-success-text flex-shrink-0 mt-0.5" />
  if (qa.is_correct === false) return <XCircle size={14} className="text-destructive flex-shrink-0 mt-0.5" />
  return <MinusCircle size={14} className="text-muted-foreground flex-shrink-0 mt-0.5" />
}

function getOptionState(qa: PersistedResultAnswer, letter: string | undefined) {
  // @ts-expect-error TODO(null-safety): letter may be undefined; String.includes(undefined) searches for "undefined".
  const isCorrect = qa.correct_answer?.includes(letter)
  // @ts-expect-error TODO(null-safety): letter may be undefined; String.includes(undefined) searches for "undefined".
  const isSelected = qa.selected_answer?.includes(letter)
  // @ts-expect-error TODO(null-safety): letter may be undefined; String.includes(undefined) searches for "undefined".
  const isTopperPick = qa.topper_answer?.includes(letter)
  return { isCorrect, isSelected, isTopperPick }
}

function getOptionClassName(isCorrect: boolean | undefined, isSelected: boolean | undefined) {
  if (isCorrect) return 'result-stat-correct text-success-text'
  if (isSelected) return 'result-stat-incorrect text-destructive'
  return 'border text-muted-foreground border-border'
}

export interface OptionMarkersProps {
  isCorrect: boolean | undefined
  isSelected: boolean | undefined
  isTopperPick: boolean | undefined
}

function OptionMarkers({ isCorrect, isSelected, isTopperPick }: OptionMarkersProps) {
  return (
    <>
      {isCorrect && <span className="ml-1 text-success-text">✓</span>}
      {isSelected && !isCorrect && <span className="ml-1 text-destructive">✗</span>}
      {isTopperPick && !isSelected && <span className="ml-1 text-warning-text">★ Topper</span>}
    </>
  )
}

export interface McqOptionsGridProps {
  qa: PersistedResultAnswer
}

function McqOptionsGrid({ qa }: McqOptionsGridProps) {
  // The backend model permits dict options, but this page has always used array length/map.
  // Keep that existing runtime behavior while retaining the model's list-or-dict type.
  // @ts-expect-error TODO(null-safety): options may be a dict; its length value remains untyped and is compared as before.
  if (!(qa.options?.length > 0)) return null
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2">
      {
        // @ts-expect-error TODO(null-safety): options may be a dict without map; preserve the existing array-only rendering path.
        qa.options.map((o: unknown, i: number) => {
        const letter = 'ABCD'[i]
        const { isCorrect, isSelected, isTopperPick } = getOptionState(qa, letter)
        return (
          <div key={i} className={clsx('px-3 py-2 rounded text-xs', getOptionClassName(isCorrect, isSelected))}>
            <span className="font-mono font-semibold mr-1">{letter}.</span>
            { // @ts-expect-error TODO(null-safety): option JSON may contain a non-renderable value; preserve direct React child behavior.
              <MathText>{o}</MathText>
            }
            { // @ts-expect-error TODO(null-safety): optimizer preserves non-string image values; OptionImage expects a URL string.
              <OptionImage src={qa.option_images?.[letter]} letter={letter} />
            }
            <OptionMarkers isCorrect={isCorrect} isSelected={isSelected} isTopperPick={isTopperPick} />
          </div>
        )
        })
      }
    </div>
  )
}

export interface NatAnswerComparisonProps {
  qa: PersistedResultAnswer
}

function NatAnswerComparison({ qa }: NatAnswerComparisonProps) {
  if (qa.question_type !== 'nat') return null
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 text-xs">
      <div className="px-3 py-2 rounded result-stat-correct text-success-text">
        ✓ Correct: <span className="font-mono">{qa.correct_answer}</span>
      </div>
      <div className="px-3 py-2 rounded border text-muted-foreground border-border">
        You: <span className="font-mono">{qa.selected_answer || 'Skipped'}</span>
      </div>
    </div>
  )
}

export interface TopperTimeComparisonProps {
  qa: PersistedResultAnswer
}

function TopperTimeComparison({ qa }: TopperTimeComparisonProps) {
  if (!(qa.topper_time_seconds > 0)) return null
  return (
    <div className="flex items-center gap-4 text-xs mt-1 text-muted-foreground">
      <span>Your time: <strong>{qa.time_spent_seconds}s</strong></span>
      <span>Topper time: <strong className="text-warning-text">{qa.topper_time_seconds}s</strong></span>
    </div>
  )
}

export interface BookmarkToggleProps {
  isBookmarked: boolean
  onToggle: () => void
}

function BookmarkToggle({ isBookmarked, onToggle }: BookmarkToggleProps) {
  return (
    <button onClick={e => { e.stopPropagation(); onToggle() }} aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
      className={clsx('p-2 rounded transition-colors', isBookmarked ? 'text-primary' : 'text-muted-foreground hover:text-primary')}>
      {isBookmarked ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
    </button>
  )
}

function marksBadgeClass(marksAwarded: number) {
  if (marksAwarded > 0) return 'text-success-text'
  if (marksAwarded < 0) return 'text-destructive'
  return 'text-muted-foreground'
}

const QUESTION_TYPE_CLASS: Record<string, string> = {
  mcq: 'bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400',
  msq: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
  nat: 'bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400',
  default: 'bg-muted text-muted-foreground border-border',
}

function questionTypeClass(questionType: string) {
  return QUESTION_TYPE_CLASS[questionType] ?? QUESTION_TYPE_CLASS.default
}

export interface QuestionReviewProps {
  qa: PersistedResultAnswer
  idx: number
  isBookmarked: boolean
  onToggleBookmark: (questionId: number) => void
}

const QuestionReview = memo(function QuestionReview({ qa, idx, isBookmarked, onToggleBookmark }: QuestionReviewProps) {
  const [open, setOpen] = useState(false)
  const cardStyle: CSSProperties & { [key: `--${string}`]: string } = { '--card-spacing': '0' }

  return (
    <Card className="overflow-hidden mb-2" style={cardStyle}>
      <div className="flex items-start gap-3 p-3 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring rounded outline-none" role="button" tabIndex={0} aria-expanded={open} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o); } }} onClick={() => setOpen(o => !o)}>
        <span className="text-xs font-mono mt-0.5 w-5 flex-shrink-0 text-muted-foreground">Q{idx + 1}</span>
        <AnswerStatusIcon qa={qa} />
        <Badge variant="outline" className={`mt-0.5 h-5 shrink-0 px-2 text-[10px] tracking-wide ${questionTypeClass(qa.question_type)}`}>
          {qa.question_type?.toUpperCase() || 'UNKNOWN'}
        </Badge>
        <div className="text-sm flex-1 min-w-0 text-card-foreground">
          <div className="break-words"><MathText>{qa.question_text}</MathText></div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={clsx('text-xs font-mono font-semibold', marksBadgeClass(qa.marks_awarded))}>
            {qa.marks_awarded > 0 ? '+' : ''}{qa.marks_awarded}
          </span>
          <span className="text-xs flex items-center gap-1 text-muted-foreground">
            <Clock size={10} /> {qa.time_spent_seconds}s
          </span>
          <BookmarkToggle isBookmarked={isBookmarked} onToggle={() => onToggleBookmark(qa.question_id)} />
          {open ? <ChevronUp size={13} className="text-muted-foreground" /> : <ChevronDown size={13} className="text-muted-foreground" />}
        </div>
      </div>

      {open && (
        <div className="px-4 pb-3 border-t space-y-2 border-border">
          {qa.question_image_url && (
            <img
              src={qa.question_image_url}
              alt={`Question ${idx + 1} illustration`}
              loading="lazy"
              decoding="async"
              className="mt-3 max-h-64 max-w-full rounded border bg-muted object-contain border-border"
            />
          )}
          <McqOptionsGrid qa={qa} />
          <NatAnswerComparison qa={qa} />
          <TopperTimeComparison qa={qa} />
        </div>
      )}
    </Card>
  )
})

/* ── Derived summary ── */

export interface ResultSummary {
  pct: number
  grade: string
  gradeColor: string
  rankText: string
}

function useResultSummary(result: Partial<PersistedResult>): ResultSummary {
  return useMemo(() => {
    // @ts-expect-error TODO(null-safety): the loading fallback has no percentage; Math.round(undefined) is NaN.
    const pct = Math.round(result.percentage)
    const grade = pct >= 75 ? 'Excellent' : pct >= 50 ? 'Good' : 'Needs Work'
    const gradeColor = pct >= 75 ? 'text-success-text' : pct >= 50 ? 'text-warning-text' : 'text-destructive'
    const rankText = result.rank
      ? result.counts_for_leaderboard
        ? ` · Rank #${result.rank}/${result.total_participants}`
        : ` · First-attempt rank #${result.rank}/${result.total_participants}`
      : ''
    return { pct, grade, gradeColor, rankText }
  }, [result])
}

/* ── Section components ── */

export interface ResultHeaderProps {
  result: PersistedResult
  onDownload: () => Promise<void>
}

const ResultHeader = memo(function ResultHeader({ result, onDownload }: ResultHeaderProps) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <Link to="/dashboard" className="flex items-center gap-1.5 text-sm hover:opacity-80 text-muted-foreground">
        <ArrowLeft size={14} /> Dashboard
      </Link>
      <div className="flex items-center gap-3">
        <button onClick={onDownload}
          className="flex items-center gap-1.5 text-sm text-success-text hover:text-success-text cursor-pointer">
          <Download size={13} /> Download
        </button>
        <Link to={`/tests/${result.test_id}/leaderboard`}
          className="flex items-center gap-1.5 text-sm text-primary hover:text-primary">
          <Trophy size={13} /> Leaderboard
        </Link>
      </div>
    </div>
  )
})

export interface AttemptBadgeProps {
  result: PersistedResult
}

const AttemptBadge = memo(function AttemptBadge({ result }: AttemptBadgeProps) {
  if (result.counts_for_leaderboard) return null
  return (
    <div className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm rounded border result-attempt-practice">
      <Medal size={14} />
      Attempt {result.attempt_number} · Practice result (download to keep)
    </div>
  )
})

export interface ScoreCardProps {
  result: PersistedResult
  summary: ResultSummary
}

const ScoreCard = memo(function ScoreCard({ result, summary }: ScoreCardProps) {
  const { pct, grade, gradeColor, rankText } = summary
  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="font-bold text-lg mb-4 text-card-foreground">
          <Trophy size={16} className="inline text-warning-text mr-2" />{result.test_title}
        </h2>
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <ScoreRing pct={pct} />
          <div className="flex-1 w-full">
            <p className={`font-bold text-2xl mb-1 ${gradeColor}`}>{grade}</p>
            <p className="text-sm mb-1 text-muted-foreground">
              {result.score?.toFixed(2)} / {result.total_marks} marks{rankText}
            </p>
            <div className="grid grid-cols-3 gap-2 mt-3">
              {[
                ['Correct', result.correct, 'text-success-text', 'result-stat-correct'],
                ['Wrong', result.incorrect, 'text-destructive', 'result-stat-wrong'],
                ['Skipped', result.skipped, 'text-muted-foreground', 'result-stat-skipped'],
              ].map(([label, val, cls, statClass]) => (
                <div key={label} className={`rounded p-2 text-center ${statClass}`}>
                  <p className={`text-xl font-bold ${cls}`}>{val}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

export interface ComparisonStatsProps {
  result: PersistedResult
}

const ComparisonStats = memo(function ComparisonStats({ result }: ComparisonStatsProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2 text-card-foreground">
          <TrendingUp size={15} className="text-primary" /> Performance Comparison
        </h3>
        <div className="space-y-2">
          {[
            { label: 'Your Score', val: result.score?.toFixed(1), pct: Math.round(result.percentage), color: 'var(--info-text)' },
            ...(result.topper ? [{ label: 'Topper', val: result.topper.score?.toFixed(1), pct: Math.round(result.topper.percentage), color: 'var(--success-text)' }] : []),
          ].map(({ label, val, pct: p, color }) => (
            <div key={label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-semibold" style={{ color }}>{val} ({p}%)</span>
              </div>
              <div className="h-2 rounded-full result-progress-track">
                <div className="h-2 rounded-full transition-all" style={{ width: `${p}%`, background: color }} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
})

export interface AttemptHistoryProps {
  attempts: MyAttempt[]
  currentAttemptId: string | undefined
}

const AttemptHistory = memo(function AttemptHistory({ attempts, currentAttemptId }: AttemptHistoryProps) {
  if (attempts.length <= 1) return null
  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="font-semibold mb-3 text-card-foreground">Your Attempts</h3>
        <div className="space-y-2">
          {attempts.map(a => (
            <div key={a.attempt_id} className={clsx('flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 rounded border border-border',
              a.attempt_id === (
                // @ts-expect-error TODO(null-safety): currentAttemptId may be undefined; parseInt(undefined) is NaN.
                parseInt(currentAttemptId)
              ) && 'result-current-attempt')}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground">#{a.attempt_number}</span>
                {a.counts_for_leaderboard
                  ? <Badge className={BADGE_COLORS.sky}>Leaderboard</Badge>
                  : <Badge className={BADGE_COLORS.amber}>Practice</Badge>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-card-foreground">{a.score?.toFixed(1)}/{a.total_marks} ({a.percentage}%)</span>
                {a.attempt_id !== (
                  // @ts-expect-error TODO(null-safety): currentAttemptId may be undefined; parseInt(undefined) is NaN.
                  parseInt(currentAttemptId)
                ) && (
                  <Link to={`/results/${a.attempt_id}`} className="text-xs text-primary">View →</Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
})

export interface ResultActionsProps {
  result: PersistedResult
  onReattempt: () => void
}

const ResultActions = memo(function ResultActions({ result, onReattempt }: ResultActionsProps) {
  return (
    <div>
      <Button onClick={onReattempt} disabled={result.attempts_remaining <= 0} className="w-full flex items-center justify-center gap-2 text-sm">
        <RotateCcw size={14} />
        Reattempt {result.attempts_remaining > 0 ? `(${result.attempts_remaining} left)` : '(max reached)'}
      </Button>
    </div>
  )
})

export type ResultFilter = keyof typeof FILTER_PREDICATES

export interface QuestionReviewItem {
  answer: PersistedResultAnswer
  idx: number
}

export interface QuestionReviewListProps {
  items: QuestionReviewItem[]
  filter: ResultFilter
  setFilter: Dispatch<SetStateAction<ResultFilter>>
  bookmarked: Set<number>
  onToggleBookmark: (questionId: number) => void
}

const QuestionReviewList = memo(function QuestionReviewList({ items, filter, setFilter, bookmarked, onToggleBookmark }: QuestionReviewListProps) {
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <h3 className="font-semibold text-foreground">
          Question Review
          <span className="text-xs ml-2 text-muted-foreground">(click bookmark icon)</span>
        </h3>
        <div className="flex flex-wrap gap-1 p-1 rounded bg-card">
          {(['all', 'correct', 'incorrect', 'skipped'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={clsx('px-2.5 py-1 rounded text-xs font-medium capitalize transition-colors',
                filter === f ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground')}>
              {f}
            </button>
          ))}
        </div>
      </div>
      {items.map(({ answer, idx }) => (
        <QuestionReview key={answer.question_id} qa={answer} idx={idx}
          isBookmarked={bookmarked.has(answer.question_id)} onToggleBookmark={onToggleBookmark} />
      ))}
      {items.length === 0 && <p className="text-center py-8 text-sm text-muted-foreground">No questions in this category</p>}
    </div>
  )
})

/* ── Page ── */

const FILTER_PREDICATES = {
  all: () => true,
  correct: (a: PersistedResultAnswer) => a.is_correct === true,
  incorrect: (a: PersistedResultAnswer) => a.is_correct === false,
  skipped: (a: PersistedResultAnswer) => a.is_correct == null,
}

export default function ResultPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<ResultFilter>('all')
  const { attemptId, result, bookmarked, attempts, loading, toggleBookmark } = useResultData()

  const reattempt = useCallback(() => {
    // The button is rendered only after the existing !result return below.
    // @ts-expect-error TODO(null-safety): result may be null in this closure; attempts_remaining access would throw.
    if (result.attempts_remaining <= 0) {
      toast.error('Maximum attempts reached for this test')
      return
    }
    // @ts-expect-error TODO(null-safety): result may be null in this closure; test_id access would throw.
    navigate(`/tests/${result.test_id}`)
  }, [result, navigate])

  const handleDownload = useCallback(async () => {
    try {
      await downloadResultReport(result)
      toast.success('Result downloaded')
    } catch {
      toast.error('Failed to download result')
    }
  }, [result])

  const summary = useResultSummary(result || {})

  // O(n) instead of O(n²): carry original index through filter so
  // QuestionReview gets the correct question number without indexOf.
  const filteredItems = useMemo(() => {
    if (!result?.answers) return []
    return result.answers
      .map((a, idx) => ({ answer: a, idx }))
      .filter(({ answer: a }) => FILTER_PREDICATES[filter](a))
  }, [result?.answers, filter])

  if (loading) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <Link to="/dashboard" className="flex items-center gap-1.5 text-sm hover:opacity-80 text-muted-foreground">
              <ArrowLeft size={14} /> Dashboard
            </Link>
          </div>
          <ResultSkeleton />
        </div>
      </Layout>
    )
  }
  if (!result) return <Layout><p className="text-center py-16 text-muted-foreground">Result not found.</p></Layout>

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
        <ResultHeader result={result} onDownload={handleDownload} />
        <AttemptBadge result={result} />
        <ScoreCard result={result} summary={summary} />
        <ComparisonStats result={result} />
        <AttemptHistory attempts={attempts} currentAttemptId={attemptId} />
        <ResultActions result={result} onReattempt={reattempt} />
        <QuestionReviewList
          items={filteredItems}
          filter={filter}
          setFilter={setFilter}
          bookmarked={bookmarked}
          onToggleBookmark={toggleBookmark}
        />
      </div>
    </Layout>
  )
}
