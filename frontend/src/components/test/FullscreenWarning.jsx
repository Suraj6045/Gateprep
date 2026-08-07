import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle'
import Maximize from 'lucide-react/dist/esm/icons/maximize'
import TimerDisplay from './TimerDisplay'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

export default function FullscreenWarning({
  endTimeMs,
  fsViolations,
  handleTimerExpire,
  setShowConfirm,
  setShowFsWarning,
}) {
  return (
    <Dialog open={true}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={e => e.preventDefault()}
        onPointerDownOutside={e => e.preventDefault()}
        onInteractOutside={e => e.preventDefault()}
        className="text-center p-8 sm:max-w-sm border border-destructive/40"
      >
        <AlertTriangle size={44} className="text-destructive mx-auto" />
        <DialogTitle className="text-xl font-bold">You exited fullscreen!</DialogTitle>
        <DialogDescription asChild>
          <div>
            <p className="text-sm text-muted-foreground">The timer is still running.</p>
            <p className="text-destructive font-semibold mt-1">Violation {fsViolations}/3</p>
            <p className="text-xs text-muted-foreground mt-1">3 violations = test auto-submitted</p>
          </div>
        </DialogDescription>
        <TimerDisplay
          endTime={endTimeMs}
          onExpire={handleTimerExpire}
          announceWarnings={false}
          className="text-3xl font-mono font-bold"
          lowClassName="text-destructive timer-critical"
          normalClassName="text-foreground"
        />
        <div className="flex flex-col gap-3">
          <Button
            onClick={() => {
              document.documentElement.requestFullscreen?.()
                .then(() => setShowFsWarning(false))
                .catch(() => setShowFsWarning(false))
            }}
            className="w-full flex items-center justify-center gap-2"
          >
            <Maximize size={16} /> Return to Fullscreen
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              setShowFsWarning(false)
              setShowConfirm(true)
            }}
            className="w-full"
          >
            Submit Test Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
