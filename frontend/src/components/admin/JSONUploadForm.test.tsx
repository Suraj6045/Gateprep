import { describe, expect, it } from 'vitest'
import { extractQuestions, parseQuestionsJson, readJsonFile } from './JSONUploadForm'

const validMCQ = {
  question_type: 'mcq',
  question_text: 'What is binary search complexity?',
  options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'],
  correct_answer: 'B',
  marks: 1,
  negative_marks: 0.33,
  subject: 'Algorithms',
}

describe('JSONUploadForm JSON parsing', () => {
  it('parses the expected object schema and normalizes question values', () => {
    const questions = parseQuestionsJson(JSON.stringify({ questions: [validMCQ] }))

    expect(questions).toHaveLength(1)
    expect(questions[0]).toMatchObject({
      question_type: 'mcq',
      question_text: validMCQ.question_text,
      options: validMCQ.options,
      correct_answer: 'B',
      marks: 1,
      negative_marks: 0.33,
    })
  })

  it('accepts an array root for pasted questions', () => {
    const questions = extractQuestions([validMCQ])

    expect(questions).toHaveLength(1)
    expect(questions[0].question_text).toBe(validMCQ.question_text)
  })

  it('normalizes MSQ answers and removes negative marks for non-MCQ questions', () => {
    const questions = extractQuestions([
      {
        ...validMCQ,
        question_type: 'msq',
        correct_answer: 'A, C',
        negative_marks: 0.66,
      },
    ])

    expect(questions[0].correct_answer).toBe('A,C')
    expect(questions[0].negative_marks).toBe(0)
  })

  it('rejects malformed JSON with a clear error', () => {
    expect(() => parseQuestionsJson('{ "questions": [ }')).toThrow(/Invalid JSON:/)
  })

  it('rejects roots that do not match the expected schema', () => {
    expect(() => extractQuestions({ items: [validMCQ] })).toThrow(
      'JSON root must be an array or an object with a "questions" array',
    )
  })

  it('rejects empty question arrays', () => {
    expect(() => extractQuestions({ questions: [] })).toThrow('JSON does not contain any questions')
  })

  it('rejects question objects with invalid fields', () => {
    expect(() => extractQuestions([{ ...validMCQ, options: ['A', 'B'] }])).toThrow(
      'Question 1 options must contain exactly 4 non-empty strings',
    )
  })

  it('reads a JSON file before validation', async () => {
    const file = new File([JSON.stringify({ questions: [validMCQ] })], 'questions.json', {
      type: 'application/json',
    })

    const text = await readJsonFile(file)
    const questions = parseQuestionsJson(text)

    expect(questions).toHaveLength(1)
    expect(questions[0].correct_answer).toBe('B')
  })
})
