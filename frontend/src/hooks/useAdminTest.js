import { useCallback, useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { adminAPI } from '../api/api'

export function useAdminTest(testId) {
  const [test, setTest] = useState(null)
  const [questions, setQuestions] = useState([])
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
      toast.error(err.response?.data?.detail || 'Failed to load test')
    } finally {
      setLoading(false)
    }
  }, [testId])

  useEffect(() => {
    load()
  }, [load])

  const updateTestDetails = useCallback(async (payload) => {
    await adminAPI.updateTest(testId, payload)
    setTest(current => ({ ...current, ...payload }))
  }, [testId])

  const addQuestion = useCallback(async (question) => {
    await adminAPI.addQuestions(testId, [question])
    await load()
  }, [load, testId])

  const addQuestionsJSON = useCallback(async (questionsToAdd) => {
    const chunkSize = 20
    for (let idx = 0; idx < questionsToAdd.length; idx += chunkSize) {
      await adminAPI.addQuestions(testId, questionsToAdd.slice(idx, idx + chunkSize))
    }
    await load()
  }, [load, testId])

  const uploadQuestionsFile = useCallback(async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await adminAPI.uploadQuestionsFile(testId, formData)
    await load()
    return response.data
  }, [load, testId])

  const deleteQuestion = useCallback(async (questionId) => {
    if (!confirm('Delete this question?')) return

    try {
      await adminAPI.deleteQuestion(testId, questionId)
      setQuestions(current => current.filter(question => question.id !== questionId))
      toast.success('Deleted')
    } catch {
      toast.error('Failed')
    }
  }, [testId])

  const updateQuestion = useCallback(async (questionId, payload) => {
    await adminAPI.updateQuestion(testId, questionId, payload)
    await load()
  }, [load, testId])

  const uploadImage = useCallback(async (questionId, file, target = 'question') => {
    const formData = new FormData()
    formData.append('image', file)

    try {
      await adminAPI.uploadQImage(questionId, formData, target)
      toast.success(target === 'question' ? 'Question image uploaded!' : `Option ${target} image uploaded!`)
      await load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed. Check Cloudinary config.')
    }
  }, [load])

  const deleteImage = useCallback(async (questionId, target) => {
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
