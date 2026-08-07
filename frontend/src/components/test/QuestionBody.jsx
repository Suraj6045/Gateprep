import MathText from '../shared/MathText'

export default function QuestionBody({ question }) {
  return (
    <div className="mb-4">
      <div className="leading-relaxed whitespace-pre-wrap text-foreground">
        <MathText>{question.question_text}</MathText>
      </div>
      {question.question_image_url && (
        <img
          src={question.question_image_url}
          alt="question"
          loading="eager"
          fetchpriority="high"
          decoding="async"
          className="mt-3 w-full max-w-2xl max-h-64 object-contain rounded cursor-pointer border bg-muted aspect-[21/9] border-border"
          onClick={() => window.open(question.question_image_url, '_blank')}
        />
      )}
    </div>
  )
}
