import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import axios from 'axios'
import type { FormEvent, Dispatch, SetStateAction } from 'react'
import type { TestDetail, TestPatch } from '@/types/api'

export interface TestForm {
  title: string
  description: string
  duration_minutes: number | string
}
export interface TestFormEditorParams {
  test: TestDetail | null
  updateTestDetails: (payload: TestPatch) => Promise<unknown>
}
export interface TestFormEditorResult {
  isEditingTest: boolean
  testForm: TestForm
  setTestForm: Dispatch<SetStateAction<TestForm>>
  savingTest: boolean
  startEditingTest: () => void
  saveTest: (event: FormEvent<HTMLFormElement>) => Promise<void>
  cancelEditingTest: () => void
}
export function getTestFormValidationError(testForm: TestForm): string | null {
  if (!testForm.title.trim()) return 'Title required'
  const durationMinutes = Number(testForm.duration_minutes)
  const isDurationValid = Number.isFinite(durationMinutes) && durationMinutes >= 5 && durationMinutes <= 360
  if (!isDurationValid) return 'Duration must be between 5 and 360 minutes'
  return null
}

export function useTestFormEditor(test: TestDetail | null, updateTestDetails: TestFormEditorParams['updateTestDetails']): TestFormEditorResult {
  const [isEditingTest, setIsEditingTest] = useState(false)
  const [testForm, setTestForm] = useState<TestForm>({ title: '', description: '', duration_minutes: 180 })
  const [savingTest, setSavingTest] = useState(false)

  const startEditingTest = useCallback(() => {
    setTestForm({
      title: test?.title || '',
      description: test?.description || '',
      duration_minutes: test?.duration_minutes || 180,
    })
    setIsEditingTest(true)
  }, [test])

  const saveTest = useCallback(async (event: FormEvent<HTMLFormElement>) => {
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
      toast.error(axios.isAxiosError(err) ? err.response?.data?.detail || 'Failed to update test' : 'Failed to update test')
    } finally {
      setSavingTest(false)
    }
  }, [testForm, updateTestDetails])

  const cancelEditingTest = useCallback(() => {
    setIsEditingTest(false)
  }, [])

  return { isEditingTest, testForm, setTestForm, savingTest, startEditingTest, saveTest, cancelEditingTest }
}
