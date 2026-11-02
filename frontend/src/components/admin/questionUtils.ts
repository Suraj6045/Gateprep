export const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const
export type OptionLetter = typeof OPTION_LETTERS[number]
export type QuestionType = 'mcq' | 'msq' | 'nat'
export const isQuestionType = (value: string): value is QuestionType =>
  value === 'mcq' || value === 'msq' || value === 'nat'

export type { AdminQuestion } from '@/types/api'

export interface QuestionFormState {
  question_type: QuestionType
  question_text: string
  options: string[]
  correct_answer: string
  marks: number | string
  negative_marks: number | string
  subject: string
  topic: string
}

export interface QuestionCreateFormState extends Omit<QuestionFormState, 'marks' | 'negative_marks' | 'topic'> {
  marks: number
  negative_marks: number
}

export const EMPTY_QUESTION: QuestionCreateFormState = {
  question_type: 'mcq',
  question_text: '',
  options: ['', '', '', ''],
  correct_answer: 'A',
  marks: 1,
  negative_marks: 0.33,
  subject: '',
}

export const optionsFromQuestion = (options: unknown): string[] =>
  OPTION_LETTERS.map((_, idx) => (Array.isArray(options) ? options[idx] || '' : ''))
