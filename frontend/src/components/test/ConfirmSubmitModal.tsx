import { AlertTriangle } from 'lucide-react'
import Spinner from '../shared/Spinner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

export interface ConfirmSubmitModalProps {
  answered: number
  doSubmit: (auto?: boolean) => void
  marked: ReadonlySet<number>
  notAnswered: number
  questions: TestQuestion[]
  setShowConfirm: React.Dispatch<React.SetStateAction<boolean>>
  submitting: boolean
}

import type { TestQuestion } from '@/types/api'

export default function ConfirmSubmitModal({
  answered,
  doSubmit,
  marked,
  notAnswered,
  questions,
  setShowConfirm,
  submitting,
}: ConfirmSubmitModalProps): React.ReactElement {
  return (
    <Dialog open={true} onOpenChange={open => { if (!open && !submitting) setShowConfirm(false) }}>
      <DialogContent showCloseButton={false} className="p-6 sm:max-w-sm">
        <div className="flex items-center gap-3">
          <AlertTriangle size={22} className="text-warning-text" />
          <DialogTitle className="font-bold text-lg">Submit Test?</DialogTitle>
        </div>
        <DialogDescription asChild>
          <div className="space-y-1.5 text-sm">
            {[
              ['Total Questions', questions.length, 'text-foreground'],
              ['Answered', answered, 'text-[var(--success-text)]'],
              ['Not Answered', notAnswered, 'text-[var(--danger-text)]'],
              ['Marked', marked.size, 'text-[var(--marked-text)]'],
            ].map(([label, val, colorClass]) => (
              <div key={label} className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">{label}</span>
                <span className={`font-semibold ${colorClass}`}>{val}</span>
              </div>
            ))}
          </div>
        </DialogDescription>
        <p className="text-xs text-muted-foreground">
          This cannot be undone. Your answers will be evaluated.
        </p>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => setShowConfirm(false)} disabled={submitting} className="flex-1">Go Back</Button>
          <Button
            onClick={() => doSubmit(false)}
            disabled={submitting}
            aria-busy={submitting}
            className="flex-1 flex items-center justify-center gap-2"
          >
            {submitting && <Spinner size={13} />}
            {submitting ? 'Submitting…' : 'Submit'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
