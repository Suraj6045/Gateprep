import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import axios from 'axios'
import { testAPI } from '../api/api'
import type { TestDetail } from '@/types/api'

export interface TestLoaderParams { testId: string | number | undefined; navigate: (to: string) => void }
export interface TestLoaderResult { test: TestDetail | null; loading: boolean }

export default function useTestLoader({ testId, navigate }: TestLoaderParams): TestLoaderResult {
  const [test, setTest] = useState<TestDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    if (testId === undefined || testId === null || testId === '') {
      setLoading(false)
      setTest(null)
      toast.error('Test could not be found')
      navigate('/tests')
      return
    }

    ;(async () => {
      setLoading(true)
      setTest(null)

      try {
        const testRes = await testAPI.getTest(testId)
        if (cancelled) return
        setTest(testRes.data)
      } catch (err) {
        toast.error(axios.isAxiosError(err) ? err.response?.data?.detail || 'Failed to load test' : 'Failed to load test')
        navigate('/tests')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [testId, navigate])

  return { test, loading }
}
