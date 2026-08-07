import { useEffect } from 'react'
import toast from 'react-hot-toast'
import { testAPI } from '../api/api'

export default function useAntiCheat({
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
}) {
  useEffect(() => {
    const handleFsChange = () => {
      if (document.fullscreenElement || !loadedRef.current) return

      const next = fsViolRef.current + 1
      fsViolRef.current = next
      setFsViolations(next)

      if (next >= 3) {
        toast.error('3 fullscreen violations - auto submitting!')
        doSubmitRef.current(true)
        return
      }

      setShowFsWarning(true)
      if (!isPreview) {
        testAPI.updateViolations(testIdRef.current, attemptRef.current?.id, {
          fullscreen_violations: next,
        }).catch(() => {})
      }
    }

    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [attemptRef, doSubmitRef, fsViolRef, isPreview, loadedRef, setFsViolations, setShowFsWarning, testIdRef])

  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden || !loadedRef.current) return

      const next = tabViolRef.current + 1
      tabViolRef.current = next
      setTabViolations(next)

      if (next >= 3) {
        toast.error('3 tab violations - auto submitting!')
        doSubmitRef.current(true)
        return
      }

      toast(`Tab switch detected! Warning ${next}/3`, { duration: 3000 })
      if (!isPreview) {
        testAPI.updateViolations(testIdRef.current, attemptRef.current?.id, {
          tab_violations: next,
        }).catch(() => {})
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [attemptRef, doSubmitRef, isPreview, loadedRef, setTabViolations, tabViolRef, testIdRef])

  useEffect(() => {
    const prevent = event => event.preventDefault()
    const preventKeys = event => {
      if (event.ctrlKey && ['c', 'v', 'a', 'u'].includes(event.key.toLowerCase())) {
        event.preventDefault()
      }
    }

    document.addEventListener('contextmenu', prevent)
    document.addEventListener('copy', prevent)
    document.addEventListener('cut', prevent)
    document.addEventListener('paste', prevent)
    document.addEventListener('keydown', preventKeys)
    return () => {
      document.removeEventListener('contextmenu', prevent)
      document.removeEventListener('copy', prevent)
      document.removeEventListener('cut', prevent)
      document.removeEventListener('paste', prevent)
      document.removeEventListener('keydown', preventKeys)
    }
  }, [])
}
