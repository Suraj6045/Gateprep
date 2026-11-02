import { useCallback, useMemo } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { TestQuestion } from '@/types/api'

export interface TestProgressParams {
  questions: TestQuestion[]
  answers: Record<number, string | undefined>
  current: number
  currentQuestion: TestQuestion | undefined
  setCurrent: Dispatch<SetStateAction<number>>
  commitNAT: () => void
  setMarked: Dispatch<SetStateAction<Set<number>>>
  setVisited: Dispatch<SetStateAction<Set<number>>>
}
export interface TestProgressResult {
  saveAndNext: () => void
  markAndNext: () => void
  questionGroups: Map<string, { question: TestQuestion; index: number }[]>
  subjects: string[]
  answered: number
  notAnswered: number
}
export default function useTestProgress({
  questions,
  answers,
  current,
  currentQuestion,
  setCurrent,
  commitNAT,
  setMarked,
  setVisited,
}: TestProgressParams): TestProgressResult {
  const saveAndNext = useCallback(() => {
    if (currentQuestion?.question_type === 'nat') commitNAT()
    if (current < questions.length - 1) setCurrent(c => c + 1)
  }, [commitNAT, current, currentQuestion, questions.length, setCurrent])

  const markAndNext = useCallback(() => {
    if (!currentQuestion) return
    if (currentQuestion.question_type === 'nat') commitNAT()
    setMarked(m => {
      const n = new Set(m)
      n.has(currentQuestion.id) ? n.delete(currentQuestion.id) : n.add(currentQuestion.id)
      return n
    })
    if (current < questions.length - 1) setCurrent(c => c + 1)
  }, [commitNAT, current, currentQuestion, questions.length, setMarked, setCurrent])

  const questionGroups = useMemo(() => {
    const map = new Map<string, { question: TestQuestion; index: number }[]>()
    questions.forEach((q, idx) => {
      const subject = q.subject || 'General'
      if (!map.has(subject)) map.set(subject, [])
      map.get(subject)?.push({ question: q, index: idx })
    })
    return map
  }, [questions])

  const subjects = useMemo(() => [...questionGroups.keys()], [questionGroups])

  const answered = useMemo(() => {
    return Object.values(answers).filter(Boolean).length
  }, [answers])

  const notAnswered = questions.length - answered

  return {
    saveAndNext,
    markAndNext,
    questionGroups,
    subjects,
    answered,
    notAnswered,
  }
}
