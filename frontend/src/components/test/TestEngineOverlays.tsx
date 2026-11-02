import FullscreenWarning from './FullscreenWarning'
import Calculator from './Calculator'
import ConfirmSubmitModal from './ConfirmSubmitModal'
import type { TestQuestion } from '@/types/api'

export interface TestEngineOverlaysProps {
  endTimeMs: number | null
  fsViolations: number
  handleTimerExpire: () => void
  setShowConfirm: React.Dispatch<React.SetStateAction<boolean>>
  setShowFsWarning: React.Dispatch<React.SetStateAction<boolean>>
  showFsWarning: boolean
  showCalc: boolean
  setShowCalc: React.Dispatch<React.SetStateAction<boolean>>
  showConfirm: boolean
  answered: number
  doSubmit: (auto?: boolean) => void
  marked: Set<number>
  notAnswered: number
  questions: TestQuestion[]
  submitting: boolean
}

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
}: TestEngineOverlaysProps): React.ReactElement {
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
