import FullscreenWarning from './FullscreenWarning'
import Calculator from './Calculator'
import ConfirmSubmitModal from './ConfirmSubmitModal'

export default function TestEngineOverlays({
  endTimeMs,
  fsViolations,
  handleTimerExpire,
  setShowConfirm,
  setShowFsWarning,
  showFsWarning,
  showCalc,
  setShowCalc,
  showConfirm,
  answered,
  doSubmit,
  marked,
  notAnswered,
  questions,
  submitting,
}) {
  return (
    <>
      {showFsWarning && (
        <FullscreenWarning
          endTimeMs={endTimeMs}
          fsViolations={fsViolations}
          handleTimerExpire={handleTimerExpire}
          setShowConfirm={setShowConfirm}
          setShowFsWarning={setShowFsWarning}
        />
      )}

      {showCalc && <Calculator onClose={() => setShowCalc(false)} />}

      {showConfirm && (
        <ConfirmSubmitModal
          answered={answered}
          doSubmit={doSubmit}
          marked={marked}
          notAnswered={notAnswered}
          questions={questions}
          setShowConfirm={setShowConfirm}
          submitting={submitting}
        />
      )}
    </>
  )
}
