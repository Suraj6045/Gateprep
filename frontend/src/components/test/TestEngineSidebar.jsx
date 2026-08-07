import TestSidebar from './TestSidebar'

export default function TestEngineSidebar({
  answered,
  answers,
  currentQuestion,
  marked,
  notAnswered,
  setCurrent,
  setShowPalette,
  setShowConfirm,
  questionGroups,
  questions,
  submitting,
  visited,
}) {
  return (
    <TestSidebar
      answered={answered}
      answers={answers}
      currentQuestion={currentQuestion}
      marked={marked}
      notAnswered={notAnswered}
      onQuestionSelect={(index) => {
        setCurrent(index)
        setShowPalette(false)
      }}
      onSubmitClick={() => setShowConfirm(true)}
      questionGroups={questionGroups}
      questions={questions}
      submitting={submitting}
      visited={visited}
    />
  )
}
