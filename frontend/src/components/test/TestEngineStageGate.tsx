import LoadingScreen from './LoadingScreen'
import InstructionScreen from './InstructionScreen'
import EmptyQuestionsScreen from './EmptyQuestionsScreen'
import type { TestDetail, TestQuestion } from '@/types/api'

export interface TestEngineStageGateProps {
  loading: boolean
  started: boolean
  currentQuestion?: TestQuestion
  accepted: boolean
  beginTest: () => Promise<void>
  navigate: (to: string) => void
  setAccepted: React.Dispatch<React.SetStateAction<boolean>>
  starting: boolean
  test: TestDetail | null
  children?: React.ReactNode
}

export default function TestEngineStageGate({
  loading,
  started,
  currentQuestion,
  accepted,
  beginTest,
  navigate,
  setAccepted,
  starting,
  test,
  children
}: TestEngineStageGateProps): React.ReactNode {
  if (loading) return <LoadingScreen />

  if (!started) {
    return (
      <InstructionScreen
        accepted={accepted}
        beginTest={beginTest}
        navigate={navigate}
        setAccepted={setAccepted}
        starting={starting}
        test={test}
      />
    )
  }

  if (!currentQuestion) return <EmptyQuestionsScreen navigate={navigate} />

  return children
}
