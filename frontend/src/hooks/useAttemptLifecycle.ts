import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import axios from 'axios'
import { adminAPI, testAPI } from '../api/api'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { AttemptStart, TestQuestion } from '@/types/api'

export interface AttemptLifecycleParams {
  testId: string | number | undefined
  isPreview: boolean
  navigate: (to: string) => void
  attemptRef: MutableRefObject<AttemptStart | PreviewAttempt | null>
  questionsRef: MutableRefObject<TestQuestion[]>
  answersRef: MutableRefObject<Record<number, string | undefined>>
  timingsRef: MutableRefObject<Record<number, number>>
  loadedRef: MutableRefObject<boolean>
  setQuestions: Dispatch<SetStateAction<TestQuestion[]>>
  setAnswers: Dispatch<SetStateAction<Record<number, string | undefined>>>
  setTimings: Dispatch<SetStateAction<Record<number, number>>>
  setMarked: Dispatch<SetStateAction<Set<number>>>
  setVisited: Dispatch<SetStateAction<Set<number>>>
  setCurrent: Dispatch<SetStateAction<number>>
  setNatInput: (value: string) => void
  setTabViolations: Dispatch<SetStateAction<number>>
  setFsViolations: Dispatch<SetStateAction<number>>
  setShowFsWarning: Dispatch<SetStateAction<boolean>>
  tabViolRef: MutableRefObject<number>
  fsViolRef: MutableRefObject<number>
  setStarted: Dispatch<SetStateAction<boolean>>
}
interface PreviewAttempt {
  id: string
  attempt_number: string
  max_attempts: string
  started_at: string
  server_time: string
  answers?: AttemptStart['answers']
  tab_violations?: number
  fullscreen_violations?: number
}
export type LifecycleAttempt = AttemptStart | PreviewAttempt
export interface AttemptLifecycleResult {
  attempt: LifecycleAttempt | null
  attemptNumber: number | string | null
  maxAttempts: number | string
  starting: boolean
  accepted: boolean
  setAccepted: Dispatch<SetStateAction<boolean>>
  beginTest: () => Promise<void>
}
export default function useAttemptLifecycle({
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
}: AttemptLifecycleParams): AttemptLifecycleResult {
  const [attempt, setAttempt] = useState<LifecycleAttempt | null>(null)
  const [attemptNumber, setAttemptNumber] = useState<number | string | null>(null)
  const [maxAttempts, setMaxAttempts] = useState<number | string>(6)
  const [starting, setStarting] = useState(false)
  const [accepted, setAccepted] = useState(false)

  const beginTest = useCallback(async () => {
    if (testId === undefined || testId === null || testId === '') {
      toast.error('Test identifier is required')
      navigate('/tests')
      return
    }

    if (!accepted || starting) return

    setStarting(true)
    loadedRef.current = false

    try {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen?.()
        }
      } catch {
        // Browsers may reject fullscreen in some environments; show recovery after load.
      }

      let attemptData
      let qData

      if (isPreview) {
        attemptData = {
          id: 'preview',
          attempt_number: 'Preview',
          max_attempts: '∞',
          started_at: new Date().toISOString(),
          server_time: new Date().toISOString(),
        }
        const qRes = await adminAPI.getQuestions(testId)
        qData = qRes.data
      } else {
        const attemptRes = await testAPI.startTest(testId)
        attemptData = attemptRes.data
        const qRes = await testAPI.getQuestions(testId, attemptData.id)
        qData = qRes.data
      }

      setAttempt(attemptData)
      attemptRef.current = attemptData
      setAttemptNumber(attemptData.attempt_number || 1)
      setMaxAttempts(attemptData.max_attempts || 6)

      const restoredAnswers: Record<number, string | undefined> = Object.fromEntries(
        (attemptData.answers || [])
          .filter(answer => answer.selected_answer)
          .map(answer => [answer.question_id, answer.selected_answer ?? undefined])
      )
      const restoredTimings = Object.fromEntries(
        (attemptData.answers || []).map(answer => [
          answer.question_id,
          answer.time_spent_seconds || 0,
        ])
      )

      setQuestions(qData)
      questionsRef.current = qData
      setVisited(new Set([
        ...(qData[0] ? [qData[0].id] : []),
        ...Object.keys(restoredAnswers).map(Number),
      ]))
      setAnswers(restoredAnswers)
      setTimings(restoredTimings)
      setMarked(new Set())
      setCurrent(0)
      setNatInput('')
      setTabViolations(attemptData.tab_violations || 0)
      setFsViolations(attemptData.fullscreen_violations || 0)
      setShowFsWarning(false)
      tabViolRef.current = attemptData.tab_violations || 0
      fsViolRef.current = attemptData.fullscreen_violations || 0
      answersRef.current = restoredAnswers
      timingsRef.current = restoredTimings
      setStarted(true)

      setTimeout(() => {
        loadedRef.current = true
        if (!document.fullscreenElement) {
          setShowFsWarning(true)
        }
      }, 2000)
    } catch (err) {
      console.error('TestEngine beginTest error:', err)
      toast.error(axios.isAxiosError(err) ? err.response?.data?.detail || 'Failed to start test' : 'Failed to start test')
      navigate('/tests')
    } finally {
      setStarting(false)
    }
  }, [
    accepted,
    navigate,
    starting,
    testId,
    isPreview,
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
  ])

  return {
    attempt,
    attemptNumber,
    maxAttempts,
    starting,
    accepted,
    setAccepted,
    beginTest,
  }
}
