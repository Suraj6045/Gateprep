import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { testAPI } from '../api/api'
import toast from 'react-hot-toast'
import { Calculator as CalcIcon, Send, Flag, ChevronLeft, ChevronRight, AlertTriangle, Maximize } from 'lucide-react'
import Spinner from '../components/shared/Spinner'
import Calculator from '../components/test/Calculator'
import clsx from 'clsx'

// ── Format time ───────────────────────────────────────────────────
function formatTime(ms) {
  if (ms === null || ms === undefined || isNaN(ms)) return '--:--:--'
  const totalSecs = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':')
}

// ── Question palette status ───────────────────────────────────────
function getQStatus(qId, currentQId, answers, marked) {
  if (qId === currentQId) return 'current'
  if (marked.has(qId) && answers[qId]) return 'answered-marked'
  if (marked.has(qId)) return 'marked'
  if (answers[qId]) return 'answered'
  return 'not-answered'
}

const STATUS_CLASS = {
  'current':         'q-dot q-dot-answered border-2 border-white',
  'answered':        'q-dot q-dot-answered',
  'not-answered':    'q-dot q-dot-not-answered',
  'not-visited':     'q-dot q-dot-not-visited',
  'marked':          'q-dot q-dot-marked',
  'answered-marked': 'q-dot q-dot-answered-marked',
}

