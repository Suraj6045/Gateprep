import { useCallback, useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import axios from 'axios'
import { adminAPI } from '../api/api'
import type { Dispatch, SetStateAction } from 'react'
import type { AdminQuestion, QuestionsUploadResponse, TestDetail, TestPatch, QuestionIn } from '@/types/api'

export interface AdminTestParams { testId: string | number }
export interface AdminTestResult {
  test: TestDetail | null
  questions: AdminQuestion[]
  loading: boolean
  load: () => Promise<void>
  updateTestDetails: (payload: TestPatch) => Promise<void>
  addQuestion: (question: QuestionIn) => Promise<void>
  addQuestionsJSON: (questions: QuestionIn[]) => Promise<void>
  uploadQuestionsFile: (file: File) => Promise<QuestionsUploadResponse>
  deleteQuestion: (questionId: string | number) => Promise<void>
  updateQuestion: (questionId: string | number, payload: QuestionIn) => Promise<void>
  uploadImage: (questionId: string | number, file: File, target?: 'question' | 'A' | 'B' | 'C' | 'D') => Promise<void>
  deleteImage: (questionId: string | number, target: 'question' | 'A' | 'B' | 'C' | 'D') => Promise<void>
}
export function useAdminTest(testId: string | number): AdminTestResult {
  const [test, setTest] = useState<TestDetail | null>(null)
  const [questions, setQuestions] = useState<AdminQuestion[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [testResponse, questionsResponse] = await Promise.all([
        adminAPI.getTest(testId),
        adminAPI.getQuestions(testId),
      ])

      setTest(testResponse.data)
      setQuestions(questionsResponse.data)
    } catch (err) {
      toast.error(axios.isAxiosError(err) ? err.response?.data?.detail || 'Failed to load test' : 'Failed to load test')
    } finally {
      setLoading(false)
    }
  }, [testId])

  useEffect(() => {
    load()
  }, [load])

  const updateTestDetails = useCallback(async (payload: TestPatch) => {
    await adminAPI.updateTest(testId, payload)
    setTest(current => current ? {
      ...current,
      title: payload.title ?? current.title,
      description: payload.description ?? current.description,
      duration_minutes: payload.duration_minutes ?? current.duration_minutes,
    } : current)
  }, [testId])

  const addQuestion = useCallback(async (question: QuestionIn) => {
    await adminAPI.addQuestions(testId, [question])
    await load()
  }, [load, testId])

  const addQuestionsJSON = useCallback(async (questionsToAdd: QuestionIn[]) => {
    const chunkSize = 20
    for (let idx = 0; idx < questionsToAdd.length; idx += chunkSize) {
      await adminAPI.addQuestions(testId, questionsToAdd.slice(idx, idx + chunkSize))
    }
    await load()
  }, [load, testId])

  const uploadQuestionsFile = useCallback(async (file: File): Promise<QuestionsUploadResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await adminAPI.uploadQuestionsFile(testId, formData)
    await load()
    return response.data
  }, [load, testId])

  const deleteQuestion = useCallback(async (questionId: string | number) => {
    try {
      await adminAPI.deleteQuestion(testId, questionId)
      setQuestions(current => current.filter(question => question.id !== questionId))
      toast.success('Deleted')
    } catch {
      toast.error('Failed')
    }
  }, [testId])

  const updateQuestion = useCallback(async (questionId: string | number, payload: QuestionIn) => {
    await adminAPI.updateQuestion(testId, questionId, payload)
    await load()
  }, [load, testId])

  const uploadImage = useCallback(async (questionId: string | number, file: File, target: 'question' | 'A' | 'B' | 'C' | 'D' = 'question') => {
    const formData = new FormData()
    formData.append('image', file)

    try {
      await adminAPI.uploadQImage(questionId, formData, target)
      toast.success(target === 'question' ? 'Question image uploaded!' : `Option ${target} image uploaded!`)
      await load()
    } catch (err) {
      toast.error(axios.isAxiosError(err) ? err.response?.data?.detail || 'Upload failed. Check Cloudinary config.' : 'Upload failed. Check Cloudinary config.')
    }
  }, [load])

  const deleteImage = useCallback(async (questionId: string | number, target: 'question' | 'A' | 'B' | 'C' | 'D') => {
    try {
      await adminAPI.deleteQImage(questionId, target)
      toast.success('Image removed')
      await load()
    } catch {
      toast.error('Failed to remove image')
    }
  }, [load])

  return {
    test,
    questions,
    loading,
    load,
    updateTestDetails,
    addQuestion,
    addQuestionsJSON,
    uploadQuestionsFile,
    deleteQuestion,
    updateQuestion,
    uploadImage,
    deleteImage,
  }
}
