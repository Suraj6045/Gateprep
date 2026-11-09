import { describe, expect, it } from 'vitest'
import vectors from '@/tests/fixtures/nat_test_vectors.json'
import {
  isValidNatAnswer,
  validateQuestionInput,
} from './questionUtils'

describe('questionUtils NAT validation with shared test vectors', () => {
  it.each(vectors.valid)('validates valid NAT answer %s', (ans) => {
    expect(isValidNatAnswer(ans)).toBe(true)
  })

  it.each(vectors.invalid)('rejects invalid NAT answer %s', (ans) => {
    expect(isValidNatAnswer(ans)).toBe(false)
  })
})

describe('validateQuestionInput', () => {
  it('validates MCQ correctly', () => {
    expect(validateQuestionInput({
      question_type: 'mcq',
      question_text: 'What is 2+2?',
      options: ['1', '2', '3', '4'],
      correct_answer: 'D',
    })).toBeNull()

    expect(validateQuestionInput({
      question_type: 'mcq',
      question_text: 'What is 2+2?',
      options: ['1', '2', '3', '4'],
      correct_answer: 'E',
    })).toBe('MCQ correct answer must be one of A, B, C, or D')
  })

  it('validates MSQ correctly', () => {
    expect(validateQuestionInput({
      question_type: 'msq',
      question_text: 'Select even numbers',
      options: ['1', '2', '4', '5'],
      correct_answer: 'B,C',
    })).toBeNull()

    expect(validateQuestionInput({
      question_type: 'msq',
      question_text: 'Select even numbers',
      options: ['1', '2', '4', '5'],
      correct_answer: 'B,B',
    })).toBe('MSQ correct answer cannot contain duplicate options')

    expect(validateQuestionInput({
      question_type: 'msq',
      question_text: 'Select even numbers',
      options: ['1', '2', '4', '5'],
      correct_answer: 'B,X',
    })).toBe('MSQ correct answer must contain valid option letters like A,C')
  })

  it('validates missing question text and options', () => {
    expect(validateQuestionInput({
      question_type: 'mcq',
      question_text: '   ',
      options: ['1', '2', '3', '4'],
      correct_answer: 'A',
    })).toBe('Question text required')

    expect(validateQuestionInput({
      question_type: 'mcq',
      question_text: 'Hello',
      options: ['1', '', '3', '4'],
      correct_answer: 'A',
    })).toBe('Fill all 4 options')
  })
})
