import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { testAPI } from '../api/api'
import type { MutableRefObject, Dispatch, SetStateAction } from 'react'

type Identifier = string | number | null | undefined

interface ViolationIdentifiers {
  testId: string | number
  attemptId: string | number
}

function getIdentifiers(testId: Identifier, attemptId: Identifier): ViolationIdentifiers | null {
  if (
    testId === undefined || testId === null || testId === '' ||
    attemptId === undefined || attemptId === null || attemptId === ''
  ) {
    return null
  }

  return { testId, attemptId }
}

export interface AntiCheatParams {
  attemptRef: MutableRefObject<{ id: number | string } | null>
  doSubmitRef: MutableRefObject<(auto?: boolean) => void>
  fsViolRef: MutableRefObject<number>
  isPreview: boolean
  loadedRef: MutableRefObject<boolean>
  setFsViolations: Dispatch<SetStateAction<number>>
  setShowFsWarning: Dispatch<SetStateAction<boolean>>
  setTabViolations: Dispatch<SetStateAction<number>>
  tabViolRef: MutableRefObject<number>
  testIdRef: MutableRefObject<string | number | undefined>
}
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
}: AntiCheatParams): void {
  const fullscreenExitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const recordFullscreenViolation = () => {
      fullscreenExitTimeoutRef.current = null
      const identifiers = getIdentifiers(testIdRef.current, attemptRef.current?.id)
      if (!identifiers) return

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
        testAPI.updateViolations(identifiers.testId, identifiers.attemptId, {
          fullscreen_violations: next,
        }).catch(() => {})
      }
    }

    const handleFsChange = () => {
      if (!getIdentifiers(testIdRef.current, attemptRef.current?.id)) return
      if (document.fullscreenElement || !loadedRef.current) return

      if (fullscreenExitTimeoutRef.current) window.clearTimeout(fullscreenExitTimeoutRef.current)
      fullscreenExitTimeoutRef.current = window.setTimeout(recordFullscreenViolation, 250)
    }

    document.addEventListener('fullscreenchange', handleFsChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange)
      if (fullscreenExitTimeoutRef.current) window.clearTimeout(fullscreenExitTimeoutRef.current)
    }
  }, [attemptRef, doSubmitRef, fsViolRef, isPreview, loadedRef, setFsViolations, setShowFsWarning, testIdRef])

  useEffect(() => {
    const handleVisibility = () => {
      const identifiers = getIdentifiers(testIdRef.current, attemptRef.current?.id)
      if (!identifiers) return
      if (!document.hidden || !loadedRef.current) return

      if (fullscreenExitTimeoutRef.current) window.clearTimeout(fullscreenExitTimeoutRef.current)

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
        testAPI.updateViolations(identifiers.testId, identifiers.attemptId, {
          tab_violations: next,
        }).catch(() => {})
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [attemptRef, doSubmitRef, isPreview, loadedRef, setTabViolations, tabViolRef, testIdRef])

  useEffect(() => {
    if (isPreview) return

    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!attemptRef.current) return
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [attemptRef, isPreview])

  useEffect(() => {
    const prevent = (event: Event) => event.preventDefault()
    const preventKeys = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && ['c', 'v', 'a', 'u'].includes(event.key.toLowerCase())) {
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
