import { act, renderHook } from '@testing-library/react'
import { AxiosHeaders } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import toast from 'react-hot-toast'
import { testAPI } from '../api/api'
import useTestSubmission from './useTestSubmission'
import type { ApiResponse, SubmitResult } from '@/types/api'
import type { TestQuestion } from '@/types/api'
import type { TestSubmissionParams } from './useTestSubmission'

vi.mock('../api/api', () => ({
  testAPI: { submitTest: vi.fn() },
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), mock: vi.fn() },
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

function createOptions(overrides: Partial<TestSubmissionParams> = {}): TestSubmissionParams {
  return {
    isPreview: false,
    navigate: vi.fn(),
    attemptRef: { current: { id: 3 } },
    answersRef: { current: {} },
    questionsRef: { current: [] },
    timingsRef: { current: {} },
    testIdRef: { current: 7 },
    autoSaveRef: { current: null },
    commitNAT: vi.fn(),
    ...overrides,
  }
}

const missingTestIds: Array<TestSubmissionParams['testIdRef']['current']> = [undefined, '']

afterEach(() => {
  vi.clearAllMocks()
})

describe('useTestSubmission NAT answers', () => {
  it('commits the active NAT answer before building the submit payload', async () => {
    const answersRef = { current: {} }
    const commitNAT = vi.fn(() => {
      answersRef.current = { ...answersRef.current, 1: '42' }
    })
    const resultData: SubmitResult = {
      id: 9,
      test_id: 7,
      status: 'submitted',
      started_at: null,
      submitted_at: '2026-01-01T10:00:00Z',
      score: 1,
      total_marks: 1,
      tab_violations: 0,
      fullscreen_violations: 0,
      persisted: true,
    }
    vi.mocked(testAPI.submitTest).mockResolvedValueOnce(apiResponse(resultData))

    const { result } = renderHook(() => useTestSubmission({
      isPreview: false,
      navigate: vi.fn(),
      attemptRef: { current: { id: 3 } },
      answersRef,
      questionsRef: {
        current: [{
          id: 1,
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
        } satisfies TestQuestion],
      },
      timingsRef: { current: {} },
      testIdRef: { current: 7 },
      autoSaveRef: { current: null },
      commitNAT,
    }))

    await act(async () => result.current.doSubmit())

    expect(commitNAT).toHaveBeenCalledOnce()
    expect(testAPI.submitTest).toHaveBeenCalledWith(7, 3, [
      { question_id: 1, selected_answer: '42', time_spent_seconds: 0 },
    ])
  })

  it('silently releases the submission state when no attempt exists', async () => {
    const options = createOptions({ attemptRef: { current: null } })
    const { result } = renderHook(() => useTestSubmission(options))

    await act(async () => result.current.doSubmit())

    expect(testAPI.submitTest).not.toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()
    expect(result.current.submitLockRef.current).toBe(false)
    expect(result.current.submitting).toBe(false)
  })

  it('submits with the same payload when an attempt exists', async () => {
    vi.mocked(testAPI.submitTest).mockRejectedValueOnce(new Error('request failed'))
    const options = createOptions()
    const { result } = renderHook(() => useTestSubmission(options))

    await act(async () => result.current.doSubmit())

    expect(testAPI.submitTest).toHaveBeenCalledExactlyOnceWith(7, 3, [])
  })

  it.each(missingTestIds)('reports a missing test identifier (%s) and releases the submission state', async testId => {
    const options = createOptions({ testIdRef: { current: testId } })
    const { result } = renderHook(() => useTestSubmission(options))

    await act(async () => result.current.doSubmit())

    expect(testAPI.submitTest).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Unable to submit test: test identifier is required')
    expect(result.current.submitLockRef.current).toBe(false)
    expect(result.current.submitting).toBe(false)
  })

  it.each(missingTestIds)('submits the same payload when the test identifier (%s) is present', async () => {
    vi.mocked(testAPI.submitTest).mockRejectedValueOnce(new Error('request failed'))
    const options = createOptions({ testIdRef: { current: 7 } })
    const { result } = renderHook(() => useTestSubmission(options))

    await act(async () => result.current.doSubmit())

    expect(testAPI.submitTest).toHaveBeenCalledExactlyOnceWith(7, 3, [])
  })
})
