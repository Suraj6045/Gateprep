import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { testAPI } from '../api/api'

export default function useTestSubmission({
  isPreview,
  navigate,
  attemptRef,
  answersRef,
  questionsRef,
  timingsRef,
  testIdRef,
  autoSaveRef,
}) {
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const submitLockRef = useRef(false)

  const doSubmitCore = useCallback(async (auto = false) => {
    if (submitLockRef.current) return
    submitLockRef.current = true
    setSubmitting(true)
    clearInterval(autoSaveRef.current)

    try {
      if (document.fullscreenElement) await document.exitFullscreen()
    } catch {}

    if (isPreview) {
      if (auto) toast('Time up! Auto-submitted preview.', { duration: 5000 })
      else toast.success('Preview submitted successfully! (No data saved)')
      submitLockRef.current = false
      setSubmitting(false)
      navigate(`/admin/tests/${testIdRef.current}`)
      return
    }

    const currentAttempt = attemptRef.current
    const currentAnswers = answersRef.current
    const currentQuestions = questionsRef.current
    const currentTimings = timingsRef.current

    if (!currentAttempt) {
      submitLockRef.current = false
      setSubmitting(false)
      return
    }

    try {
      const ans = currentQuestions.map(q => ({
        question_id: q.id,
        selected_answer: currentAnswers[q.id] || null,
        time_spent_seconds: currentTimings[q.id] || 0,
      }))
      const res = await testAPI.submitTest(testIdRef.current, currentAttempt.id, ans)
      if (auto) toast('Time up! Auto-submitted.', { duration: 5000 })
      else toast.success('Test submitted successfully!')

      if (res.data?.persisted === false && res.data?.result) {
        const result = res.data.result
        const resultId = result.client_result_id || result.attempt_id || res.data.id
        sessionStorage.setItem(`practice-result:${resultId}`, JSON.stringify(result))
        navigate(`/results/${resultId}`, { state: { result } })
        return
      }

      navigate(`/results/${res.data.id}`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Submit failed. Please try again.')
      submitLockRef.current = false
      setSubmitting(false)
    }
  }, [isPreview, navigate, attemptRef, answersRef, questionsRef, timingsRef, testIdRef, autoSaveRef])

  const doSubmitRef = useRef(doSubmitCore)
  useEffect(() => { doSubmitRef.current = doSubmitCore }, [doSubmitCore])

  const doSubmit = useCallback((auto = false) => doSubmitRef.current(auto), [])
  const handleTimerExpire = useCallback(() => {
    doSubmitRef.current(true)
  }, [])

  return {
    submitting,
    showConfirm,
    setShowConfirm,
    submitLockRef,
    doSubmit,
    doSubmitRef,
    handleTimerExpire,
  }
}