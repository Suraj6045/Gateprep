import { useState, useMemo, memo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/shared/Layout'
import { testAPI } from '../api/api'
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle'
import XCircle from 'lucide-react/dist/esm/icons/x-circle'
import MinusCircle from 'lucide-react/dist/esm/icons/minus-circle'
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left'
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down'
import ChevronUp from 'lucide-react/dist/esm/icons/chevron-up'
import Trophy from 'lucide-react/dist/esm/icons/trophy'
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw'
import Medal from 'lucide-react/dist/esm/icons/medal'
import Bookmark from 'lucide-react/dist/esm/icons/bookmark'
import BookmarkCheck from 'lucide-react/dist/esm/icons/bookmark-check'
import Clock from 'lucide-react/dist/esm/icons/clock'
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up'
import Download from 'lucide-react/dist/esm/icons/download'
import MathText from '../components/shared/MathText'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { downloadResultReport } from '../utils/reportGenerator'
import { ResultSkeleton } from '../components/shared/Skeletons'
import { useResultData } from '../hooks/useResultData'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { BADGE_COLORS } from '../utils/badgeStyles'

function ScoreRing({ pct }) {
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

function AnswerStatusIcon({ qa }) {
  if (qa.is_correct === true) return <CheckCircle size={14} className="text-success-text flex-shrink-0 mt-0.5" />
  if (qa.is_correct === false) return <XCircle size={14} className="text-destructive flex-shrink-0 mt-0.5" />
  return <MinusCircle size={14} className="text-muted-foreground flex-shrink-0 mt-0.5" />
}

function getOptionState(qa, letter) {
  const isCorrect = qa.correct_answer?.includes(letter)
  const isSelected = qa.selected_answer?.includes(letter)
  const isTopperPick = qa.topper_answer?.includes(letter)
  return { isCorrect, isSelected, isTopperPick }
}

function getOptionClassName(isCorrect, isSelected) {
  if (isCorrect) return 'result-stat-correct text-success-text'
  if (isSelected) return 'result-stat-incorrect text-destructive'
  return 'border text-muted-foreground border-border'
}

function OptionMarkers({ isCorrect, isSelected, isTopperPick }) {
  return (
    <>
      {isCorrect && <span className="ml-1 text-success-text">✓</span>}
      {isSelected && !isCorrect && <span className="ml-1 text-destructive">✗</span>}
      {isTopperPick && !isSelected && <span className="ml-1 text-warning-text">★ Topper</span>}
    </>
  )
}

function McqOptionsGrid({ qa }) {
  if (!(qa.options?.length > 0)) return null
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2">
      {qa.options.map((o, i) => {
        const letter = 'ABCD'[i]
        const { isCorrect, isSelected, isTopperPick } = getOptionState(qa, letter)
        return (
          <div key={i} className={clsx('px-3 py-2 rounded text-xs', getOptionClassName(isCorrect, isSelected))}>
            <span className="font-mono font-semibold mr-1">{letter}.</span><MathText>{o}</MathText>
            <OptionMarkers isCorrect={isCorrect} isSelected={isSelected} isTopperPick={isTopperPick} />
          </div>
        )
      })}
    </div>
  )
}

function NatAnswerComparison({ qa }) {
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

function TopperTimeComparison({ qa }) {
  if (!(qa.topper_time_seconds > 0)) return null
  return (
    <div className="flex items-center gap-4 text-xs mt-1 text-muted-foreground">
      <span>Your time: <strong>{qa.time_spent_seconds}s</strong></span>
      <span>Topper time: <strong className="text-warning-text">{qa.topper_time_seconds}s</strong></span>
    </div>
  )
}

function BookmarkToggle({ isBookmarked, onToggle }) {
  return (
    <button onClick={e => { e.stopPropagation(); onToggle() }} aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
      className={clsx('p-2 rounded transition-colors', isBookmarked ? 'text-primary' : 'text-muted-foreground hover:text-primary')}>
      {isBookmarked ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
    </button>
  )
}

function marksBadgeClass(marksAwarded) {
  if (marksAwarded > 0) return 'text-success-text'
  if (marksAwarded < 0) return 'text-destructive'
  return 'text-muted-foreground'
}

const QuestionReview = memo(function QuestionReview({ qa, idx, isBookmarked, onToggleBookmark }) {
  const [open, setOpen] = useState(false)

  return (
    <Card className="overflow-hidden mb-2" style={{ '--card-spacing': '0' }}>
      <div className="flex items-start gap-3 p-3 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring rounded outline-none" role="button" tabIndex={0} aria-expanded={open} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o); } }} onClick={() => setOpen(o => !o)}>
        <span className="text-xs font-mono mt-0.5 w-5 flex-shrink-0 text-muted-foreground">Q{idx + 1}</span>
        <AnswerStatusIcon qa={qa} />
        <div className="text-sm flex-1 line-clamp-2 text-card-foreground"><MathText>{qa.question_text}</MathText></div>
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
          <McqOptionsGrid qa={qa} />
          <NatAnswerComparison qa={qa} />
          <TopperTimeComparison qa={qa} />
        </div>
      )}
    </Card>
  )
})

