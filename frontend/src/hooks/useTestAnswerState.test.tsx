import { act, renderHook } from '@testing-library/react'
import { useRef, useState } from 'react'
import { describe, expect, it } from 'vitest'
import useTestAnswerState from './useTestAnswerState'
import useTestProgress from './useTestProgress'
import type { TestQuestion } from '@/types/api'

const questions: TestQuestion[] = [
  {
    id: 1,
    question_type: 'nat',
    question_text: 'NAT',
    question_image_url: null,
    options: [],
    option_images: null,
    order_index: 0,
    marks: 1,
    negative_marks: 0,
    subject: null,
    topic: null,
  },
  {
    id: 2,
    question_type: 'mcq',
    question_text: 'MCQ',
    question_image_url: null,
    options: ['A', 'B'],
    option_images: null,
    order_index: 1,
    marks: 1,
    negative_marks: 0,
    subject: null,
    topic: null,
  },
]

function useTestNavigationState() {
  const [current, setCurrent] = useState(0)
  const answersRef = useRef<Record<number, string | undefined>>({})
  const timingsRef = useRef<Record<number, number>>({})
  const answerState = useTestAnswerState({
    current,
    questions,
    currentQuestion: questions[current],
    answersRef,
    timingsRef,
  })
  const progress = useTestProgress({
    questions,
    answers: answerState.answers,
    current,
    currentQuestion: questions[current],
    setCurrent,
    commitNAT: answerState.commitNAT,
    setMarked: answerState.setMarked,
    setVisited: answerState.setVisited,
  })

  return { ...answerState, ...progress, answersRef, current, setCurrent }
}

describe('useTestAnswerState NAT answers', () => {
  it('keeps the active value in answersRef as the user types', () => {
    const { result } = renderHook(() => useTestNavigationState())

    act(() => result.current.updateNatInput('42.5'))

    expect(result.current.answersRef.current[1]).toBe('42.5')
    expect(result.current.answers[1]).toBe('42.5')
  })

  it('keeps a typed NAT answer when Mark & Next advances the question', () => {
    const { result } = renderHook(() => useTestNavigationState())

    act(() => result.current.updateNatInput('42'))
    act(() => result.current.markAndNext())

    expect(result.current.current).toBe(1)
    expect(result.current.answersRef.current[1]).toBe('42')
    expect(result.current.answers[1]).toBe('42')
  })
})
