export const OPTION_LETTERS = ['A', 'B', 'C', 'D']

export const EMPTY_QUESTION = {
  question_type: 'mcq',
  question_text: '',
  options: ['', '', '', ''],
  correct_answer: 'A',
  marks: 1,
  negative_marks: 0.33,
  subject: '',
  topic: '',
}

export const optionsFromQuestion = (options) =>
  OPTION_LETTERS.map((_, idx) => (Array.isArray(options) ? options[idx] || '' : ''))
