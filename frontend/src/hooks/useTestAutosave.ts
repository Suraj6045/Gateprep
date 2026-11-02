import { useEffect, useRef } from 'react'
import { testAPI } from '../api/api'
import type { MutableRefObject } from 'react'
import type { AttemptStart } from '@/types/api'
type AttemptRefValue = { id: string | number }

export interface TestAutosaveParams {
  attempt: AttemptRefValue | null
  isPreview: boolean
  answersRef: MutableRefObject<Record<number, string | undefined>>
  timingsRef: MutableRefObject<Record<number, number>>
  attemptRef: MutableRefObject<AttemptRefValue | null>
  testIdRef: MutableRefObject<string | number | undefined>
}
export interface TestAutosaveResult {
  autoSaveRef: MutableRefObject<ReturnType<typeof setInterval> | null>
}
export default function useTestAutosave({
  attempt,
  isPreview,
  answersRef,
  timingsRef,
  attemptRef,
  testIdRef,
}: TestAutosaveParams): TestAutosaveResult {
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!attempt || isPreview) return
    autoSaveRef.current = setInterval(() => {
      const testId = testIdRef.current
      const attemptId = attemptRef.current?.id
      if (
        testId === undefined || testId === null || testId === '' ||
        attemptId === undefined || attemptId === null || attemptId === ''
      ) return

      const ans = Object.entries(answersRef.current)
        .filter(([, selectedAnswer]) => typeof selectedAnswer === 'string' && selectedAnswer.trim())
        .map(([qid, sel]) => ({
          question_id: +qid,
          selected_answer: sel,
          time_spent_seconds: timingsRef.current[+qid] || 0,
        }))
      testAPI.saveAnswers(testId, attemptId, ans).catch(() => {})
    }, 30000)
    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current)
    }
  }, [attempt, isPreview, answersRef, timingsRef, attemptRef, testIdRef])

  return { autoSaveRef }
}
