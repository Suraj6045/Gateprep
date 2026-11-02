import EmptyQuestionsState from './EmptyQuestionsState'
import QuestionCard from './QuestionCard'
import type { ReactElement } from 'react'
import type { AdminQuestion } from './questionUtils'
import type { QuestionIn } from '@/types/api'

export interface QuestionsListProps {
  questions: AdminQuestion[]
  onOpenJson: () => void
  onOpenManual: () => void
  onDelete: (questionId: number) => void
  onUpdate: (questionId: number, payload: QuestionIn) => Promise<void>
  onUploadImage: (questionId: number, file: File, target?: 'question' | 'A' | 'B' | 'C' | 'D') => Promise<void>
  onDeleteImage: (questionId: number, target: 'question' | 'A' | 'B' | 'C' | 'D') => Promise<void>
}

export default function QuestionsList({ questions, onOpenJson, onOpenManual, onDelete, onUpdate, onUploadImage, onDeleteImage }: QuestionsListProps): ReactElement {
  if (questions.length === 0) {
    return <EmptyQuestionsState onOpenJson={onOpenJson} onOpenManual={onOpenManual} />
  }

  return (
    <>
      {questions.map((question, idx) => (
        <QuestionCard
          key={question.id}
          q={question}
          idx={idx}
          onDelete={onDelete}
          onUpdate={onUpdate}
          onUploadImage={onUploadImage}
          onDeleteImage={onDeleteImage}
        />
      ))}
    </>
  )
}
