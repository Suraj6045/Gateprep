import QuestionView from '../components/test/QuestionView'
import TestHeader from '../components/test/TestHeader'
import TestEngineStageGate from '../components/test/TestEngineStageGate'
import TestEngineSidebar from '../components/test/TestEngineSidebar'
import TestEngineOverlays from '../components/test/TestEngineOverlays'
import QuestionPaletteSheet from '../components/test/QuestionPaletteSheet'
import useTestEngine from '../hooks/useTestEngine'

export default function TestEngine() {
  const engine = useTestEngine()
  const {
    accepted, answered, answers, attemptNumber, beginTest, clearResponse,
    commitNAT, current, currentQuestion, doSubmit, endTimeMs, fsViolations,
    handleTimerExpire, loading, markAndNext, marked, maxAttempts, natInput,
    navigate, notAnswered, questionGroups, questions, saveAndNext, setAccepted,
    setCurrent, setMCQ, setNatInput, setShowCalc, setShowConfirm, setShowFsWarning,
    setShowPalette, showCalc, showConfirm, showFsWarning, showPalette, started,
    starting, subjects, submitting, test, toggleMSQ, totalViolations, visited,
  } = engine

  const sidebar = (
    <TestEngineSidebar
      answered={answered}
      answers={answers}
      currentQuestion={currentQuestion}
      marked={marked}
      notAnswered={notAnswered}
      setCurrent={setCurrent}
      setShowPalette={setShowPalette}
      setShowConfirm={setShowConfirm}
      questionGroups={questionGroups}
      questions={questions}
      submitting={submitting}
      visited={visited}
    />
  )

  return (
    <TestEngineStageGate
      loading={loading}
      started={started}
      currentQuestion={currentQuestion}
      accepted={accepted}
      beginTest={beginTest}
      navigate={navigate}
      setAccepted={setAccepted}
      starting={starting}
      test={test}
    >
      <div className="theme-surface h-screen flex flex-col overflow-hidden select-none">
        <TestEngineOverlays
          endTimeMs={endTimeMs}
          fsViolations={fsViolations}
          handleTimerExpire={handleTimerExpire}
          setShowConfirm={setShowConfirm}
          setShowFsWarning={setShowFsWarning}
          showFsWarning={showFsWarning}
          showCalc={showCalc}
          setShowCalc={setShowCalc}
          showConfirm={showConfirm}
          answered={answered}
          doSubmit={doSubmit}
          marked={marked}
          notAnswered={notAnswered}
          questions={questions}
          submitting={submitting}
        />

        <TestHeader
          attemptNumber={attemptNumber}
          currentQuestion={currentQuestion}
          endTimeMs={endTimeMs}
          handleTimerExpire={handleTimerExpire}
          maxAttempts={maxAttempts}
          onSubmitClick={() => setShowConfirm(true)}
          questions={questions}
          setCurrent={setCurrent}
          setShowCalc={setShowCalc}
          showCalc={showCalc}
          subjects={subjects}
          submitting={submitting}
          test={test}
          totalViolations={totalViolations}
        />

        <div className="flex flex-1 overflow-hidden">
          <QuestionView
            answers={answers}
            clearResponse={clearResponse}
            commitNAT={commitNAT}
            current={current}
            markAndNext={markAndNext}
            natInput={natInput}
            question={currentQuestion}
            questions={questions}
            saveAndNext={saveAndNext}
            setCurrent={setCurrent}
            setMCQ={setMCQ}
            setNatInput={setNatInput}
            toggleMSQ={toggleMSQ}
          />

          <div className="hidden md:flex w-52 border-l flex-col flex-shrink-0 overflow-y-auto theme-sidebar-surface">
            {sidebar}
          </div>

          <QuestionPaletteSheet
            current={current}
            questions={questions}
            showPalette={showPalette}
            setShowPalette={setShowPalette}
          >
            {sidebar}
          </QuestionPaletteSheet>
        </div>
      </div>
    </TestEngineStageGate>
  )
}
