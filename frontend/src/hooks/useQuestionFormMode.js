import { useState, useCallback } from 'react'

export function useQuestionFormMode() {
  const [mode, setMode] = useState(null)

  const closeMode = useCallback(() => setMode(null), [])
  const openJsonMode = useCallback(() => setMode('json'), [])
  const openManualMode = useCallback(() => setMode('manual'), [])
  const toggleJsonMode = useCallback(() => setMode(current => (current === 'json' ? null : 'json')), [])
  const toggleManualMode = useCallback(() => setMode(current => (current === 'manual' ? null : 'manual')), [])

  return { mode, closeMode, openJsonMode, openManualMode, toggleJsonMode, toggleManualMode }
}
