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
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { TestDetail, TestQuestion, AttemptStart } from '@/types/api'
import type { AttemptLifecycleResult, LifecycleAttempt } from './useAttemptLifecycle'
import type { TestAnswerStateResult } from './useTestAnswerState'
import type { TestProgressResult } from './useTestProgress'
import type { TestSubmissionResult } from './useTestSubmission'
import type { TestLoaderResult } from './useTestLoader'

export interface TestEngineResult {
  accepted: boolean
  answered: number
  answers: Record<number, string | undefined>
  attemptNumber: number | string | null
  beginTest: () => Promise<void>
  clearResponse: () => void
  commitNAT: () => void
  current: number
  currentQuestion: TestQuestion | undefined
  doSubmit: (auto?: boolean) => void
  endTimeMs: number | null
  fsViolations: number
  handleTimerExpire: () => void
  loading: boolean
  markAndNext: () => void
  marked: Set<number>
  maxAttempts: number | string
  natInput: string
  updateNatInput: (value: string) => void
  navigate: (to: string) => void
  notAnswered: number
  questions: TestQuestion[]
  saveAndNext: () => void
  setAccepted: Dispatch<SetStateAction<boolean>>
  setCurrent: Dispatch<SetStateAction<number>>
  setNatInput: (value: string) => void
  setShowCalc: Dispatch<SetStateAction<boolean>>
  setShowConfirm: Dispatch<SetStateAction<boolean>>
  setShowFsWarning: Dispatch<SetStateAction<boolean>>
  setShowPalette: Dispatch<SetStateAction<boolean>>
  setMCQ: (letter: string) => void
  showCalc: boolean
  showConfirm: boolean
  showFsWarning: boolean
  showPalette: boolean
  started: boolean
  starting: boolean
  questionGroups: TestProgressResult['questionGroups']
  subjects: string[]
  submitting: boolean
  tabViolations: number
  test: TestDetail | null
  toggleMSQ: (letter: string) => void
  totalViolations: number
  visited: Set<number>
}

export default function useTestEngine(): TestEngineResult {
  const { testId } = useParams<{ testId: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isPreview = searchParams.get('preview') === 'true'

  // --- shared refs (owned by orchestrator, passed to sub-hooks) ---
  const submitLockRef = useRef(false)
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tabViolRef = useRef(0)
  const fsViolRef = useRef(0)
  const attemptRef = useRef<LifecycleAttempt | null>(null)
  const answersRef = useRef<Record<number, string | undefined>>({})
  const questionsRef = useRef<TestQuestion[]>([])
  const timingsRef = useRef<Record<number, number>>({})
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
  const [questions, setQuestions] = useState<TestQuestion[]>([])
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
    updateNatInput,
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
    commitNAT,
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
    () => getEndTimeMs(
      attempt?.started_at,
      test?.duration_minutes,
      attempt?.server_time
    ),
    [attempt?.started_at, attempt?.server_time, test?.duration_minutes]
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
    updateNatInput,
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
