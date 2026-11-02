import { renderHook, waitFor } from '@testing-library/react'
import { AxiosHeaders } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import toast from 'react-hot-toast'
import { testAPI } from '../api/api'
import type { ApiResponse, TestDetail } from '@/types/api'
import useTestLoader from './useTestLoader'
import type { TestLoaderParams } from './useTestLoader'

vi.mock('../api/api', () => ({
  testAPI: { getTest: vi.fn() },
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

const testDetail: TestDetail = {
  id: 17,
  title: 'GATE Mock Test',
  description: null,
  duration_minutes: 180,
  total_marks: 100,
  question_count: 2,
  series_id: null,
  created_at: '2026-01-01T00:00:00Z',
  test_type: null,
}

const missingTestIds: Array<[string, TestLoaderParams['testId']]> = [
  ['undefined', undefined],
  ['empty', ''],
]

afterEach(() => {
  vi.clearAllMocks()
})

describe('useTestLoader identifier validation', () => {
  it.each(missingTestIds)('clears the active test and skips the request when the identifier is %s', async (_name, testId) => {
    const navigate = vi.fn<TestLoaderParams['navigate']>()
    const { result } = renderHook(() => useTestLoader({ testId, navigate }))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.test).toBeNull()
    expect(testAPI.getTest).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Test could not be found')
    expect(navigate).toHaveBeenCalledWith('/tests')
  })

  it('loads the requested test when its identifier is present', async () => {
    const navigate = vi.fn<TestLoaderParams['navigate']>()
    vi.mocked(testAPI.getTest).mockResolvedValueOnce(apiResponse(testDetail))
    const { result } = renderHook(() => useTestLoader({ testId: 17, navigate }))

    await waitFor(() => expect(result.current.test).toEqual(testDetail))

    expect(testAPI.getTest).toHaveBeenCalledExactlyOnceWith(17)
    expect(navigate).not.toHaveBeenCalled()
  })

  it('clears a previously loaded test when its identifier becomes absent', async () => {
    const navigate = vi.fn<TestLoaderParams['navigate']>()
    vi.mocked(testAPI.getTest).mockResolvedValueOnce(apiResponse(testDetail))
    const initialProps: TestLoaderParams = { testId: 17, navigate }
    const { result, rerender } = renderHook(
      ({ testId }: TestLoaderParams) => useTestLoader({ testId, navigate }),
      { initialProps },
    )

    await waitFor(() => expect(result.current.test).toEqual(testDetail))
    rerender({ testId: undefined, navigate })
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.test).toBeNull()
    expect(testAPI.getTest).toHaveBeenCalledExactlyOnceWith(17)
  })
})
