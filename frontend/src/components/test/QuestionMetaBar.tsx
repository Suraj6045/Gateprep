import type { TestQuestion } from '@/types/api'

const TYPE_LABELS: Record<string, string> = {
  mcq: 'MCQ',
  msq: 'MSQ',
  nat: 'NAT',
}

export interface QuestionMetaBarProps {
  question: TestQuestion
}

export default function QuestionMetaBar({ question }: QuestionMetaBarProps): React.ReactElement {
  const typeLabel = TYPE_LABELS[question.question_type] ?? question.question_type

  return (
    <div className="px-3 sm:px-4 py-1.5 text-xs border-b border-border flex items-center flex-wrap gap-2 sm:gap-4 flex-shrink-0 bg-card text-card-foreground">
      <span className="text-muted-foreground">
        Question Type: <strong className="text-foreground">{typeLabel}</strong>
      </span>
      <span className="text-muted-foreground">
        Marks: <strong className="text-success-text">+{question.marks}</strong>
        {question.negative_marks !== undefined && question.negative_marks > 0 && (
          <span className="text-destructive ml-1">/ -{question.negative_marks}</span>
        )}
      </span>
    </div>
  )
}
