import EmptyQuestionsState from './EmptyQuestionsState'
import QuestionCard from './QuestionCard'

export default function QuestionsList({ questions, onOpenJson, onOpenManual, onDelete, onUpdate, onUploadImage, onDeleteImage }) {
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
