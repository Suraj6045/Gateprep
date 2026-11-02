import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import toast from 'react-hot-toast'
import { testAPI } from '../api/api'
import useAntiCheat from './useAntiCheat'
import type { AntiCheatParams } from './useAntiCheat'

vi.mock('../api/api', () => ({
  testAPI: { updateViolations: vi.fn(() => Promise.resolve()) },
}))

vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { error: vi.fn() }),
}))

function createOptions(overrides: Partial<AntiCheatParams> = {}): AntiCheatParams {
  return {
    attemptRef: { current: { id: 3 } },
    doSubmitRef: { current: vi.fn() },
    fsViolRef: { current: 0 },
    isPreview: false,
    loadedRef: { current: true },
    setFsViolations: vi.fn(),
    setShowFsWarning: vi.fn(),
    setTabViolations: vi.fn(),
    tabViolRef: { current: 0 },
    testIdRef: { current: 7 },
    ...overrides,
  }
}

function setDocumentHidden(hidden: boolean): void {
  Object.defineProperty(document, 'hidden', { configurable: true, value: hidden })
}

function dispatchFullscreenExit(): void {
  act(() => {
    document.dispatchEvent(new Event('fullscreenchange'))
    vi.advanceTimersByTime(250)
  })
}

const missingIdentifierCases: Array<[string, Partial<AntiCheatParams>]> = [
  ['test identifier', { testIdRef: { current: undefined } }],
  ['empty test identifier', { testIdRef: { current: '' } }],
  ['attempt identifier', { attemptRef: { current: null } }],
  ['empty attempt identifier', { attemptRef: { current: { id: '' } } }],
]

beforeEach(() => {
  vi.mocked(testAPI.updateViolations).mockRejectedValue(new Error('network unavailable'))
})

afterEach(() => {
  cleanup()
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.clearAllMocks()
  setDocumentHidden(false)
})

describe('useAntiCheat beforeunload warning', () => {
  it('warns before leaving while an attempt is active', () => {
    const { unmount } = renderHook(() => useAntiCheat(createOptions()))
    const event = new Event('beforeunload', { cancelable: true })

    act(() => window.dispatchEvent(event))

    expect(event.defaultPrevented).toBe(true)
    unmount()
  })

  it('does not warn before an attempt has started', () => {
    const { unmount } = renderHook(() => useAntiCheat(createOptions({ attemptRef: { current: null } })))
    const event = new Event('beforeunload', { cancelable: true })

    act(() => window.dispatchEvent(event))

    expect(event.defaultPrevented).toBe(false)
    unmount()
  })
})

describe('useAntiCheat window switching', () => {
  it('counts a fullscreen exit and visibility change as one violation', () => {
    vi.useFakeTimers()
    const options = createOptions()
    const { unmount } = renderHook(() => useAntiCheat(options))

    setDocumentHidden(true)
    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'))
      document.dispatchEvent(new Event('visibilitychange'))
      vi.runAllTimers()
    })

    expect(options.fsViolRef.current).toBe(0)
    expect(options.tabViolRef.current).toBe(1)
    expect(options.setFsViolations).not.toHaveBeenCalled()
    expect(options.setTabViolations).toHaveBeenCalledWith(1)
    expect(testAPI.updateViolations).toHaveBeenCalledExactlyOnceWith(7, 3, { tab_violations: 1 })

    unmount()
  })

  it('still counts a standalone fullscreen exit', () => {
    vi.useFakeTimers()
    const options = createOptions()
    const { unmount } = renderHook(() => useAntiCheat(options))

    dispatchFullscreenExit()

    expect(options.fsViolRef.current).toBe(1)
    expect(options.setFsViolations).toHaveBeenCalledWith(1)
    expect(testAPI.updateViolations).toHaveBeenCalledExactlyOnceWith(7, 3, { fullscreen_violations: 1 })

    unmount()
  })

  it.each(missingIdentifierCases)('silently ignores fullscreen exits when the %s is missing', (_name, overrides) => {
    vi.useFakeTimers()
    const options = createOptions(overrides)
    const { unmount } = renderHook(() => useAntiCheat(options))

    dispatchFullscreenExit()

    expect(testAPI.updateViolations).not.toHaveBeenCalled()
    expect(options.fsViolRef.current).toBe(0)
    expect(options.setFsViolations).not.toHaveBeenCalled()
    expect(options.setShowFsWarning).not.toHaveBeenCalled()
    expect(toast).not.toHaveBeenCalled()

    unmount()
  })

  it('records fullscreen exits when numeric identifiers are zero', () => {
    vi.useFakeTimers()
    const options = createOptions({
      attemptRef: { current: { id: 0 } },
      testIdRef: { current: 0 },
    })
    const { unmount } = renderHook(() => useAntiCheat(options))

    dispatchFullscreenExit()

    expect(testAPI.updateViolations).toHaveBeenCalledExactlyOnceWith(0, 0, { fullscreen_violations: 1 })
    unmount()
  })

  it.each(missingIdentifierCases)('silently ignores visibility changes when the %s is missing', (_name, overrides) => {
    const options = createOptions(overrides)
    const { unmount } = renderHook(() => useAntiCheat(options))
    setDocumentHidden(true)

    act(() => document.dispatchEvent(new Event('visibilitychange')))

    expect(testAPI.updateViolations).not.toHaveBeenCalled()
    expect(options.tabViolRef.current).toBe(0)
    expect(options.setTabViolations).not.toHaveBeenCalled()
    expect(toast).not.toHaveBeenCalled()

    unmount()
  })

  it('records visibility changes with the same setup when both identifiers are present', () => {
    const options = createOptions()
    const { unmount } = renderHook(() => useAntiCheat(options))
    setDocumentHidden(true)

    act(() => document.dispatchEvent(new Event('visibilitychange')))

    expect(testAPI.updateViolations).toHaveBeenCalledExactlyOnceWith(7, 3, { tab_violations: 1 })
    unmount()
  })

  it('records visibility changes when the attempt identifier is zero', () => {
    const options = createOptions({
      attemptRef: { current: { id: 0 } },
    })
    const { unmount } = renderHook(() => useAntiCheat(options))
    setDocumentHidden(true)

    act(() => document.dispatchEvent(new Event('visibilitychange')))

    expect(testAPI.updateViolations).toHaveBeenCalledExactlyOnceWith(7, 0, { tab_violations: 1 })
    unmount()
  })
})

describe('useAntiCheat keyboard restrictions', () => {
  it.each(['c', 'v', 'a', 'u'])('blocks Command+%s shortcuts', key => {
    const { unmount } = renderHook(() => useAntiCheat(createOptions()))
    const event = new KeyboardEvent('keydown', {
      key,
      metaKey: true,
      cancelable: true,
    })

    act(() => document.dispatchEvent(event))

    expect(event.defaultPrevented).toBe(true)
    unmount()
  })

  it('continues to block Ctrl shortcuts', () => {
    const { unmount } = renderHook(() => useAntiCheat(createOptions()))
    const event = new KeyboardEvent('keydown', {
      key: 'c',
      ctrlKey: true,
      cancelable: true,
    })

    act(() => document.dispatchEvent(event))

    expect(event.defaultPrevented).toBe(true)
    unmount()
  })
})
