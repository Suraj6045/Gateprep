import TestSidebar from './TestSidebar'
import type { TestSidebarProps } from './TestSidebar'

export type TestEngineSidebarProps = Omit<TestSidebarProps, 'onQuestionSelect' | 'onSubmitClick'> & {
  setCurrent: React.Dispatch<React.SetStateAction<number>>
  setShowPalette: React.Dispatch<React.SetStateAction<boolean>>
  setShowConfirm: React.Dispatch<React.SetStateAction<boolean>>
}

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
  isFullLength,
  candidateName,
  onToggleCollapse,
}: TestEngineSidebarProps): React.ReactElement {
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
      isFullLength={isFullLength}
      candidateName={candidateName}
      onToggleCollapse={onToggleCollapse}
    />
  )
}
