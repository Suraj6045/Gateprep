import { useState } from 'react'
import toast from 'react-hot-toast'
import { Save, X } from 'lucide-react'
import Spinner from '../shared/Spinner'
import { OPTION_LETTERS, optionsFromQuestion } from './questionUtils'
import { Button } from '@/components/ui/button'
import { CustomSelect } from '@/components/ui/select'
import type { ChangeEvent, FormEvent, ReactElement } from 'react'
import { isQuestionType } from './questionUtils'
import type { AdminQuestion, QuestionFormState, QuestionType } from './questionUtils'
import type { QuestionIn } from '@/types/api'

export interface QuestionEditFormProps {
  question: AdminQuestion
  onSave: (question: QuestionIn) => Promise<void>
  onCancel: () => void
}

export default function QuestionEditForm({ question, onSave, onCancel }: QuestionEditFormProps): ReactElement {
  const [form, setForm] = useState<QuestionFormState>(() => ({
    question_type: question.question_type || 'mcq',
    question_text: question.question_text || '',
    options: optionsFromQuestion(question.options),
    correct_answer: question.correct_answer || '',
    marks: question.marks ?? 1,
    negative_marks: question.negative_marks ?? 0.33,
    subject: question.subject || '',
    topic: question.topic || '',
  }))
  const [saving, setSaving] = useState(false)
  const isNAT = form.question_type === 'nat'
  const isMSQ = form.question_type === 'msq'

  const setOption = (idx: number, value: string): void => {
    setForm(prev => ({
      ...prev,
      options: prev.options.map((option, optionIdx) => (optionIdx === idx ? value : option)),
    }))
  }

  const setType = (questionType: QuestionType): void => {
    setForm(prev => ({
      ...prev,
      question_type: questionType,
      correct_answer: '',
      negative_marks: questionType === 'mcq' ? 0.33 : 0,
    }))
  }

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    const marks = Number(form.marks)
    const negativeMarks = Number(form.negative_marks)

    if (!form.question_text.trim()) { toast.error('Question text required'); return }
    if (!isNAT && form.options.some(option => !option.trim())) { toast.error('Fill all 4 options'); return }
    if (!form.correct_answer.trim()) { toast.error('Correct answer required'); return }
    if (!Number.isFinite(marks) || marks <= 0) { toast.error('Marks must be greater than 0'); return }
    if (!Number.isFinite(negativeMarks) || negativeMarks < 0) { toast.error('Negative marks cannot be below 0'); return }

    const payload = {
      ...form,
      question_text: form.question_text.trim(),
      options: isNAT ? [] : form.options.map(option => option.trim()),
      correct_answer: form.correct_answer.trim().toUpperCase(),
      marks,
      negative_marks: (isMSQ || isNAT) ? 0 : negativeMarks,
      subject: form.subject.trim() || null,
      topic: form.topic.trim() || null,
    }

    setSaving(true)
    try {
      await onSave(payload)
      toast.success('Question updated')
    } catch (err: unknown) {
      toast.error(getErrorDetail(err) || 'Failed to update question')
    } finally {
      setSaving(false)
    }

    function getErrorDetail(error: unknown): string | undefined {
      if (!error || typeof error !== 'object') return undefined
      const response = 'response' in error && error.response
      if (!response || typeof response !== 'object') return undefined
      const data = 'data' in response && response.data
      if (!data || typeof data !== 'object') return undefined
      const detail = 'detail' in data ? data.detail : undefined
      return typeof detail === 'string' ? detail : undefined
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label" htmlFor="question-edit-type-select">Type</label>
          <CustomSelect
            id="question-edit-type-select"
            value={form.question_type}
            onChange={val => {
              if (isQuestionType(val)) setType(val)
            }}
            options={[
              { value: 'mcq', label: 'MCQ (Single)' },
              { value: 'msq', label: 'MSQ (Multi)' },
              { value: 'nat', label: 'NAT (Numerical)' },
            ]}
          />
        </div>
        <div>
          <label className="label">Marks</label>
          <input
            type="number"
            className="input"
            value={form.marks}
            step={0.5}
            min={0.5}
            onChange={event => setForm(prev => ({ ...prev, marks: event.target.value }))}
          />
        </div>
        <div>
          <label className="label">Neg. Marks</label>
          <input
            type="number"
            className="input"
            value={form.negative_marks}
            step={0.01}
            min={0}
            disabled={isMSQ || isNAT}
            onChange={event => setForm(prev => ({ ...prev, negative_marks: event.target.value }))}
          />
        </div>
      </div>

      <div>
        <label className="label">Question Text *</label>
        <textarea
          className="input resize-none"
          rows={4}
          value={form.question_text}
          onChange={event => setForm(prev => ({ ...prev, question_text: event.target.value }))}
        />
      </div>

      {!isNAT && (
        <div className="grid grid-cols-2 gap-2">
          {OPTION_LETTERS.map((letter, idx) => (
            <div key={letter}>
              <label className="label">Option {letter}</label>
              <input className="input" value={form.options[idx]} onChange={event => setOption(idx, event.target.value)} />
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="label">
            {isNAT ? 'Answer' : isMSQ ? 'Correct (e.g. A,C)' : 'Correct (A/B/C/D)'}
          </label>
          <input
            className="input font-mono"
            value={form.correct_answer}
            onChange={event => setForm(prev => ({ ...prev, correct_answer: event.target.value.toUpperCase() }))}
          />
        </div>
        <div>
          <label className="label">Subject</label>
          <input className="input" value={form.subject} onChange={event => setForm(prev => ({ ...prev, subject: event.target.value }))} />
        </div>
        <div>
          <label className="label">Topic</label>
          <input className="input" value={form.topic} onChange={event => setForm(prev => ({ ...prev, topic: event.target.value }))} />
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex items-center justify-center gap-2 text-sm">
          <X size={14}/> Cancel
        </Button>
        <Button type="submit" disabled={saving} className="flex items-center justify-center gap-2 text-sm">
          {saving ? <Spinner size={14}/> : <Save size={14}/>}
          {saving ? 'Saving...' : 'Save Question'}
        </Button>
      </div>
    </form>
  )
}