export default function TestEngine() {
  const { testId }  = useParams()
  const navigate    = useNavigate()

  // ── State ──────────────────────────────────────────────────────
  const [test, setTest]         = useState(null)
  const [attempt, setAttempt]   = useState(null)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers]   = useState({})   // { [qId]: string }
  const [timings, setTimings]   = useState({})   // { [qId]: seconds }
  const [marked, setMarked]     = useState(new Set())
  const [visited, setVisited]   = useState(new Set())
  const [current, setCurrent]   = useState(0)
  const [loading, setLoading]   = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showCalc, setShowCalc] = useState(false)
  const [natInput, setNatInput] = useState('')
  const [tabViolations, setTabViolations]   = useState(0)
  const [fsViolations, setFsViolations]     = useState(0)
  const [showFsWarning, setShowFsWarning]   = useState(false)
  const [remaining, setRemaining] = useState(null)
  const [attemptNumber, setAttemptNumber] = useState(null)
  const [maxAttempts, setMaxAttempts]     = useState(6)

  // ── Refs (stable, never cause re-renders) ─────────────────────
  const submitLockRef    = useRef(false)
  const autoSaveRef      = useRef(null)
  const timerRef         = useRef(null)
  const expiredRef       = useRef(false)
  const warnedRef        = useRef(new Set())
  const tabViolRef       = useRef(0)
  const fsViolRef        = useRef(0)
  const attemptRef       = useRef(null)
  const answersRef       = useRef({})
  const questionsRef     = useRef([])
  const timingsRef       = useRef({})
  const testIdRef        = useRef(testId)
  const questionStartRef = useRef(Date.now())
  const loadedRef        = useRef(false) // prevent tab detection on initial load

  // Keep refs in sync with state
  useEffect(() => { attemptRef.current  = attempt }, [attempt])
  useEffect(() => { answersRef.current  = answers }, [answers])
  useEffect(() => { questionsRef.current = questions }, [questions])
  useEffect(() => { timingsRef.current  = timings }, [timings])

  // ── Load test ──────────────────────────────────────────────────
  useEffect(() => {
    ;(async () => {
      try {
        const [testRes, attemptRes] = await Promise.all([
          testAPI.getTest(testId),
          testAPI.startTest(testId)
        ])
        setTest(testRes.data)
        setAttempt(attemptRes.data)
        attemptRef.current = attemptRes.data
        setAttemptNumber(attemptRes.data.attempt_number || 1)
        setMaxAttempts(attemptRes.data.max_attempts || 6)

        const qRes = await testAPI.getQuestions(testId, attemptRes.data.id)
        setQuestions(qRes.data)
        questionsRef.current = qRes.data
        if (qRes.data[0]) setVisited(new Set([qRes.data[0].id]))

        // Timer starts AFTER everything loads (set in state, useEffect will trigger it)
        // Tab detection enabled after 2s delay to prevent false positive on load
        setTimeout(() => { loadedRef.current = true }, 2000)

      } catch (err) {
        toast.error(err.response?.data?.detail || 'Failed to load test')
        navigate('/tests')
      } finally {
        setLoading(false)
      }
    })()

    return () => {
      clearInterval(timerRef.current)
      clearInterval(autoSaveRef.current)
    }
  }, [testId])

  // ── Timer (uses refs only — no dependency on React state) ─────
  const startTimer = useCallback((startedAt, durationMinutes) => {
    if (!startedAt || !durationMinutes) return
    clearInterval(timerRef.current)
    expiredRef.current = false

    // Parse server time — handle all formats FastAPI may return:
    // "2024-01-01T12:00:00" / "2024-01-01T12:00:00Z" / "2024-01-01T12:00:00+00:00"
    let startMs
    try {
      let str = String(startedAt).trim()
      // If no timezone info at all, treat as UTC
      if (!str.endsWith('Z') && !str.includes('+') && !/[0-9]-[0-9]{2}:[0-9]{2}$/.test(str)) {
        str = str + 'Z'
      }
      startMs = new Date(str).getTime()
      if (isNaN(startMs)) throw new Error('Invalid date')
    } catch {
      // Fallback: treat as current time (timer starts fresh)
      startMs = Date.now()
    }
    const endTime = startMs + durationMinutes * 60 * 1000

    const tick = () => {
      const now  = Date.now()
      const left = Math.max(0, endTime - now)
      setRemaining(left)

      // Warning toasts at specific intervals
      const minsLeft = Math.ceil(left / 60000)
      if ([30, 15, 10, 5, 1].includes(minsLeft) && !warnedRef.current.has(minsLeft) && left > 1000) {
        warnedRef.current.add(minsLeft)
        toast(minsLeft === 1 ? '🚨 1 minute remaining!' : `⏰ ${minsLeft} minutes remaining`,
          { duration: 4000 })
      }

      // Expire
      if (left === 0 && !expiredRef.current) {
        expiredRef.current = true
        clearInterval(timerRef.current)
        doSubmitRef.current(true)
      }
    }

    tick()
    timerRef.current = setInterval(tick, 1000)
  }, [])

  // ── Start timer after everything loads ────────────────────────
  useEffect(() => {
    if (!loading && test && attempt && questions.length > 0) {
      startTimer(attempt.started_at, test.duration_minutes)
    }
  }, [loading, test, attempt, questions.length, startTimer])

  // ── Submit (stable ref — never recreated) ─────────────────────
  const doSubmitCore = useCallback(async (auto = false) => {
    if (submitLockRef.current) return
    submitLockRef.current = true
    setSubmitting(true)
    clearInterval(timerRef.current)
    clearInterval(autoSaveRef.current)

    // Exit fullscreen cleanly
    try { if (document.fullscreenElement) await document.exitFullscreen() } catch {}

    const currentAttempt   = attemptRef.current
    const currentAnswers   = answersRef.current
    const currentQuestions = questionsRef.current
    const currentTimings   = timingsRef.current

    if (!currentAttempt) {
      submitLockRef.current = false
      setSubmitting(false)
      return
    }

    try {
      const ans = currentQuestions.map(q => ({
        question_id: q.id,
        selected_answer: currentAnswers[q.id] || null,
        time_spent_seconds: currentTimings[q.id] || 0
      }))
      const res = await testAPI.submitTest(testIdRef.current, currentAttempt.id, ans)
      if (auto) toast('⏰ Time up! Auto-submitted.', { duration: 5000 })
      else toast.success('Test submitted successfully!')
      navigate(`/results/${res.data.id}`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Submit failed. Please try again.')
      submitLockRef.current = false
      setSubmitting(false)
    }
  }, [navigate])

  // Keep a stable ref to doSubmit so timer/violations can always call latest version
  const doSubmitRef = useRef(doSubmitCore)
  useEffect(() => { doSubmitRef.current = doSubmitCore }, [doSubmitCore])

  // Public doSubmit for UI buttons
  const doSubmit = useCallback((auto = false) => doSubmitRef.current(auto), [])

  // ── Enter fullscreen on load ───────────────────────────────────
  useEffect(() => {
    if (!loading && questions.length > 0) {
      setTimeout(() => {
        document.documentElement.requestFullscreen?.().catch(() => {})
      }, 500)
    }
  }, [loading, questions.length])

  // ── Fullscreen exit detection ──────────────────────────────────
  useEffect(() => {
    const handleFsChange = () => {
      // Only detect AFTER initial fullscreen enter
      if (!document.fullscreenElement && loadedRef.current) {
        const next = fsViolRef.current + 1
        fsViolRef.current = next
        setFsViolations(next)

        if (next >= 3) {
          toast.error('3 fullscreen violations — auto submitting!')
          doSubmitRef.current(true)
        } else {
          setShowFsWarning(true)
          testAPI.updateViolations(testIdRef.current, attemptRef.current?.id, {
            fullscreen_violations: next
          }).catch(() => {})
        }
      }
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  // ── Tab/window visibility detection ───────────────────────────
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && loadedRef.current) {
        const next = tabViolRef.current + 1
        tabViolRef.current = next
        setTabViolations(next)

        if (next >= 3) {
          toast.error('3 tab violations — auto submitting!')
          doSubmitRef.current(true)
        } else {
          toast(`⚠️ Tab switch detected! Warning ${next}/3`, { duration: 3000 })
          testAPI.updateViolations(testIdRef.current, attemptRef.current?.id, {
            tab_violations: next
          }).catch(() => {})
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  // ── Disable right-click and copy/paste ────────────────────────
  useEffect(() => {
    const prevent = e => e.preventDefault()
    const preventKeys = e => {
      if (e.ctrlKey && ['c', 'v', 'a', 'u'].includes(e.key.toLowerCase())) e.preventDefault()
    }
    document.addEventListener('contextmenu', prevent)
    document.addEventListener('keydown', preventKeys)
    return () => {
      document.removeEventListener('contextmenu', prevent)
      document.removeEventListener('keydown', preventKeys)
    }
  }, [])

  // ── Track time per question ────────────────────────────────────
  useEffect(() => {
    const q = questions[current]
    if (!q) return
    questionStartRef.current = Date.now()
    return () => {
      const elapsed = Math.floor((Date.now() - questionStartRef.current) / 1000)
      if (elapsed > 0) {
        setTimings(t => {
          const updated = { ...t, [q.id]: (t[q.id] || 0) + elapsed }
          timingsRef.current = updated
          return updated
        })
      }
    }
  }, [current, questions])

  // ── Visit tracking ─────────────────────────────────────────────
  useEffect(() => {
    const q = questions[current]
    if (q) setVisited(v => new Set([...v, q.id]))
  }, [current, questions])

  // ── Sync NAT input ─────────────────────────────────────────────
  useEffect(() => {
    const q = questions[current]
    if (q?.question_type === 'nat') setNatInput(answers[q.id] || '')
  }, [current, questions])

  // ── Auto-save every 30s ────────────────────────────────────────
  useEffect(() => {
    if (!attempt) return
    autoSaveRef.current = setInterval(() => {
      const ans = Object.entries(answersRef.current).map(([qid, sel]) => ({
        question_id: +qid,
        selected_answer: sel,
        time_spent_seconds: timingsRef.current[+qid] || 0
      }))
      if (ans.length > 0) {
        testAPI.saveAnswers(testIdRef.current, attemptRef.current?.id, ans).catch(() => {})
      }
    }, 30000)
    return () => clearInterval(autoSaveRef.current)
  }, [attempt])

  // ── Answer handlers ────────────────────────────────────────────
  const q = questions[current]

  const setMCQ = (letter) => {
    if (!q) return
    setAnswers(a => {
      const updated = { ...a, [q.id]: a[q.id] === letter ? undefined : letter }
      answersRef.current = updated
      return updated
    })
  }

  const toggleMSQ = (letter) => {
    if (!q) return
    setAnswers(a => {
      const cur  = (a[q.id] || '').split(',').filter(Boolean)
      const next = cur.includes(letter) ? cur.filter(l => l !== letter) : [...cur, letter].sort()
      const updated = { ...a, [q.id]: next.join(',') || undefined }
      answersRef.current = updated
      return updated
    })
  }

  const commitNAT = () => {
    if (!q) return
    setAnswers(a => {
      const updated = { ...a, [q.id]: natInput.trim() || undefined }
      answersRef.current = updated
      return updated
    })
  }

  const saveAndNext = () => {
    if (q?.question_type === 'nat') commitNAT()
    if (current < questions.length - 1) setCurrent(c => c + 1)
  }

  const markAndNext = () => {
    setMarked(m => { const n = new Set(m); n.has(q.id) ? n.delete(q.id) : n.add(q.id); return n })
    if (current < questions.length - 1) setCurrent(c => c + 1)
  }

  const clearResponse = () => {
    setAnswers(a => {
      const n = { ...a }
      delete n[q.id]
      answersRef.current = n
      return n
    })
    setNatInput('')
  }

  // ── Derived values ─────────────────────────────────────────────
  const subjects    = [...new Set(questions.map(q => q.subject || 'General'))]
  const answered    = Object.values(answers).filter(Boolean).length
  const notAnswered = questions.length - answered
  const isLow       = remaining !== null && remaining < 5 * 60 * 1000
  const totalViol   = tabViolations + fsViolations

  // ── Loading state ──────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <Spinner size={36} className="text-sky-500" />
    </div>
  )
  if (!q) return null

  return (
    <div className="h-screen flex flex-col overflow-hidden select-none"
         style={{ background: 'var(--bg)' }}
         onCopy={e => e.preventDefault()}
         onCut={e => e.preventDefault()}>

      {/* ── Fullscreen warning overlay ─────────────────────────── */}
      {showFsWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center"
             style={{ background: 'rgba(0,0,0,0.96)' }}>
          <div className="text-center max-w-sm p-8 rounded-xl border border-red-500/40"
               style={{ background: 'var(--bg-card)' }}>
            <AlertTriangle size={44} className="text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">You exited fullscreen!</h2>
            <p className="text-slate-400 text-sm mb-1">The timer is still running.</p>
            <p className="text-red-400 font-semibold mb-1">Violation {fsViolations}/3</p>
            <p className="text-slate-500 text-xs mb-5">3 violations = test auto-submitted</p>
            <div className={clsx('text-3xl font-mono font-bold mb-6', isLow ? 'text-red-400 timer-critical' : 'text-white')}>
              {formatTime(remaining)}
            </div>
            <div className="space-y-3">
              <button
                onClick={() => {
                  document.documentElement.requestFullscreen?.()
                    .then(() => setShowFsWarning(false))
                    .catch(() => setShowFsWarning(false))
                }}
                className="btn-primary w-full flex items-center justify-center gap-2">
                <Maximize size={16} /> Return to Fullscreen
              </button>
              <button onClick={() => { setShowFsWarning(false); setShowConfirm(true) }}
                className="btn-danger w-full">
                Submit Test Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Top bar ────────────────────────────────────────────── */}
      <div className="flex items-center px-4 h-12 border-b flex-shrink-0"
           style={{ background: 'var(--header-bg)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 mr-3 flex-shrink-0">
          <div className="w-6 h-6 rounded bg-sky-600 flex items-center justify-center">
            <span className="text-white font-bold text-xs">G</span>
          </div>
          <span className="text-white text-sm font-semibold hidden md:block truncate max-w-[160px]">
            {test?.title}
          </span>
        </div>

        {/* Subject tabs */}
        <div className="flex items-center gap-0 flex-1 overflow-x-auto scrollbar-hide">
          {subjects.map(subj => (
            <button key={subj}
              onClick={() => {
                const idx = questions.findIndex(q2 => (q2.subject || 'General') === subj)
                if (idx >= 0) setCurrent(idx)
              }}
              className={clsx('subject-tab text-xs', (q.subject || 'General') === subj && 'active')}>
              {subj}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {/* Attempt count */}
          {attemptNumber && (
            <span className="text-xs font-medium hidden sm:block"
                  style={{ color: 'var(--text-muted)' }}>
              Attempt {attemptNumber}/{maxAttempts}
            </span>
          )}

          {/* Violations badge */}
          {totalViol > 0 && (
            <span className="text-xs font-medium text-red-400 hidden sm:block">
              ⚠️ {totalViol}/3
            </span>
          )}

          {/* Calculator toggle */}
          <button onClick={() => setShowCalc(s => !s)}
            className={clsx(
              'flex items-center gap-1 px-2 py-1 rounded text-xs border transition-colors',
              showCalc
                ? 'bg-sky-600 border-sky-500 text-white'
                : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
            )}>
            <CalcIcon size={13} /> Calc
          </button>

          {/* Timer */}
          <div className={clsx(
            'flex items-center gap-1.5 px-3 py-1 rounded font-mono font-bold text-sm border',
            isLow
              ? 'bg-red-500/20 border-red-500/50 text-red-400 timer-critical'
              : 'bg-slate-800 border-slate-700 text-slate-200'
          )}>
            {formatTime(remaining)}
          </div>

          {/* Submit button */}
          <button onClick={() => setShowConfirm(true)} disabled={submitting}
            className="flex items-center gap-1 px-3 py-1 rounded bg-sky-700 hover:bg-sky-600 text-white text-xs font-medium transition-colors disabled:opacity-50">
            {submitting ? <Spinner size={12} /> : <Send size={12} />} Submit
          </button>
        </div>
      </div>

      {/* ── Question type info bar ─────────────────────────────── */}
      <div className="px-4 py-1.5 text-xs border-b flex items-center gap-4 flex-shrink-0"
           style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <span style={{ color: 'var(--text-muted)' }}>
          Question Type:{' '}
          <strong style={{ color: 'var(--text)' }}>
            {q.question_type === 'mcq' ? 'MCQ Single' : q.question_type === 'msq' ? 'MSQ Multiple' : 'NAT Numerical'}
          </strong>
        </span>
        <span style={{ color: 'var(--text-muted)' }}>
          Marks: <strong className="text-green-400">+{q.marks}</strong>
          {q.negative_marks > 0 && <span className="text-red-400 ml-1">/ -{q.negative_marks}</span>}
        </span>
      </div>

      {/* ── Main content ───────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Question panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
              Question No. {current + 1}
            </p>

            {/* Question text */}
            <div className="mb-4">
              <p className="leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text)' }}>
                {q.question_text}
              </p>
              {q.question_image_url && (
                <img src={q.question_image_url} alt="question"
                     className="mt-3 max-w-full max-h-64 rounded cursor-pointer border"
                     style={{ borderColor: 'var(--border)' }}
                     onClick={() => window.open(q.question_image_url, '_blank')} />
              )}
            </div>

            {/* MCQ */}
            {q.question_type === 'mcq' && (
              <div className="space-y-2">
                {q.options.map((opt, i) => {
                  const letter = 'ABCD'[i]
                  const sel = answers[q.id] === letter
                  return (
                    <div key={i} onClick={() => setMCQ(letter)}
                         className={clsx('q-option cursor-pointer', sel && 'selected')}>
                      <div className={clsx(
                        'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
                        sel ? 'border-sky-500 bg-sky-500' : 'border-slate-500'
                      )}>
                        {sel && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <div className="flex-1">
                        <span className="text-xs font-semibold mr-2" style={{ color: 'var(--text-muted)' }}>
                          {letter}.
                        </span>
                        <span className="text-sm" style={{ color: 'var(--text)' }}>{opt}</span>
                        {q.option_images?.[letter] && (
                          <img src={q.option_images[letter]} alt={`option ${letter}`}
                               className="mt-2 max-h-32 rounded cursor-pointer"
                               onClick={e => { e.stopPropagation(); window.open(q.option_images[letter], '_blank') }} />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* MSQ */}
            {q.question_type === 'msq' && (
              <div className="space-y-2">
                <p className="text-xs text-amber-400 mb-2">⚠️ One or more correct answers. No negative marking.</p>
                {q.options.map((opt, i) => {
                  const letter = 'ABCD'[i]
                  const sel = (answers[q.id] || '').split(',').includes(letter)
                  return (
                    <div key={i} onClick={() => toggleMSQ(letter)}
                         className={clsx('q-option cursor-pointer', sel && 'selected-msq')}>
                      <div className={clsx(
                        'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
                        sel ? 'border-amber-500 bg-amber-500' : 'border-slate-500'
                      )}>
                        {sel && <span className="text-white text-xs font-bold">✓</span>}
                      </div>
                      <span className="text-xs font-semibold mr-2" style={{ color: 'var(--text-muted)' }}>
                        {letter}.
                      </span>
                      <span className="text-sm" style={{ color: 'var(--text)' }}>{opt}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* NAT */}
            {q.question_type === 'nat' && (
              <div>
                <p className="text-xs text-green-400 mb-3">📊 Enter numerical answer. No negative marking.</p>
                <div className="flex gap-3 items-center max-w-xs">
                  <input type="number" step="any"
                    className="input font-mono text-lg flex-1"
                    value={natInput}
                    onChange={e => setNatInput(e.target.value)}
                    onBlur={commitNAT}
                    placeholder="Enter answer..."
                  />
                  <button onClick={commitNAT} className="btn-primary px-4">Save</button>
                </div>
                {answers[q.id] && (
                  <p className="text-green-400 text-sm mt-2">
                    ✓ Saved: <span className="font-mono font-semibold">{answers[q.id]}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Bottom action bar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t flex-shrink-0"
               style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <button onClick={markAndNext}
                className="flex items-center gap-1.5 px-3 py-2 rounded border text-xs font-medium"
                style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)', color: 'var(--text)' }}>
                <Flag size={12} className="text-purple-400" /> Mark & Next
              </button>
              <button onClick={clearResponse}
                className="px-3 py-2 rounded border text-xs font-medium"
                style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)', color: 'var(--text)' }}>
                Clear
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => current > 0 && setCurrent(c => c - 1)} disabled={current === 0}
                className="flex items-center gap-1 px-3 py-2 rounded border text-xs font-medium disabled:opacity-40"
                style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)', color: 'var(--text)' }}>
                <ChevronLeft size={13} /> Prev
              </button>
              <button onClick={saveAndNext}
                className="flex items-center gap-1 px-4 py-2 rounded text-xs font-semibold bg-sky-700 hover:bg-sky-600 text-white transition-colors">
                Save & Next <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Right sidebar - Question palette */}
        <div className="w-52 border-l flex flex-col flex-shrink-0 overflow-y-auto"
             style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--border)' }}>
          <div className="p-3 border-b text-center" style={{ borderColor: 'var(--border)' }}>
            <div className="w-9 h-9 rounded-full bg-sky-700 flex items-center justify-center mx-auto mb-1">
              <span className="text-white font-bold text-sm">U</span>
            </div>
          </div>

          {/* Legend */}
          <div className="p-2 border-b space-y-1.5" style={{ borderColor: 'var(--border)' }}>
            {[
              ['q-dot-answered',     `Answered (${answered})`],
              ['q-dot-not-answered', `Not Answered (${notAnswered})`],
              ['q-dot-not-visited',  `Not Visited (${questions.length - visited.size})`],
              ['q-dot-marked',       `Marked (${marked.size})`],
            ].map(([cls, label]) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`q-dot w-6 h-6 text-[9px] ${cls}`} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Subject sections */}
          {subjects.map(subj => {
            const subjQs = questions.filter(q2 => (q2.subject || 'General') === subj)
            return (
              <div key={subj} className="p-2 border-b" style={{ borderColor: 'var(--border)' }}>
                <p className="text-xs font-semibold mb-2 truncate" style={{ color: 'var(--text)' }}>{subj}</p>
                <div className="grid grid-cols-5 gap-1">
                  {subjQs.map(q2 => {
                    const qIdx = questions.indexOf(q2)
                    const isCur = q2.id === q?.id
                    const status = isCur ? 'current'
                      : !visited.has(q2.id) ? 'not-visited'
                      : getQStatus(q2.id, q?.id, answers, marked)
                    return (
                      <button key={q2.id} onClick={() => setCurrent(qIdx)}
                        className={STATUS_CLASS[status] || STATUS_CLASS['not-visited']}>
                        {qIdx + 1}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}

          <div className="p-2 mt-auto">
            <button onClick={() => setShowConfirm(true)} disabled={submitting}
              className="btn-primary w-full flex items-center justify-center gap-1.5 text-xs py-2">
              {submitting ? <Spinner size={12} /> : <Send size={12} />} Submit Test
            </button>
          </div>
        </div>
      </div>

      {/* Calculator popup */}
      {showCalc && <Calculator onClose={() => setShowCalc(false)} />}

      {/* Confirm submit modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="w-full max-w-sm p-6 rounded-xl animate-slide-up"
               style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={22} className="text-amber-400" />
              <h3 className="font-bold text-lg" style={{ color: 'var(--text)' }}>Submit Test?</h3>
            </div>
            <div className="space-y-1.5 mb-5 text-sm">
              {[
                ['Total Questions', questions.length, 'var(--text)'],
                ['Answered',        answered,         '#51cf66'],
                ['Not Answered',    notAnswered,      '#ff6b6b'],
                ['Marked',          marked.size,      '#845ef7'],
              ].map(([label, val, color]) => (
                <div key={label} className="flex justify-between py-1.5 border-b"
                     style={{ borderColor: 'var(--border)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span className="font-semibold" style={{ color }}>{val}</span>
                </div>
              ))}
            </div>
            <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>
              This cannot be undone. Your answers will be evaluated.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="btn-ghost flex-1">Go Back</button>
              <button onClick={() => { setShowConfirm(false); doSubmit(false) }} disabled={submitting}
                className="btn-primary flex-1 flex items-center justify-center gap-2">
                {submitting && <Spinner size={13} />} Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
