import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { testAPI } from '../api/api'
import useTestAutosave from './useTestAutosave'
import type { TestAutosaveParams } from './useTestAutosave'

vi.mock('../api/api', () => ({
  testAPI: { saveAnswers: vi.fn() },
}))

const missingTestIds: Array<TestAutosaveParams['testIdRef']['current']> = [undefined, '']
const missingAttemptReferences: Array<TestAutosaveParams['attemptRef']['current']> = [
  null,
  { id: '' },
]

describe('useTestAutosave', () => {
  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('sends an empty answer snapshot and preserves numeric attempt identifier zero', () => {
    vi.useFakeTimers()
    vi.mocked(testAPI.saveAnswers).mockRejectedValue(new Error('network unavailable'))
    const answersRef = { current: {} }
    const timingsRef = { current: {} }
    const attemptRef: TestAutosaveParams['attemptRef'] = { current: { id: 0 } }
    const testIdRef: TestAutosaveParams['testIdRef'] = { current: 7 }

    renderHook(() => useTestAutosave({
      attempt: { id: 3 },
      isPreview: false,
      answersRef,
      timingsRef,
      attemptRef,
      testIdRef,
    }))

    act(() => vi.advanceTimersByTime(30000))

    expect(testAPI.saveAnswers).toHaveBeenCalledExactlyOnceWith(7, 0, [])
  })

  it.each(missingTestIds)('silently skips an autosave when the test identifier is %s', testId => {
    vi.useFakeTimers()
    const testIdRef: TestAutosaveParams['testIdRef'] = { current: testId }

    renderHook(() => useTestAutosave({
      attempt: { id: 0 },
      isPreview: false,
      answersRef: { current: {} },
      timingsRef: { current: {} },
      attemptRef: { current: { id: 0 } },
      testIdRef,
    }))

    act(() => vi.advanceTimersByTime(30000))

    expect(testAPI.saveAnswers).not.toHaveBeenCalled()
  })

  it.each(missingAttemptReferences)('silently skips an autosave when the attempt reference is %s', attempt => {
    vi.useFakeTimers()
    const attemptRef: TestAutosaveParams['attemptRef'] = { current: attempt }

    renderHook(() => useTestAutosave({
      attempt: { id: 3 },
      isPreview: false,
      answersRef: { current: {} },
      timingsRef: { current: {} },
      attemptRef,
      testIdRef: { current: 7 },
    }))

    act(() => vi.advanceTimersByTime(30000))

    expect(testAPI.saveAnswers).not.toHaveBeenCalled()
  })
})
