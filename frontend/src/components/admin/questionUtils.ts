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

const FLOAT_RE = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/
const NAT_RANGE_RE = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)\s*(?:-|:|to)\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)$/i

export function parseNatFloat(token: string): number | null {
  const trimmed = token.trim()
  if (!trimmed || !FLOAT_RE.test(trimmed)) return null
  const num = Number(trimmed)
  return Number.isFinite(num) ? num : null
}

export function parseNatRange(token: string): [number, number] | null {
  const trimmed = token.trim()
  const match = trimmed.match(NAT_RANGE_RE)
  if (!match || !match[1] || !match[2]) return null
  const lo = parseNatFloat(match[1])
  const hi = parseNatFloat(match[2])
  if (lo === null || hi === null || lo > hi) return null
  return [lo, hi]
}

export function isValidNatAnswer(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  const tokens = trimmed.split(/[,;/]/).map(t => t.trim()).filter(Boolean)
  if (!tokens.length) return false
  return tokens.every(token => parseNatFloat(token) !== null || parseNatRange(token) !== null)
}

export interface QuestionValidationInput {
  question_type: QuestionType
  question_text: string
  options: string[]
  correct_answer: string
  marks?: number | string
  negative_marks?: number | string
}

export function validateQuestionInput(q: QuestionValidationInput): string | null {
  if (!q.question_text.trim()) {
    return 'Question text required'
  }
  if (q.question_type !== 'nat') {
    if (q.options.length < 4 || q.options.some(opt => !opt.trim())) {
      return 'Fill all 4 options'
    }
  }
  const answer = q.correct_answer.trim()
  if (!answer) {
    return 'Correct answer required'
  }
  const validLetters: readonly string[] = OPTION_LETTERS
  if (q.question_type === 'mcq') {
    if (!validLetters.includes(answer.toUpperCase())) {
      return 'MCQ correct answer must be one of A, B, C, or D'
    }
  } else if (q.question_type === 'msq') {
    const letters = answer.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
    if (!letters.length || letters.some(letter => !validLetters.includes(letter))) {
      return 'MSQ correct answer must contain valid option letters like A,C'
    }
    const unique = new Set(letters)
    if (unique.size !== letters.length) {
      return 'MSQ correct answer cannot contain duplicate options'
    }
  } else if (q.question_type === 'nat') {
    if (!isValidNatAnswer(answer)) {
      return 'NAT correct answer must be a number or range like 41.5-42.5 or 41.5:42.5'
    }
  }
  if (q.marks !== undefined) {
    const marksNum = Number(q.marks)
    if (!Number.isFinite(marksNum) || marksNum <= 0) {
      return 'Marks must be greater than 0'
    }
  }
  if (q.negative_marks !== undefined && q.question_type === 'mcq') {
    const negMarksNum = Number(q.negative_marks)
    if (!Number.isFinite(negMarksNum) || negMarksNum < 0) {
      return 'Negative marks cannot be below 0'
    }
  }
  return null
}
