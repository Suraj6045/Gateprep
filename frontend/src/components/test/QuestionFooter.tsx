import { ChevronLeft, ChevronRight, Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface QuestionFooterProps {
  current: number
  isLastQuestion: boolean
  setCurrent: React.Dispatch<React.SetStateAction<number>>
  markAndNext: () => void
  clearResponse: () => void
  saveAndNext: () => void
}

export default function QuestionFooter({ current, isLastQuestion, setCurrent, markAndNext, clearResponse, saveAndNext }: QuestionFooterProps): React.ReactElement {
  return (
    <div className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-2.5 border-t border-border flex-shrink-0 gap-1 bg-card text-card-foreground">
      <div className="flex items-center gap-1 sm:gap-2">
        <Button variant="outline" onClick={markAndNext} size="sm" className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 text-xs font-medium">
          <Flag size={14} className="text-[var(--marked-text)]" /> <span className="hidden sm:inline">Mark & Next</span>
        </Button>
        <Button variant="outline" onClick={clearResponse} size="sm" className="px-2 sm:px-3 text-xs font-medium">
          Clear
        </Button>
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => current > 0 && setCurrent(c => c - 1)}
          disabled={current === 0}
          className="flex items-center gap-1 px-2 sm:px-3 text-xs font-medium"
        >
          <ChevronLeft size={13} /> <span className="hidden sm:inline">Prev</span>
        </Button>
        <Button onClick={saveAndNext} size="sm" className="flex items-center gap-1 px-3 sm:px-4 text-xs font-semibold">
          {isLastQuestion ? 'Save' : 'Save & Next'}
          {!isLastQuestion && <ChevronRight size={13} />}
        </Button>
      </div>
    </div>
  )
}
