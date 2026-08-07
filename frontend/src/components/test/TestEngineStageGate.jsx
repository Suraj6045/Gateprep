import LoadingScreen from './LoadingScreen'
import InstructionScreen from './InstructionScreen'
import EmptyQuestionsScreen from './EmptyQuestionsScreen'

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
}) {
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
