import { useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { FileJson, Upload, X } from 'lucide-react'
import Spinner from '../shared/Spinner'
import { ALERT_STYLE } from '../shared/alertStyles'
import type { ChangeEvent, ReactElement } from 'react'
import { isQuestionType } from './questionUtils'
import type { QuestionType } from './questionUtils'
import type { QuestionIn, QuestionsUploadResponse } from '@/types/api'

const OPTION_LETTERS: ReadonlySet<string> = new Set(['A', 'B', 'C', 'D'])
const NAT_ANSWER_PATTERN = /^-?\d+(\.\d+)?(\s*[-:]\s*-?\d+(\.\d+)?)?$/

const SAMPLE_JSON = JSON.stringify({
  questions: [
    {
      question_type: 'mcq',
      question_text: 'What is the time complexity of binary search?',
      options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'],
      correct_answer: 'B',
      marks: 1,
      negative_marks: 0.33,
      subject: 'Algorithms',
    },
    {
      question_type: 'nat',
      question_text: 'How many distinct binary trees can be formed with 3 nodes?',
      options: [],
      correct_answer: '5',
      marks: 2,
      negative_marks: 0,
      subject: 'Data Structures',
    },
  ],
}, null, 2)

type JsonObject = Record<string, unknown>
export type ParsedQuestion = Omit<QuestionIn, 'question_type' | 'options'> & JsonObject & {
  question_type: QuestionType
  options: string[]
}

const isPlainObject = (value: unknown): value is JsonObject =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const validateStringField = (question: JsonObject, idx: number, field: string): string => {
  const value = question[field]
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Question ${idx + 1} ${field} must be a non-empty string`)
  }
  return value.trim()
}

const validateNumberField = (question: JsonObject, idx: number, field: string): number | undefined => {
  const value = question[field]
  if (value === undefined) return undefined
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Question ${idx + 1} ${field} must be a number`)
  }
  return value
}

const validateMcqAnswer = (answer: string, idx: number): void => {
  if (!OPTION_LETTERS.has(answer)) {
    throw new Error(`Question ${idx + 1} MCQ correct_answer must be A, B, C, or D`)
  }
}

const validateMsqAnswer = (answer: string, idx: number): void => {
  const selected = answer.split(',').map(part => part.trim()).filter(Boolean)
  if (!selected.length || selected.some(part => !OPTION_LETTERS.has(part))) {
    throw new Error(`Question ${idx + 1} MSQ correct_answer must use option letters like A,C`)
  }
}

const validateNatAnswer = (answer: string, idx: number): void => {
  if (!NAT_ANSWER_PATTERN.test(answer)) {
    throw new Error(`Question ${idx + 1} NAT correct_answer must be a number or range`)
  }
}

const ANSWER_VALIDATORS: Record<QuestionType, (answer: string, idx: number) => void> = {
  mcq: validateMcqAnswer,
  msq: validateMsqAnswer,
  nat: validateNatAnswer,
}

const validateAnswer = (questionType: QuestionType, answer: string, idx: number): void => {
  ANSWER_VALIDATORS[questionType](answer, idx)
}

const areAllOptionsNonEmptyStrings = (options: unknown[]): options is string[] =>
  options.every(option => typeof option === 'string' && option.trim())

const validateOptions = (question: JsonObject, questionType: QuestionType, idx: number): string[] => {
  const options = question.options ?? []
  if (!Array.isArray(options)) {
    throw new Error(`Question ${idx + 1} options must be an array`)
  }

  if (questionType === 'nat') return []

  if (options.length !== 4 || !areAllOptionsNonEmptyStrings(options)) {
    throw new Error(`Question ${idx + 1} options must contain exactly 4 non-empty strings`)
  }

  return options.map(option => option.trim())
}

const validateQuestion = (question: unknown, idx: number): ParsedQuestion => {
  if (!isPlainObject(question)) {
    throw new Error(`Question ${idx + 1} must be an object`)
  }

  const questionType = typeof question.question_type === 'string'
    ? question.question_type.trim().toLowerCase()
    : ''
  if (!isQuestionType(questionType)) {
    throw new Error(`Question ${idx + 1} question_type must be mcq, msq, or nat`)
  }
  const normalizedType = questionType

  const questionText = validateStringField(question, idx, 'question_text')
  const correctAnswer = validateStringField(question, idx, 'correct_answer').toUpperCase().replace(/\s+/g, '')
  const options = validateOptions(question, normalizedType, idx)
  validateAnswer(normalizedType, correctAnswer, idx)

  const marks = validateNumberField(question, idx, 'marks')
  const negativeMarks = validateNumberField(question, idx, 'negative_marks')

  return {
    ...question,
    question_type: normalizedType,
    question_text: questionText,
    options,
    correct_answer: correctAnswer,
    ...(marks === undefined ? {} : { marks }),
    ...(negativeMarks === undefined ? {} : { negative_marks: normalizedType === 'mcq' ? negativeMarks : 0 }),
  }
}

