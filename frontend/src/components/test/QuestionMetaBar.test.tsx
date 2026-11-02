import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it } from 'vitest'
import QuestionMetaBar from './QuestionMetaBar'
import type { TestQuestion } from '@/types/api'

afterEach(() => {
  cleanup()
})

const baseQuestion: TestQuestion = {
  id: 1,
  question_type: 'mcq',
  question_text: 'Sample question',
  question_image_url: null,
  options: ['A', 'B'],
  option_images: null,
  order_index: 0,
  marks: 1,
  negative_marks: 0.33,
  subject: 'Computer Science',
  topic: null,
}

describe('QuestionMetaBar', () => {
  it('renders "MCQ" for mcq questions', () => {
    render(<QuestionMetaBar question={{ ...baseQuestion, question_type: 'mcq' }} />)
    expect(screen.getByText('MCQ')).toBeInTheDocument()
    expect(screen.queryByText('MCQ Single')).not.toBeInTheDocument()
  })

  it('renders "MSQ" for msq questions', () => {
    render(<QuestionMetaBar question={{ ...baseQuestion, question_type: 'msq' }} />)
    expect(screen.getByText('MSQ')).toBeInTheDocument()
    expect(screen.queryByText('MSQ Multiple')).not.toBeInTheDocument()
  })

  it('renders "NAT" for nat questions', () => {
    render(<QuestionMetaBar question={{ ...baseQuestion, question_type: 'nat', negative_marks: 0 }} />)
    expect(screen.getByText('NAT')).toBeInTheDocument()
    expect(screen.queryByText('NAT Numerical')).not.toBeInTheDocument()
  })
})

