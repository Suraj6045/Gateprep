import MathText from '../shared/MathText'
import type { TestQuestion } from '@/types/api'

export interface QuestionBodyProps {
  question: TestQuestion
}

export default function QuestionBody({ question }: QuestionBodyProps): React.ReactElement {
  const imageUrl = question.question_image_url
  return (
    <div className="mb-4">
      <div className="leading-relaxed whitespace-pre-wrap text-foreground">
        <MathText>{question.question_text}</MathText>
      </div>
      {imageUrl && (
        <img
          src={imageUrl}
          alt="question"
          loading="eager"
          {...{ fetchpriority: 'high' }}
          decoding="async"
          className="mt-3 w-full max-w-2xl max-h-64 object-contain rounded cursor-pointer border bg-muted aspect-[21/9] border-border"
          onClick={() => window.open(imageUrl, '_blank')}
        />
      )}
    </div>
  )
}