/* ── Derived summary ── */

function useResultSummary(result) {
  return useMemo(() => {
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

const ResultHeader = memo(function ResultHeader({ result, onDownload }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <Link to="/dashboard" className="flex items-center gap-1.5 text-sm hover:opacity-80 text-muted-foreground">
        <ArrowLeft size={14} /> Dashboard
      </Link>
      <div className="flex items-center gap-3">
        <button onClick={onDownload}
          className="flex items-center gap-1.5 text-sm text-success-text hover:text-success-text">
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

const AttemptBadge = memo(function AttemptBadge({ result }) {
  return (
    <div className={clsx('flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm rounded border',
      result.counts_for_leaderboard ? 'result-attempt-leaderboard' : 'result-attempt-practice')}>
      <Medal size={14} />
      {result.counts_for_leaderboard
        ? `Attempt ${result.attempt_number} · ✓ Counts for leaderboard`
        : `Attempt ${result.attempt_number} · Practice result (download to keep)`}
    </div>
  )
})

const ScoreCard = memo(function ScoreCard({ result, summary }) {
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

const ComparisonStats = memo(function ComparisonStats({ result }) {
  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2 text-card-foreground">
          <TrendingUp size={15} className="text-primary" /> Performance Comparison
        </h3>
        <div className="space-y-2">
          {[
            { label: 'Your Score', val: result.score?.toFixed(1), pct: Math.round(result.percentage), color: 'var(--info-text)' },
            ...(result.topper ? [{ label: `Topper (${result.topper.full_name})`, val: result.topper.score?.toFixed(1), pct: Math.round(result.topper.percentage), color: 'var(--success-text)' }] : []),
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

const AttemptHistory = memo(function AttemptHistory({ attempts, currentAttemptId }) {
  if (attempts.length <= 1) return null
  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="font-semibold mb-3 text-card-foreground">Your Attempts</h3>
        <div className="space-y-2">
          {attempts.map(a => (
            <div key={a.attempt_id} className={clsx('flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 rounded border border-border',
              a.attempt_id === parseInt(currentAttemptId) && 'result-current-attempt')}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground">#{a.attempt_number}</span>
                {a.counts_for_leaderboard
                  ? <Badge className={BADGE_COLORS.sky}>Leaderboard</Badge>
                  : <Badge className={BADGE_COLORS.amber}>Practice</Badge>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-card-foreground">{a.score?.toFixed(1)}/{a.total_marks} ({a.percentage}%)</span>
                {a.attempt_id !== parseInt(currentAttemptId) && (
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

const ResultActions = memo(function ResultActions({ result, onReattempt }) {
  return (
    <div className="flex gap-3">
      <Button asChild variant="ghost" className="flex-1">
        <Link to={`/tests/${result.test_id}/leaderboard`} className="flex items-center justify-center gap-2 text-sm">
          <Trophy size={14} /> Leaderboard
        </Link>
      </Button>
      <Button onClick={onReattempt} disabled={result.attempts_remaining <= 0} className="flex-1 flex items-center justify-center gap-2 text-sm">
        <RotateCcw size={14} />
        Reattempt {result.attempts_remaining > 0 ? `(${result.attempts_remaining} left)` : '(max reached)'}
      </Button>
    </div>
  )
})

const QuestionReviewList = memo(function QuestionReviewList({ items, filter, setFilter, bookmarked, onToggleBookmark }) {
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <h3 className="font-semibold text-foreground">
          Question Review
          <span className="text-xs ml-2 text-muted-foreground">(click bookmark icon)</span>
        </h3>
        <div className="flex flex-wrap gap-1 p-1 rounded bg-card">
          {['all', 'correct', 'incorrect', 'skipped'].map(f => (
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
  correct: (a) => a.is_correct === true,
  incorrect: (a) => a.is_correct === false,
  skipped: (a) => a.is_correct == null,
}

export default function ResultPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')
  const { attemptId, result, bookmarked, attempts, loading, toggleBookmark } = useResultData()

  const reattempt = useCallback(() => {
    if (result.attempts_remaining <= 0) {
      toast.error('Maximum attempts reached for this test')
      return
    }
    navigate(`/tests/${result.test_id}`)
  }, [result, navigate])

  const handleDownload = useCallback(() => {
    downloadResultReport(result)
    toast.success('Result downloaded')
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
