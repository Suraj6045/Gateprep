import { memo, useState } from 'react'
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down'
import ChevronUp from 'lucide-react/dist/esm/icons/chevron-up'
import Pencil from 'lucide-react/dist/esm/icons/pencil'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2'
import ImageSlot from './ImageSlot'
import QuestionEditForm from './QuestionEditForm'
import { OPTION_LETTERS } from './questionUtils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const typeColor = {
  mcq: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  msq: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  nat: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
}

const QuestionCard = memo(function QuestionCard({
  q,
  idx,
  onDelete,
  onUpdate,
  onUploadImage,
  onDeleteImage,
}) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const optionImages = q.option_images || {}

  const toggleOpen = () => setOpen(current => !current)
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      toggleOpen()
    }
  }

  return (
    <Card className="overflow-hidden" style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 80px' }}>
      <div
        className="flex items-start gap-3 p-4 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring rounded outline-none"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onKeyDown={handleKeyDown}
        onClick={toggleOpen}
      >
        <span className="font-mono theme-muted text-sm mt-0.5 w-6 flex-shrink-0">Q{idx + 1}</span>
        <div className="flex-1 min-w-0">
          <p className="theme-text text-sm line-clamp-2">{q.question_text}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className={`text-xs ${typeColor[q.question_type]}`}>{q.question_type.toUpperCase()}</Badge>
            <span className="theme-muted text-xs">{q.marks}M</span>
            {q.subject && <span className="theme-muted text-xs">&middot; {q.subject}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={event => { event.stopPropagation(); setOpen(true); setEditing(true) }}
            aria-label="Edit question"
            className="p-1.5 rounded-lg theme-muted hover:text-primary hover:bg-primary/10 transition-colors"
          >
            <Pencil size={13}/>
          </button>
          <button
            onClick={event => { event.stopPropagation(); onDelete(q.id) }}
            aria-label="Delete question"
            className="p-1.5 rounded-lg theme-muted hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 size={13}/>
          </button>
          {open ? <ChevronUp size={15} className="theme-muted"/> : <ChevronDown size={15} className="theme-muted"/>}
        </div>
      </div>

      {open && (
        <div className="px-4 pb-4 border-t theme-border pt-3 space-y-3">
          {editing ? (
            <QuestionEditForm
              question={q}
              onSave={async (payload) => {
                await onUpdate(q.id, payload)
                setEditing(false)
              }}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <>
              {q.options?.length > 0 && (
                <div className="grid grid-cols-2 gap-1.5">
                  {q.options.map((option, optionIdx) => {
                    const letter = OPTION_LETTERS[optionIdx] || String(optionIdx + 1)
                    const isCorrect = q.correct_answer?.includes(letter)
                    return (
                      <div
                        key={letter}
                        className={`px-3 py-2 rounded-lg text-xs space-y-2 border ${
                          isCorrect
                            ? 'result-stat-correct text-success-text'
                            : 'theme-panel-card'
                        }`}
                      >
                        <p>
                          <span className="font-mono font-semibold mr-1.5">{letter}.</span>{option}
                        </p>
                        <ImageSlot
                          imageUrl={optionImages[letter] || null}
                          ariaLabel={`View option ${letter} image`}
                          imgAlt={`Option ${letter}`}
                          maxHeight="max-h-24"
                          imgExtraClass="theme-surface"
                          wrapperGap="gap-2"
                          uploadLabel="Add answer image"
                          uploadIconSize={12}
                          uploadPadX="px-2.5"
                          onUploadImage={(file) => onUploadImage(q.id, file, letter)}
                          onDeleteImage={onDeleteImage}
                          deleteTarget={q.id}
                          deleteExtraArg={letter}
                        />
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="flex items-center gap-2 text-xs">
                <span className="theme-muted">Answer:</span>
                <span className="font-mono text-success-text font-semibold">{q.correct_answer}</span>
                <span className="theme-muted ml-2">&middot;</span>
                <span className="theme-muted">+{q.marks}M</span>
                {q.negative_marks > 0 && <span className="theme-muted">/ -{q.negative_marks}M</span>}
              </div>

              <div className="border-t theme-border pt-3">
                <p className="text-xs theme-muted mb-2">Question Image (optional)</p>
                <ImageSlot
                  imageUrl={q.question_image_url || null}
                  ariaLabel="View full size image"
                  imgAlt="Question image"
                  maxHeight="max-h-32"
                  wrapperGap="gap-3"
                  uploadLabel="Upload Image"
                  uploadIconSize={13}
                  uploadPadX="px-3"
                  onUploadImage={(file) => onUploadImage(q.id, file, 'question')}
                  onDeleteImage={onDeleteImage}
                  deleteTarget={q.id}
                  deleteExtraArg={'question'}
                />
                <div className="mt-3">
                  <Button variant="ghost" onClick={() => setEditing(true)} className="inline-flex items-center gap-2 text-sm">
                    <Pencil size={13}/> Edit Question
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  )
})

export default QuestionCard
