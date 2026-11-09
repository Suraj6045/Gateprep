import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import useNextQuestionPrefetch, { getQuestionImageUrls } from './useNextQuestionPrefetch'
import type { TestQuestion } from '@/types/api'

function makeQuestion(id: number, overrides: Partial<TestQuestion> = {}): TestQuestion {
  return {
    id,
    question_type: 'mcq',
    question_text: `Q${id}`,
    question_image_url: null,
    options: ['a', 'b', 'c', 'd'],
    option_images: null,
    order_index: id,
    marks: 1,
    negative_marks: 0.33,
    subject: null,
    topic: null,
    ...overrides,
  }
}

describe('getQuestionImageUrls', () => {
  it('returns the diagram and string option images, ignoring non-strings', () => {
    const q = makeQuestion(1, {
      question_image_url: 'https://img/q1.png',
      option_images: { A: 'https://img/a.png', B: null, C: 7, D: '' },
    })
    expect(getQuestionImageUrls(q)).toEqual(['https://img/q1.png', 'https://img/a.png'])
  })

  it('handles missing question and no images', () => {
    expect(getQuestionImageUrls(undefined)).toEqual([])
    expect(getQuestionImageUrls(makeQuestion(1))).toEqual([])
  })
})

describe('useNextQuestionPrefetch', () => {
  const requested: string[] = []

  beforeEach(() => {
    requested.length = 0
    vi.stubGlobal(
      'Image',
      class {
        set src(value: string) {
          requested.push(value)
        }
      }
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const questions = [
    makeQuestion(1, { question_image_url: 'https://img/q1.png' }),
    makeQuestion(2, { question_image_url: 'https://img/q2.png', option_images: { A: 'https://img/q2a.png' } }),
    makeQuestion(3, { question_image_url: 'https://img/q3.png' }),
  ]

  it('prefetches only the next question once started', () => {
    renderHook(() => useNextQuestionPrefetch(questions, 0, true))
    expect(requested).toEqual(['https://img/q2.png', 'https://img/q2a.png'])
  })

  it('does nothing before the exam starts', () => {
    renderHook(() => useNextQuestionPrefetch(questions, 0, false))
    expect(requested).toEqual([])
  })

  it('does nothing on the last question', () => {
    renderHook(() => useNextQuestionPrefetch(questions, 2, true))
    expect(requested).toEqual([])
  })

  it('prefetches the following question on navigation and never repeats a URL', () => {
    const { rerender } = renderHook(({ index }) => useNextQuestionPrefetch(questions, index, true), {
      initialProps: { index: 0 },
    })
    rerender({ index: 0 })
    rerender({ index: 1 })
    expect(requested).toEqual(['https://img/q2.png', 'https://img/q2a.png', 'https://img/q3.png'])
  })
})
