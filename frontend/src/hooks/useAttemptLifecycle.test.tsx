import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { adminAPI, testAPI } from '../api/api'
import useAttemptLifecycle from './useAttemptLifecycle'
import type { AttemptLifecycleParams } from './useAttemptLifecycle'
import { AxiosHeaders } from 'axios'
import type { ApiResponse, AttemptStart, TestQuestion } from '@/types/api'
import toast from 'react-hot-toast'

vi.mock('../api/api', () => ({
  adminAPI: { getQuestions: vi.fn() },
  testAPI: {
    startTest: vi.fn(),
    getQuestions: vi.fn(),
  },
}))

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn() },
}))

function apiResponse<T>(data: T): ApiResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: new AxiosHeaders() },
  }
}

function createOptions(testId: AttemptLifecycleParams['testId']): AttemptLifecycleParams {
  return {
    testId,
    isPreview: false,
    navigate: vi.fn(),
    attemptRef: { current: null },
    questionsRef: { current: [] },
    answersRef: { current: {} },
    timingsRef: { current: {} },
    loadedRef: { current: false },
    setQuestions: vi.fn(),
    setAnswers: vi.fn(),
    setTimings: vi.fn(),
    setMarked: vi.fn(),
    setVisited: vi.fn(),
    setCurrent: vi.fn(),
    setNatInput: vi.fn(),
    setTabViolations: vi.fn(),
    setFsViolations: vi.fn(),
    setShowFsWarning: vi.fn(),
    tabViolRef: { current: 0 },
    fsViolRef: { current: 0 },
    setStarted: vi.fn(),
  }
}

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('useAttemptLifecycle resume', () => {
  it('restores autosaved answers, timings, and violations from the active attempt', async () => {
    vi.useFakeTimers()
    const attemptRef: AttemptLifecycleParams['attemptRef'] = { current: null }
    const answersRef = { current: {} }
    const timingsRef = { current: {} }
    const qData: TestQuestion[] = [{
      id: 5,
      question_type: 'nat',
      question_text: 'NAT',
      question_image_url: null,
      options: [],
      option_images: null,
      order_index: 0,
      marks: 1,
      negative_marks: 0,
      subject: null,
      topic: null,
    }]
    const attemptData: AttemptStart = {
      id: 20,
      test_id: 7,
      status: 'in_progress',
      started_at: '2026-01-01T10:00:00Z',
      submitted_at: null,
      score: null,
      total_marks: null,
      tab_violations: 1,
      fullscreen_violations: 2,
      server_time: '2026-01-01T10:00:00Z',
      answers: [{ question_id: 5, selected_answer: '123.5', time_spent_seconds: 48 }],
      attempt_number: 2,
      max_attempts: 6,
    }
    vi.mocked(testAPI.startTest).mockResolvedValueOnce(apiResponse(attemptData))
    vi.mocked(testAPI.getQuestions).mockResolvedValueOnce(apiResponse(qData))

    const options = {
      ...createOptions(7),
      attemptRef,
      answersRef,
      timingsRef,
    }
    const { result } = renderHook(() => useAttemptLifecycle(options))

    act(() => result.current.setAccepted(true))
    await act(async () => result.current.beginTest())

    expect(attemptRef.current?.id).toBe(20)
    expect(answersRef.current).toEqual({ 5: '123.5' })
    expect(timingsRef.current).toEqual({ 5: 48 })
    expect(testAPI.startTest).toHaveBeenCalledExactlyOnceWith(7)
    expect(testAPI.getQuestions).toHaveBeenCalledExactlyOnceWith(7, 20)
  })
})

describe('useAttemptLifecycle identifier validation', () => {
  it('returns before starting when the test identifier is missing', async () => {
    const options = createOptions(undefined)
    const { result } = renderHook(() => useAttemptLifecycle(options))

    act(() => result.current.setAccepted(true))
    await act(async () => result.current.beginTest())

    expect(testAPI.startTest).not.toHaveBeenCalled()
    expect(testAPI.getQuestions).not.toHaveBeenCalled()
    expect(options.loadedRef.current).toBe(false)
    expect(options.setStarted).not.toHaveBeenCalled()
    expect(result.current.starting).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Test identifier is required')
    expect(options.navigate).toHaveBeenCalledWith('/tests')
  })

  it('returns before starting when the test identifier is empty', async () => {
    const options = createOptions('')
    const { result } = renderHook(() => useAttemptLifecycle(options))

    act(() => result.current.setAccepted(true))
    await act(async () => result.current.beginTest())

    expect(testAPI.startTest).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Test identifier is required')
    expect(options.navigate).toHaveBeenCalledWith('/tests')
    expect(result.current.starting).toBe(false)
  })

  it('starts with numeric test identifier zero', async () => {
    vi.mocked(testAPI.startTest).mockRejectedValueOnce(new Error('request failed'))
    const options = createOptions(0)
    const { result } = renderHook(() => useAttemptLifecycle(options))

    act(() => result.current.setAccepted(true))
    await act(async () => result.current.beginTest())

    expect(testAPI.startTest).toHaveBeenCalledExactlyOnceWith(0)
  })
})
