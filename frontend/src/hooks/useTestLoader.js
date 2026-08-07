import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { testAPI } from '../api/api'

export default function useTestLoader({ testId, navigate }) {
  const [test, setTest] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      setLoading(true)
      setTest(null)

      try {
        const testRes = await testAPI.getTest(testId)
        if (cancelled) return
        setTest(testRes.data)
      } catch (err) {
        toast.error(err.response?.data?.detail || 'Failed to load test')
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