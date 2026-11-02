import { ChevronRight, Send, User } from 'lucide-react'
import Spinner from '../shared/Spinner'
import {
  getQStatus,
  STATUS_CLASS,
  groupExamQuestions,
  isFullLengthExam,
} from '../../utils/testEngineUtils'
import { Button } from '@/components/ui/button'
import type { TestQuestion } from '@/types/api'

export type QuestionGroup = { question: TestQuestion; index: number }
export type QuestionGroups = Map<string, QuestionGroup[]>

export interface TestSidebarProps {
  answered: number
  answers: Record<number, string | undefined>
  currentQuestion?: TestQuestion
  marked: Set<number>
  notAnswered: number
  onQuestionSelect: (index: number) => void
  onSubmitClick: () => void
  questionGroups: QuestionGroups
  questions: TestQuestion[]
  submitting: boolean
  visited: Set<number>
  isFullLength?: boolean
  testType?: string | null
  candidateName?: string
  onToggleCollapse?: () => void
}

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
  isFullLength,
  testType,
  candidateName,
  onToggleCollapse,
}: TestSidebarProps): React.ReactElement {
  const questionList = questions && questions.length > 0
    ? questions
    : [...questionGroups.values()].flat().sort((a, b) => a.index - b.index).map(item => item.question)

  const effectiveFullLength = typeof isFullLength === 'boolean'
    ? isFullLength
    : isFullLengthExam(testType, questionList)

  const displayQuestionGroups = groupExamQuestions(questionList, effectiveFullLength)

  return (
    <>
      <div className="p-2.5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
            <User size={14} />
          </div>
          <span className="text-xs font-semibold text-foreground truncate">
            {candidateName || 'Candidate'}
          </span>
        </div>
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        )}
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

      {[...displayQuestionGroups.entries()].map(([sectionTitle, items]) => (
        <div key={sectionTitle} className="p-2 border-b border-border">
          {effectiveFullLength ? (
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold truncate text-foreground">{sectionTitle}</p>
              <span className="text-[10px] text-muted-foreground font-medium">{items.length} Qs</span>
            </div>
          ) : (
            sectionTitle && sectionTitle !== 'Questions' && (
              <p className="text-xs font-semibold mb-2 truncate text-foreground">{sectionTitle}</p>
            )
          )}
          <div className="grid grid-cols-5 gap-1">
            {items.map(({ question, index: questionIndex }) => {
              const isCurrent = question.id === currentQuestion?.id
              const status = isCurrent
                ? 'current'
                : !visited.has(question.id)
                  ? 'not-visited'
                  : getQStatus(
                    String(question.id),
                    currentQuestion ? String(currentQuestion.id) : '',
                    Object.fromEntries(Object.entries(answers)),
                    new Set([...marked].map(String)),
                  )
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
