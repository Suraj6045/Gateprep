import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { adminAPI, testAPI } from '../api/api'

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
}) {
  const [attempt, setAttempt] = useState(null)
  const [attemptNumber, setAttemptNumber] = useState(null)
  const [maxAttempts, setMaxAttempts] = useState(6)
  const [starting, setStarting] = useState(false)
  const [accepted, setAccepted] = useState(false)

  const beginTest = useCallback(async () => {
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

      setQuestions(qData)
      questionsRef.current = qData
      setVisited(qData[0] ? new Set([qData[0].id]) : new Set())
      setAnswers({})
      setTimings({})
      setMarked(new Set())
      setCurrent(0)
      setNatInput('')
      setTabViolations(0)
      setFsViolations(0)
      setShowFsWarning(false)
      tabViolRef.current = 0
      fsViolRef.current = 0
      answersRef.current = {}
      timingsRef.current = {}
      setStarted(true)

      setTimeout(() => {
        loadedRef.current = true
        if (!document.fullscreenElement) {
          setShowFsWarning(true)
        }
      }, 2000)
    } catch (err) {
      console.error('TestEngine beginTest error:', err)
      toast.error(err.response?.data?.detail || 'Failed to start test')
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