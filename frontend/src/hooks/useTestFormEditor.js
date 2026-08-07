import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'

export function getTestFormValidationError(testForm) {
  if (!testForm.title.trim()) return 'Title required'
  const durationMinutes = Number(testForm.duration_minutes)
  const isDurationValid = Number.isFinite(durationMinutes) && durationMinutes >= 5 && durationMinutes <= 360
  if (!isDurationValid) return 'Duration must be between 5 and 360 minutes'
  return null
}

export function useTestFormEditor(test, updateTestDetails) {
  const [isEditingTest, setIsEditingTest] = useState(false)
  const [testForm, setTestForm] = useState({ title: '', description: '', duration_minutes: 180 })
  const [savingTest, setSavingTest] = useState(false)

  const startEditingTest = useCallback(() => {
    setTestForm({
      title: test?.title || '',
      description: test?.description || '',
      duration_minutes: test?.duration_minutes || 180,
    })
    setIsEditingTest(true)
  }, [test])

  const saveTest = useCallback(async (event) => {
    event.preventDefault()
    const validationError = getTestFormValidationError(testForm)
    if (validationError) { toast.error(validationError); return }

    const durationMinutes = Number(testForm.duration_minutes)
    setSavingTest(true)
    try {
      await updateTestDetails({
        title: testForm.title.trim(),
        description: testForm.description.trim(),
        duration_minutes: durationMinutes,
      })
      setIsEditingTest(false)
      toast.success('Test updated')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update test')
    } finally {
      setSavingTest(false)
    }
  }, [testForm, updateTestDetails])

  const cancelEditingTest = useCallback(() => {
    setIsEditingTest(false)
  }, [])

  return { isEditingTest, testForm, setTestForm, savingTest, startEditingTest, saveTest, cancelEditingTest }
}
