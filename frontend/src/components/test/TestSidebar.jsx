import Send from 'lucide-react/dist/esm/icons/send'
import Spinner from '../shared/Spinner'
import { getQStatus, STATUS_CLASS } from '../../utils/testEngineUtils'
import { Button } from '@/components/ui/button'

export default function TestSidebar({
  answered,
  answers,
  currentQuestion,
  marked,
  notAnswered,
  onQuestionSelect,
  onSubmitClick,
  questionGroups,
  questions,
  submitting,
  visited,
}) {
  return (
    <>
      <div className="p-3 border-b text-center border-border">
        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center mx-auto mb-1">
          <span className="text-foreground font-bold text-sm">U</span>
        </div>
      </div>

      <div className="p-2 border-b space-y-1.5 border-border">
        {[
          ['q-dot-answered', `Answered (${answered})`],
          ['q-dot-not-answered', `Not Answered (${notAnswered})`],
          ['q-dot-not-visited', `Not Visited (${questions.length - visited.size})`],
          ['q-dot-marked', `Marked (${marked.size})`],
        ].map(([cls, label]) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`q-dot w-6 h-6 text-[9px] ${cls}`} />
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {[...questionGroups.entries()].map(([subject, items]) => (
        <div key={subject} className="p-2 border-b border-border">
          <p className="text-xs font-semibold mb-2 truncate text-foreground">{subject}</p>
          <div className="grid grid-cols-5 gap-1">
            {items.map(({ question, index: questionIndex }) => {
              const isCurrent = question.id === currentQuestion?.id
              const status = isCurrent
                ? 'current'
                : !visited.has(question.id)
                  ? 'not-visited'
                  : getQStatus(question.id, currentQuestion?.id, answers, marked)
              return (
                <button
                  key={question.id}
                  onClick={() => onQuestionSelect(questionIndex)}
                  className={STATUS_CLASS[status] || STATUS_CLASS['not-visited']}
                >
                  {questionIndex + 1}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      <div className="p-2 mt-auto">
        <Button
          onClick={onSubmitClick}
          disabled={submitting}
          size="sm"
          className="w-full flex items-center justify-center gap-1.5 text-xs py-2"
        >
          {submitting ? <Spinner size={12} /> : <Send size={12} />} Submit Test
        </Button>
      </div>
    </>
  )
}
