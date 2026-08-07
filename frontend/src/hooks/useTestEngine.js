import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getEndTimeMs } from '../utils/testEngineUtils'
import useAntiCheat from './useAntiCheat'
import useTestLoader from './useTestLoader'
import useTestAnswerState from './useTestAnswerState'
import useTestProgress from './useTestProgress'
import useTestAutosave from './useTestAutosave'
import useAttemptLifecycle from './useAttemptLifecycle'
import useTestSubmission from './useTestSubmission'

export default function useTestEngine() {
  const { testId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isPreview = searchParams.get('preview') === 'true'

  // --- shared refs (owned by orchestrator, passed to sub-hooks) ---
  const submitLockRef = useRef(false)
  const autoSaveRef = useRef(null)
  const tabViolRef = useRef(0)
  const fsViolRef = useRef(0)
  const attemptRef = useRef(null)
  const answersRef = useRef({})
  const questionsRef = useRef([])
  const timingsRef = useRef({})
  const testIdRef = useRef(testId)
  const loadedRef = useRef(false)

  // --- UI flags (kept in orchestrator — lightweight) ---
  const [showCalc, setShowCalc] = useState(false)
  const [showPalette, setShowPalette] = useState(false)
  const [showFsWarning, setShowFsWarning] = useState(false)
  const [tabViolations, setTabViolations] = useState(0)
  const [fsViolations, setFsViolations] = useState(0)
  const [started, setStarted] = useState(false)

  // --- shared state: questions + current (needed by multiple hooks) ---
  const [questions, setQuestions] = useState([])
  const [current, setCurrent] = useState(0)

  // --- test loading ---
  const { test, loading } = useTestLoader({ testId, navigate })

  // --- answer state ---
  const answerState = useTestAnswerState({
    current,
    questions,
    currentQuestion: questions[current],
    answersRef,
    timingsRef,
  })

  const {
    answers,
    setAnswers,
    timings,
    setTimings,
    marked,
    setMarked,
    visited,
    setVisited,
    natInput,
    setNatInput,
    setMCQ,
    toggleMSQ,
    commitNAT,
    clearResponse,
  } = answerState

  // --- progress + navigation ---
  const progress = useTestProgress({
    questions,
    answers,
    current,
    currentQuestion: questions[current],
    setCurrent,
    commitNAT,
    setMarked,
    setVisited,
  })

  const { saveAndNext, markAndNext, questionGroups, subjects, answered, notAnswered } = progress

  // --- attempt lifecycle ---
  const attemptSub = useAttemptLifecycle({
    testId,
    isPreview,
    navigate,
    attemptRef,
    questionsRef,
    answersRef,
    timingsRef,
    loadedRef,
    setQuestions,
    setAnswers,
    setTimings,
    setMarked,
    setVisited,
    setCurrent,
    setNatInput,
    setTabViolations,
    setFsViolations,
    setShowFsWarning,
    tabViolRef,
    fsViolRef,
    setStarted,
  })

  const { attempt, attemptNumber, maxAttempts, starting, accepted, setAccepted, beginTest } = attemptSub

  // --- sync refs with live state ---
  useEffect(() => { testIdRef.current = testId }, [testId])
  useEffect(() => { attemptRef.current = attempt }, [attempt])
  useEffect(() => { answersRef.current = answers }, [answers])
  useEffect(() => { questionsRef.current = questions }, [questions])
  useEffect(() => { timingsRef.current = timings }, [timings])

  // --- autosave ---
  const { autoSaveRef: autoSaveHookRef } = useTestAutosave({
    attempt,
    isPreview,
    answersRef,
    timingsRef,
    attemptRef,
    testIdRef,
  })

  useEffect(() => { autoSaveRef.current = autoSaveHookRef.current }, [autoSaveHookRef])

  // --- submission ---
  const submission = useTestSubmission({
    isPreview,
    navigate,
    attemptRef,
    answersRef,
    questionsRef,
    timingsRef,
    testIdRef,
    autoSaveRef,
  })

  const {
    submitting,
    showConfirm,
    setShowConfirm,
    doSubmit,
    doSubmitRef,
    handleTimerExpire,
  } = submission

  useEffect(() => { submitLockRef.current = submission.submitLockRef.current }, [submission.submitLockRef])

  // --- anti-cheat ---
  useAntiCheat({
    attemptRef,
    doSubmitRef,
    fsViolRef,
    isPreview,
    loadedRef,
    setFsViolations,
    setShowFsWarning,
    setTabViolations,
    tabViolRef,
    testIdRef,
  })

  // --- derived ---
  const totalViolations = tabViolations + fsViolations
  const endTimeMs = useMemo(
    () => getEndTimeMs(attempt?.started_at, test?.duration_minutes),
    [attempt?.started_at, test?.duration_minutes]
  )

  // --- return: exact same shape as before ---
  return {
    accepted,
    answered,
    answers,
    attemptNumber,
    beginTest,
    clearResponse,
    commitNAT,
    current,
    currentQuestion: questions[current],
    doSubmit,
    endTimeMs,
    fsViolations,
    handleTimerExpire,
    loading,
    markAndNext,
    marked,
    maxAttempts,
    natInput,
    navigate,
    notAnswered,
    questions,
    saveAndNext,
    setAccepted,
    setCurrent,
    setNatInput,
    setShowCalc,
    setShowConfirm,
    setShowFsWarning,
    setShowPalette,
    setMCQ,
    showCalc,
    showConfirm,
    showFsWarning,
    showPalette,
    started,
    starting,
    questionGroups,
    subjects,
    submitting,
    tabViolations,
    test,
    toggleMSQ,
    totalViolations,
    visited,
  }
}