export function extractQuestions(parsed: unknown): ParsedQuestion[] {
  let questions: unknown[]

  if (Array.isArray(parsed)) {
    questions = parsed
  } else if (isPlainObject(parsed) && Array.isArray(parsed.questions)) {
    questions = parsed.questions
  } else {
    throw new Error('JSON root must be an array or an object with a "questions" array')
  }

  if (questions.length === 0) {
    throw new Error('JSON does not contain any questions')
  }

  return questions.map(validateQuestion)
}

export function parseQuestionsJson(value: string): ParsedQuestion[] {
  try {
    return extractQuestions(JSON.parse(value))
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error(`Invalid JSON: ${err.message}`)
    }
    throw err
  }
}

export function readJsonFile(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = event => {
      const result = event.target?.result
      resolve(typeof result === 'string' ? result : '')
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

interface ValidationError {
  question_index?: number
  field?: string
  message: string
}

interface DetailObject {
  message?: string
  errors: ValidationError[]
}

const formatErrorList = (errors: ValidationError[]): string[] => {
  const lines = errors.slice(0, 5).map(err => {
    const question = err.question_index ? `Q${err.question_index}` : 'Question'
    const field = err.field ? ` ${err.field}` : ''
    return `${question}${field}: ${err.message}`
  })
  if (errors.length > 5) lines.push(`...and ${errors.length - 5} more`)
  return lines
}

const formatArrayDetail = (detail: unknown[]): string =>
  detail.map(item => {
    if (isPlainObject(item)) {
      const message = item.msg ?? item.message
      return typeof message === 'string' ? message : String(item)
    }
    return String(item)
  }).join('; ')

const formatErrorsObject = (detail: DetailObject): string => {
  const lines = formatErrorList(detail.errors)
  return [detail.message, ...lines].filter(Boolean).join(' | ')
}

const formatServerDetail = (detail: unknown): string => {
  if (!detail) return 'Failed to upload questions file'
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return formatArrayDetail(detail)
  if (isDetailObject(detail)) return formatErrorsObject(detail)
  if (isPlainObject(detail) && typeof detail.message === 'string') return detail.message
  return JSON.stringify(detail)
}

const isDetailObject = (value: unknown): value is DetailObject =>
  isPlainObject(value) && Array.isArray(value.errors)

export interface JSONUploadFormProps {
  onAdd: (questions: ParsedQuestion[]) => Promise<void>
  onUploadFile: (file: File) => Promise<QuestionsUploadResponse>
  onClose: () => void
}

export default function JSONUploadForm({ onAdd, onUploadFile, onClose }: JSONUploadFormProps): ReactElement {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<ParsedQuestion[] | null>(null)
  const [error, setError] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileLoading, setFileLoading] = useState(false)
  const [fileMessage, setFileMessage] = useState('')
  const [fileError, setFileError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const uploadFileRef = useRef<HTMLInputElement>(null)

  const validate = (value: string): void => {
    setError('')
    setPreview(null)
    if (!value.trim()) return

    try {
      setPreview(parseQuestionsJson(value))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to parse JSON')
    }
  }

  const handleChange = (value: string): void => {
    setText(value)
    validate(value)
  }

  const loadFile = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const content = await readJsonFile(file)
      setText(content)
      validate(content)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to read JSON file'
      setError(message)
      toast.error(message)
    }
  }

  const loadSample = () => {
    setText(SAMPLE_JSON)
    validate(SAMPLE_JSON)
  }

  const handleUploadFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0] || null
    setSelectedFile(file)
    setFileMessage('')
    setFileError('')
  }

  const submitFile = async () => {
    if (!selectedFile) { toast.error('Select a JSON file first'); return }
    if (!selectedFile.name.toLowerCase().endsWith('.json')) { toast.error('Only .json files are accepted'); return }

    setFileLoading(true)
    setFileMessage('')
    setFileError('')
    try {
      const result = await onUploadFile(selectedFile)
      const message = result?.message || `Imported ${result?.imported_count || 0} questions from JSON file`
      setFileMessage(message)
      setSelectedFile(null)
      if (uploadFileRef.current) uploadFileRef.current.value = ''
      toast.success(message)
    } catch (err: unknown) {
      const message = formatServerDetail(getErrorDetail(err))
      setFileError(message)
      toast.error(message)
    } finally {
      setFileLoading(false)
    }
  }

  const submit = async () => {
    if (!preview || preview.length === 0) { toast.error('No valid questions to upload'); return }

    setLoading(true)
    setError('')
    try {
      await onAdd(preview)
      toast.success(`${preview.length} questions added!`)
      onClose()
    } catch (err: unknown) {
      const message = formatServerDetail(getErrorDetail(err)) || 'Failed to add questions'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }

  }

  return (
    <div className="gate-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold theme-text">Upload Questions via JSON</h4>
        <button onClick={onClose} aria-label="Close" className="theme-muted hover:opacity-80">
          <X size={16}/>
        </button>
      </div>

      <div className="px-3 py-3 rounded-lg border theme-panel-card space-y-3">
        <div>
          <label className="label">Upload JSON file directly</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              ref={uploadFileRef}
              type="file"
              accept=".json,application/json"
              onChange={handleUploadFileChange}
              className="input text-sm flex-1"
            />
            <button
              onClick={submitFile}
              disabled={fileLoading || !selectedFile}
              className="btn-primary flex items-center justify-center gap-2 text-sm py-2 sm:w-64"
            >
              {fileLoading ? <Spinner size={14}/> : <Upload size={14}/>}
              {fileLoading ? 'Uploading...' : 'Upload Questions File (.json)'}
            </button>
          </div>
        </div>
        {fileMessage && (
          <div className={ALERT_STYLE.success}>
            {fileMessage}
          </div>
        )}
        {fileError && (
          <div className={ALERT_STYLE.error}>
            {fileError}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button onClick={() => fileRef.current?.click()} className="btn-ghost flex items-center gap-2 text-sm py-2">
          <Upload size={14}/> Load File into Editor
        </button>
        <button onClick={loadSample} className="btn-ghost flex items-center gap-2 text-sm py-2">
          <FileJson size={14}/> Load Sample
        </button>
        <input type="file" accept=".json" ref={fileRef} className="hidden" onChange={loadFile} />
      </div>

      <div className="px-3 py-2 rounded-lg border theme-panel-card text-xs theme-muted">
        Format: <span className="font-mono theme-muted">{"{ \"questions\": [ { question_type, question_text, options, correct_answer, marks, negative_marks } ] }"}</span>
        <br/>
        question_type: <span className="text-info-text">mcq</span> / <span className="text-warning-text">msq</span> / <span className="text-success-text">nat</span>
        {' '} &middot; correct_answer: <span className="text-info-text">A</span> or <span className="text-warning-text">A,C</span> or <span className="text-success-text">42</span>
      </div>

      <div>
        <label className="label">Paste JSON here</label>
        <textarea
          className="input resize-none font-mono text-xs"
          rows={10}
          value={text}
          onChange={event => handleChange(event.target.value)}
          placeholder={'{\n  "questions": [\n    {\n      "question_type": "mcq",\n      "question_text": "Your question here?",\n      "options": ["A text", "B text", "C text", "D text"],\n      "correct_answer": "B",\n      "marks": 1,\n      "negative_marks": 0.33\n    }\n  ]\n}'}
        />
      </div>

      {error && (
        <div className={ALERT_STYLE.error}>
          {error}
        </div>
      )}

      {preview && !error && (
        <div className={ALERT_STYLE.success}>
          Valid JSON - {preview.length} question{preview.length !== 1 ? 's' : ''} ready to upload
          <div className="mt-1 space-y-0.5">
            {preview.slice(0, 3).map((question, idx) => (
              <p key={`${question.question_type}-${idx}`} className="opacity-80 text-xs truncate">
                {idx + 1}. [{question.question_type?.toUpperCase()}] {question.question_text}
              </p>
            ))}
            {preview.length > 3 && <p className="opacity-60 text-xs">...and {preview.length - 3} more</p>}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
        <button
          onClick={submit}
          disabled={loading || !preview || !!error}
          className="btn-primary flex-1 flex items-center justify-center gap-2"
        >
          {loading && <Spinner size={14}/>}
          {loading ? 'Uploading...' : `Upload ${preview ? preview.length : 0} Questions`}
        </button>
      </div>
    </div>
  )
}

function getErrorDetail(error: unknown): unknown {
  if (!error || typeof error !== 'object') return undefined
  const response = 'response' in error ? error.response : undefined
  if (!response || typeof response !== 'object') return undefined
  const data = 'data' in response ? response.data : undefined
  if (!data || typeof data !== 'object') return undefined
  return 'detail' in data ? data.detail : undefined
}
