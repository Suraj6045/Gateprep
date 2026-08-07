import { useState } from 'react'
import toast from 'react-hot-toast'
import X from 'lucide-react/dist/esm/icons/x'
import Spinner from '../shared/Spinner'
import { EMPTY_QUESTION, OPTION_LETTERS } from './questionUtils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function QuestionForm({ onAdd, onClose }) {
  const [question, setQuestion] = useState({ ...EMPTY_QUESTION, options: ['', '', '', ''] })
  const [loading, setLoading] = useState(false)
  const isNAT = question.question_type === 'nat'
  const isMSQ = question.question_type === 'msq'

  const setOption = (idx, value) => {
    setQuestion(prev => ({
      ...prev,
      options: prev.options.map((option, optionIdx) => (optionIdx === idx ? value : option)),
    }))
  }

  const submit = async () => {
    if (!question.question_text.trim()) { toast.error('Question text required'); return }
    if (!isNAT && question.options.some(option => !option.trim())) { toast.error('Fill all 4 options'); return }
    if (!question.correct_answer.trim()) { toast.error('Correct answer required'); return }

    setLoading(true)
    try {
      const payload = {
        ...question,
        options: isNAT ? [] : question.options,
        negative_marks: (isMSQ || isNAT) ? 0 : question.negative_marks,
      }
      await onAdd(payload)
      setQuestion({ ...EMPTY_QUESTION, options: ['', '', '', ''] })
      toast.success('Question added')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold theme-text">Add Question Manually</h4>
        <button onClick={onClose} aria-label="Close" className="theme-muted hover:opacity-80">
          <X size={16}/>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">Type</label>
          <select
            className="input"
            value={question.question_type}
            onChange={event => setQuestion(prev => ({
              ...prev,
              question_type: event.target.value,
              correct_answer: '',
              negative_marks: event.target.value === 'mcq' ? 0.33 : 0,
            }))}
          >
            <option value="mcq">MCQ (Single)</option>
            <option value="msq">MSQ (Multi)</option>
            <option value="nat">NAT (Numerical)</option>
          </select>
        </div>
        <div>
          <label className="label">Marks</label>
          <input
            type="number"
            className="input"
            value={question.marks}
            step={0.5}
            min={0.5}
            onChange={event => setQuestion(prev => ({ ...prev, marks: +event.target.value }))}
          />
        </div>
        <div>
          <label className="label">Neg. Marks</label>
          <input
            type="number"
            className="input"
            value={question.negative_marks}
            step={0.01}
            min={0}
            disabled={isMSQ || isNAT}
            onChange={event => setQuestion(prev => ({ ...prev, negative_marks: +event.target.value }))}
          />
        </div>
      </div>

      <div>
        <label className="label">Question Text *</label>
        <textarea
          className="input resize-none"
          rows={3}
          value={question.question_text}
          onChange={event => setQuestion(prev => ({ ...prev, question_text: event.target.value }))}
          placeholder="Enter question..."
        />
      </div>

      {!isNAT && (
        <div className="grid grid-cols-2 gap-2">
          {OPTION_LETTERS.map((letter, idx) => (
            <div key={letter}>
              <label className="label">Option {letter}</label>
              <input
                className="input"
                value={question.options[idx]}
                onChange={event => setOption(idx, event.target.value)}
                placeholder={`Option ${letter}`}
              />
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">
            {isNAT ? 'Answer (e.g. 42 or 41.5-42.5)' : isMSQ ? 'Correct (e.g. A,C)' : 'Correct (A/B/C/D)'}
          </label>
          <input
            className="input font-mono"
            value={question.correct_answer}
            onChange={event => setQuestion(prev => ({ ...prev, correct_answer: event.target.value.toUpperCase() }))}
            placeholder={isNAT ? '42 or 41.5-42.5' : isMSQ ? 'A,C' : 'A'}
          />
        </div>
        <div>
          <label className="label">Subject (optional)</label>
          <input
            className="input"
            value={question.subject}
            onChange={event => setQuestion(prev => ({ ...prev, subject: event.target.value }))}
            placeholder="e.g. Digital Logic"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
        <Button onClick={submit} disabled={loading} className="flex-1 flex items-center justify-center gap-2">
          {loading && <Spinner size={14}/>} Add Question
        </Button>
      </div>
      </CardContent>
    </Card>
  )
}
