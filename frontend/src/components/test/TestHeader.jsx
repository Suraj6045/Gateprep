import CalcIcon from 'lucide-react/dist/esm/icons/calculator'
import Send from 'lucide-react/dist/esm/icons/send'
import clsx from 'clsx'
import Spinner from '../shared/Spinner'
import TimerDisplay from './TimerDisplay'

export default function TestHeader({
  attemptNumber,
  currentQuestion,
  endTimeMs,
  handleTimerExpire,
  maxAttempts,
  onSubmitClick,
  questions,
  setCurrent,
  setShowCalc,
  showCalc,
  subjects,
  submitting,
  test,
  totalViolations,
}) {
  return (
    <div className="app-header flex items-center px-2 sm:px-4 h-12 border-b flex-shrink-0 theme-header-surface">
      <div className="flex items-center gap-2 mr-3 flex-shrink-0">
        <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
          <span className="text-foreground font-bold text-xs">G</span>
        </div>
        <span className="text-foreground text-sm font-semibold hidden md:block truncate max-w-[160px]">
          {test?.title}
        </span>
      </div>

      <div className="flex items-center gap-0 flex-1 overflow-x-auto scrollbar-hide" role="tablist" aria-label="Subjects">
        {subjects.map(subject => {
          const isActive = (currentQuestion?.subject || 'General') === subject
          return (
            <button
              key={subject}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => {
                const idx = questions.findIndex(q => (q.subject || 'General') === subject)
                if (idx >= 0) setCurrent(idx)
              }}
              className={clsx('subject-tab text-xs', isActive && 'active')}
            >
              {subject}
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        {attemptNumber && (
          <span className="text-xs font-medium hidden sm:block theme-header-muted">
            Attempt {attemptNumber}/{maxAttempts}
          </span>
        )}

        {totalViolations > 0 && (
          <span className="text-xs font-medium text-destructive hidden sm:block">
            {totalViolations}/3 Violations
          </span>
        )}

        <button
          onClick={() => setShowCalc(s => !s)}
          className={clsx(
            'flex items-center gap-1 px-2 py-1 rounded text-xs border transition-colors',
            showCalc
              ? 'bg-primary border-primary text-white'
              : 'theme-border text-muted-foreground hover:text-foreground hover:border-muted-foreground'
          )}
        >
          <CalcIcon size={13} /> Calc
        </button>

        <TimerDisplay endTime={endTimeMs} onExpire={handleTimerExpire} />

        <button
          onClick={onSubmitClick}
          disabled={submitting}
          className="flex items-center gap-1 px-3 py-1 rounded bg-primary hover:bg-primary text-white text-xs font-medium transition-colors disabled:opacity-50"
        >
          {submitting ? <Spinner size={12} /> : <Send size={12} />} Submit
        </button>
      </div>
    </div>
  )
}
