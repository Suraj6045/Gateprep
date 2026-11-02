import { useState, useCallback } from 'react'

export type QuestionFormMode = 'json' | 'manual' | null
export interface QuestionFormModeParams {}
export interface QuestionFormModeResult {
  mode: QuestionFormMode
  closeMode: () => void
  openJsonMode: () => void
  openManualMode: () => void
  toggleJsonMode: () => void
  toggleManualMode: () => void
}

export function useQuestionFormMode(_params?: QuestionFormModeParams): QuestionFormModeResult {
  const [mode, setMode] = useState<QuestionFormMode>(null)

  const closeMode = useCallback(() => setMode(null), [])
  const openJsonMode = useCallback(() => setMode('json'), [])
  const openManualMode = useCallback(() => setMode('manual'), [])
  const toggleJsonMode = useCallback(() => setMode(current => (current === 'json' ? null : 'json')), [])
  const toggleManualMode = useCallback(() => setMode(current => (current === 'manual' ? null : 'manual')), [])

  return { mode, closeMode, openJsonMode, openManualMode, toggleJsonMode, toggleManualMode }
}
