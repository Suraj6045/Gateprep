import QuestionMetaBar from './QuestionMetaBar'
import QuestionBody from './QuestionBody'
import McqOptions from './McqOptions'
import MsqOptions from './MsqOptions'
import NatInput from './NatInput'
import QuestionFooter from './QuestionFooter'
import type { OptionQuestion } from './McqOptions'
import type { TestQuestion } from '@/types/api'

export interface QuestionViewProps {
  answers: Record<number, string | undefined>
  clearResponse: () => void
  commitNAT: () => void
  current: number
  markAndNext: () => void
  natInput: string
  question: OptionQuestion
  questions: TestQuestion[]
  saveAndNext: () => void
  setCurrent: React.Dispatch<React.SetStateAction<number>>
  setMCQ: (letter: string) => void
  setNatInput: (value: string) => void
  toggleMSQ: (letter: string) => void
}

export default function QuestionView({
  answers,
  clearResponse,
  commitNAT,
  current,
  markAndNext,
  natInput,
  question,
  questions,
  saveAndNext,
  setCurrent,
  setMCQ,
  setNatInput,
  toggleMSQ,
}: QuestionViewProps): React.ReactElement {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <QuestionMetaBar question={question} />

      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-sm font-semibold mb-3 text-foreground">
          Question No. {current + 1}
        </p>

        <QuestionBody question={question} />

        {question.question_type === 'mcq' && (
          <McqOptions
            question={question}
            selectedLetter={answers[question.id]}
            onSelect={setMCQ}
          />
        )}

        {question.question_type === 'msq' && (
          <MsqOptions
            question={question}
            selectedLetters={answers[question.id] || ''}
            onToggle={toggleMSQ}
          />
        )}

        {question.question_type === 'nat' && (
          <NatInput
            value={natInput}
            onChange={setNatInput}
            onCommit={commitNAT}
            savedValue={answers[question.id]}
          />
        )}
      </div>

      <QuestionFooter
        current={current}
        isLastQuestion={current === questions.length - 1}
        setCurrent={setCurrent}
        markAndNext={markAndNext}
        clearResponse={clearResponse}
        saveAndNext={saveAndNext}
      />
    </div>
  )
}
