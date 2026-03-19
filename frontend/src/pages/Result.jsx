import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Layout from '../components/shared/Layout'
import { testAPI, bookmarkAPI } from '../api/api'
import { CheckCircle, XCircle, MinusCircle, ArrowLeft, ChevronDown, ChevronUp, Trophy, RotateCcw, Medal, Bookmark, BookmarkCheck, Clock, TrendingUp } from 'lucide-react'
import Spinner from '../components/shared/Spinner'
import toast from 'react-hot-toast'
import clsx from 'clsx'

function ScoreRing({ pct }) {
  const r = 48, c = 2 * Math.PI * r
  const filled = (pct / 100) * c
  const color = pct >= 75 ? '#51cf66' : pct >= 50 ? '#f59e0b' : '#ff6b6b'
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

function QuestionReview({ qa, idx, bookmarked, onToggleBookmark }) {
  const [open, setOpen] = useState(false)
  const isBookmarked = bookmarked.has(qa.question_id)

  return (
    <div className="gate-card overflow-hidden mb-2">
      <div className="flex items-start gap-3 p-3 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <span className="text-xs font-mono mt-0.5 w-5 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>Q{idx + 1}</span>
        {qa.is_correct === true ? <CheckCircle size={14} className="text-green-400 flex-shrink-0 mt-0.5" /> :
         qa.is_correct === false ? <XCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" /> :
         <MinusCircle size={14} className="text-slate-500 flex-shrink-0 mt-0.5" />}
        <p className="text-sm flex-1 line-clamp-2" style={{ color: 'var(--text)' }}>{qa.question_text}</p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={clsx('text-xs font-mono font-semibold',
            qa.marks_awarded > 0 ? 'text-green-400' : qa.marks_awarded < 0 ? 'text-red-400' : 'text-slate-500')}>
            {qa.marks_awarded > 0 ? '+' : ''}{qa.marks_awarded}
          </span>
          <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
            <Clock size={10} /> {qa.time_spent_seconds}s
          </span>
          <button onClick={e => { e.stopPropagation(); onToggleBookmark(qa.question_id) }}
            className={clsx('p-1 rounded transition-colors', isBookmarked ? 'text-sky-400' : 'text-slate-600 hover:text-sky-400')}>
            {isBookmarked ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
          </button>
          {open ? <ChevronUp size={13} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={13} style={{ color: 'var(--text-muted)' }} />}
        </div>
      </div>

      {open && (
        <div className="px-4 pb-3 border-t space-y-2" style={{ borderColor: 'var(--border)' }}>
          {/* Options */}
          {qa.options?.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5 mt-2">
              {qa.options.map((o, i) => {
                const l = 'ABCD'[i]
                const isCorrect = qa.correct_answer?.includes(l)
                const isSelected = qa.selected_answer?.includes(l)
                const isTopperPick = qa.topper_answer?.includes(l)
                return (
                  <div key={i} className={clsx('px-3 py-2 rounded text-xs',
                    isCorrect ? 'bg-green-500/10 border border-green-500/20 text-green-300' :
                    isSelected ? 'bg-red-500/10 border border-red-500/20 text-red-300' :
                    'border text-slate-400')} style={{ borderColor: 'var(--border)' }}>
                    <span className="font-mono font-semibold mr-1">{l}.</span>{o}
                    {isCorrect && <span className="ml-1 text-green-400">✓</span>}
                    {isSelected && !isCorrect && <span className="ml-1 text-red-400">✗</span>}
                    {isTopperPick && !isSelected && <span className="ml-1 text-amber-400">★ Topper</span>}
                  </div>
                )
              })}
            </div>
          )}
          {qa.question_type === 'nat' && (
            <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
              <div className="px-3 py-2 rounded bg-green-500/10 border border-green-500/20 text-green-300">
                ✓ Correct: <span className="font-mono">{qa.correct_answer}</span>
              </div>
              <div className="px-3 py-2 rounded border text-slate-400" style={{ borderColor: 'var(--border)' }}>
                You: <span className="font-mono">{qa.selected_answer || 'Skipped'}</span>
              </div>
            </div>
          )}
          {/* Topper time comparison */}
          {qa.topper_time_seconds > 0 && (
            <div className="flex items-center gap-4 text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              <span>Your time: <strong>{qa.time_spent_seconds}s</strong></span>
              <span>Topper time: <strong className="text-amber-400">{qa.topper_time_seconds}s</strong></span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ResultPage() {
  const { attemptId } = useParams()
  const navigate = useNavigate()
  const [result, setResult] = useState(null)
  const [attempts, setAttempts] = useState([])
  const [bookmarked, setBookmarked] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    Promise.all([testAPI.getResult(attemptId), bookmarkAPI.getIds()])
      .then(([r, b]) => {
        setResult(r.data)
        setBookmarked(new Set(b.data.ids))
        return testAPI.getMyAttempts(r.data.test_id)
      })
      .then(r => setAttempts(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [attemptId])

  const toggleBookmark = async (qId) => {
    const res = await bookmarkAPI.toggle(qId)
    setBookmarked(prev => {
      const next = new Set(prev)
      res.data.bookmarked ? next.add(qId) : next.delete(qId)
      return next
    })
    toast(res.data.bookmarked ? '🔖 Bookmarked' : 'Bookmark removed', { duration: 1500 })
  }

  const reattempt = () => {
    if (result.attempts_remaining <= 0) {
      toast.error('Maximum attempts reached for this test')
      return
    }
    // Just navigate — TestEngine calls startTest on load
    navigate(`/tests/${result.test_id}`)
  }

  if (loading) return <Layout><div className="flex justify-center py-16"><Spinner size={28} className="text-sky-500" /></div></Layout>
  if (!result) return <Layout><p className="text-center py-16" style={{ color: 'var(--text-muted)' }}>Result not found.</p></Layout>

  const pct = Math.round(result.percentage)
  const grade = pct >= 75 ? 'Excellent' : pct >= 50 ? 'Good' : 'Needs Work'
  const gradeColor = pct >= 75 ? 'text-green-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400'

  const filtered = result.answers.filter(a =>
    filter === 'all' ? true :
    filter === 'correct' ? a.is_correct === true :
    filter === 'incorrect' ? a.is_correct === false :
    a.is_correct === null
  )

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
        <div className="flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-1.5 text-sm hover:opacity-80" style={{ color: 'var(--text-muted)' }}>
            <ArrowLeft size={14} /> Dashboard
          </Link>
          <Link to={`/tests/${result.test_id}/leaderboard`}
            className="flex items-center gap-1.5 text-sm text-sky-400 hover:text-sky-300">
            <Trophy size={13} /> Leaderboard
          </Link>
        </div>

        {/* Attempt badge */}
        <div className={clsx('flex items-center gap-2 px-4 py-2 rounded border text-sm',
          result.counts_for_leaderboard ? 'border-sky-500/20 text-sky-300' : 'border-amber-500/20 text-amber-300')}
          style={{ background: result.counts_for_leaderboard ? 'rgba(14,165,233,0.08)' : 'rgba(245,158,11,0.08)' }}>
          <Medal size={14} />
          {result.counts_for_leaderboard
            ? `Attempt ${result.attempt_number} · ✓ Counts for leaderboard`
            : `Attempt ${result.attempt_number} · Practice attempt (not on leaderboard)`}
        </div>

        {/* Score card */}
        <div className="gate-card p-5">
          <h2 className="font-bold text-lg mb-4" style={{ color: 'var(--text)' }}>
            <Trophy size={16} className="inline text-amber-400 mr-2" />{result.test_title}
          </h2>
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <ScoreRing pct={pct} />
            <div className="flex-1 w-full">
              <p className={`font-bold text-2xl mb-1 ${gradeColor}`}>{grade}</p>
              <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
                {result.score?.toFixed(2)} / {result.total_marks} marks · Rank #{result.rank}/{result.total_participants}
              </p>
              <div className="grid grid-cols-3 gap-2 mt-3">
                {[
                  ['Correct', result.correct, 'text-green-400', 'rgba(81,207,102,0.1)', 'rgba(81,207,102,0.2)'],
                  ['Wrong', result.incorrect, 'text-red-400', 'rgba(255,107,107,0.1)', 'rgba(255,107,107,0.2)'],
                  ['Skipped', result.skipped, 'text-slate-400', 'rgba(100,116,139,0.1)', 'rgba(100,116,139,0.2)'],
                ].map(([label, val, cls, bg, border]) => (
                  <div key={label} className="rounded p-2 text-center" style={{ background: bg, border: `1px solid ${border}` }}>
                    <p className={`text-xl font-bold ${cls}`}>{val}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Comparison stats */}
        <div className="gate-card p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text)' }}>
            <TrendingUp size={15} className="text-sky-400" /> Performance Comparison
          </h3>
          <div className="space-y-2">
            {[
              { label: 'Your Score', val: result.score?.toFixed(1), pct: Math.round(result.percentage), color: '#0ea5e9' },
              { label: 'Average Score', val: result.average_score?.toFixed(1), pct: Math.round(result.average_percentage), color: '#f59e0b' },
              ...(result.topper ? [{ label: `Topper (${result.topper.full_name})`, val: result.topper.score?.toFixed(1), pct: Math.round(result.topper.percentage), color: '#51cf66' }] : []),
            ].map(({ label, val, pct: p, color }) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span className="font-semibold" style={{ color }}>{val} ({p}%)</span>
                </div>
                <div className="h-2 rounded-full" style={{ background: 'var(--border)' }}>
                  <div className="h-2 rounded-full transition-all" style={{ width: `${p}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Attempt history */}
        {attempts.length > 1 && (
          <div className="gate-card p-4">
            <h3 className="font-semibold mb-3" style={{ color: 'var(--text)' }}>Your Attempts</h3>
            <div className="space-y-2">
              {attempts.map(a => (
                <div key={a.attempt_id} className={clsx('flex items-center justify-between px-3 py-2 rounded border',
                  a.attempt_id === parseInt(attemptId) ? 'border-sky-500/30' : '')}
                  style={{ borderColor: a.attempt_id === parseInt(attemptId) ? undefined : 'var(--border)', background: a.attempt_id === parseInt(attemptId) ? 'rgba(14,165,233,0.06)' : 'transparent' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>#{a.attempt_number}</span>
                    {a.counts_for_leaderboard ? <span className="badge badge-blue text-xs">Leaderboard</span> : <span className="badge badge-amber text-xs">Practice</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{a.score?.toFixed(1)}/{a.total_marks} ({a.percentage}%)</span>
                    {a.attempt_id !== parseInt(attemptId) && (
                      <Link to={`/results/${a.attempt_id}`} className="text-xs text-sky-400">View →</Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Link to={`/tests/${result.test_id}/leaderboard`} className="btn-ghost flex-1 flex items-center justify-center gap-2 text-sm">
            <Trophy size={14} /> Leaderboard
          </Link>
          <button onClick={reattempt} disabled={result.attempts_remaining <= 0} className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm">
            <RotateCcw size={14} />
            Reattempt {result.attempts_remaining > 0 ? `(${result.attempts_remaining} left)` : '(max reached)'}
          </button>
        </div>

        {/* Question review */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold" style={{ color: 'var(--text)' }}>
              Question Review
              <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>(click 🔖 to bookmark)</span>
            </h3>
            <div className="flex gap-1 p-1 rounded" style={{ background: 'var(--bg-card)' }}>
              {['all', 'correct', 'incorrect', 'skipped'].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={clsx('px-2.5 py-1 rounded text-xs font-medium capitalize transition-colors',
                    filter === f ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200')}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          {filtered.map((a, idx) => (
            <QuestionReview key={a.question_id} qa={a} idx={result.answers.indexOf(a)}
              bookmarked={bookmarked} onToggleBookmark={toggleBookmark} />
          ))}
          {filtered.length === 0 && <p className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>No questions in this category</p>}
        </div>
      </div>
    </Layout>
  )
}
