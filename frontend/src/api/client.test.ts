import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AUTH_UNAUTHORIZED_EVENT,
  startTokenRefresh,
  stopTokenRefresh,
} from './client'

const mocks = vi.hoisted(() => ({
  isAxiosError: vi.fn(() => true),
  post: vi.fn(),
  responseUse: vi.fn(),
}))

vi.mock('axios', () => ({
  default: {
    isAxiosError: mocks.isAxiosError,
    create: vi.fn(() => ({
      interceptors: {
        response: {
          use: mocks.responseUse,
        },
      },
      post: mocks.post,
    })),
  },
}))

describe('API client response interceptor', () => {
  const rejectResponse = mocks.responseUse.mock.calls[0][1] as (
    error: unknown,
  ) => Promise<never>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    stopTokenRefresh()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('dispatches the unauthorized event for a non-auth 401 response', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')
    const error = { response: { status: 401 }, config: { url: '/tests' } }

    await expect(rejectResponse(error)).rejects.toBe(error)

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: AUTH_UNAUTHORIZED_EVENT }),
    )
  })

  it('does not dispatch the unauthorized event for an auth 401 response', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')
    const error = { response: { status: 401 }, config: { url: '/auth/me' } }

    await expect(rejectResponse(error)).rejects.toBe(error)

    expect(dispatchSpy).not.toHaveBeenCalled()
  })

  it('does not dispatch the unauthorized event for non-401 responses', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')
    const error = { response: { status: 500 }, config: { url: '/tests' } }

    await expect(rejectResponse(error)).rejects.toBe(error)

    expect(dispatchSpy).not.toHaveBeenCalled()
  })

  it('does not dispatch when a 401 error is not identified as an Axios error', async () => {
    mocks.isAxiosError.mockReturnValueOnce(false)
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')
    const error = { response: { status: 401 }, config: { url: '/tests' } }

    await expect(rejectResponse(error)).rejects.toBe(error)

    expect(dispatchSpy).not.toHaveBeenCalled()
  })

  it('re-rejects the original error unchanged', async () => {
    const error = { response: { status: 400 }, config: { url: '/tests' } }

    await expect(rejectResponse(error)).rejects.toBe(error)
  })
})

describe('token refresh timer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mocks.post.mockResolvedValue({ data: {} })
  })

  afterEach(() => {
    stopTokenRefresh()
    vi.useRealTimers()
  })

  it('refreshes immediately and every 2.5 hours', () => {
    startTokenRefresh({ refreshNow: true })
    expect(mocks.post).toHaveBeenCalledTimes(1)
    expect(mocks.post).toHaveBeenCalledWith('/auth/refresh')

    vi.advanceTimersByTime(2.5 * 60 * 60 * 1000)
    expect(mocks.post).toHaveBeenCalledTimes(2)

    vi.advanceTimersByTime(2.5 * 60 * 60 * 1000)
    expect(mocks.post).toHaveBeenCalledTimes(3)
  })

  it('stops future refreshes', () => {
    startTokenRefresh()
    stopTokenRefresh()

    vi.advanceTimersByTime(2.5 * 60 * 60 * 1000)

    expect(mocks.post).not.toHaveBeenCalled()
  })
})
