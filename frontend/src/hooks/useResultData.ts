import { useMemo, useCallback } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import useSWR, { mutate as globalMutate } from 'swr'
import { bookmarkAPI, fetcher } from '../api/api'
import toast from 'react-hot-toast'

/**
 * Centralised data-fetching for the Result page.
 *
 * Encapsulates:
 *  - Server vs. practice result resolution
 *  - Bookmark set + toggle mutation
 *  - Attempt history for the same test
 *  - Unified `loading` flag
 */
import type { PersistedResult, MyAttempt, BookmarkIdsResponse } from '@/types/api'

export interface ResultDataResult {
  attemptId: string | undefined
  isPractice: boolean | undefined
  result: PersistedResult | null
  bookmarked: Set<number>
  attempts: MyAttempt[]
  loading: boolean
  toggleBookmark: (qId: number) => Promise<void>
}
export interface ResultDataParams {}
export function useResultData(_params?: ResultDataParams): ResultDataResult {
  const { attemptId } = useParams()
  const location = useLocation()

  const isPractice = attemptId?.startsWith('practice-')

  const { data: serverResult, isLoading: resultLoading } = useSWR<PersistedResult>(
    isPractice ? null : `/tests/attempt/${attemptId}/result`,
    fetcher,
  )

  const result = useMemo(() => {
    if (isPractice) {
      if (location.state?.result) return location.state.result
      try {
        const stored = sessionStorage.getItem(`practice-result:${attemptId}`)
        // JSON.parse is the untyped sessionStorage boundary.
        return stored ? JSON.parse(stored) as PersistedResult : null
      } catch {
        return null
      }
    }
    return serverResult
  }, [isPractice, location.state, attemptId, serverResult])

  const { data: bData, isLoading: bLoading, mutate: mutateBookmarks } = useSWR<BookmarkIdsResponse>(
    '/bookmarks/ids',
    fetcher,
  )
  const bookmarked = useMemo(() => new Set(bData?.ids || []), [bData])

  const testId = result?.test_id
  const { data: attemptsData } = useSWR<MyAttempt[]>(
    testId && !isPractice ? `/tests/${testId}/my-attempts` : null,
    fetcher,
  )
  const attempts = attemptsData || []

  const loading = isPractice ? bLoading : resultLoading || bLoading

  const toggleBookmark = useCallback(
    async (qId: number) => {
      const res = await bookmarkAPI.toggle(qId)
      mutateBookmarks(
        (prev: BookmarkIdsResponse | undefined) => {
          const nextIds = new Set(prev?.ids || [])
          res.data.bookmarked ? nextIds.add(qId) : nextIds.delete(qId)
          return { ...prev, ids: Array.from(nextIds) }
        },
        false,
      )
      globalMutate('/bookmarks')
      toast(res.data.bookmarked ? 'Bookmarked' : 'Bookmark removed', {
        duration: 1500,
      })
    },
    [mutateBookmarks],
  )

  return {
    attemptId,
    isPractice,
    result,
    bookmarked,
    attempts,
    loading,
    toggleBookmark,
  }
}
