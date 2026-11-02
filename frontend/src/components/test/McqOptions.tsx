import clsx from 'clsx'
import MathText from '../shared/MathText'
import OptionImage from './OptionImage'
import type { TestQuestion } from '@/types/api'

export type OptionQuestion = TestQuestion & {
  options: string[]
  option_images?: Record<string, string | undefined> | null
}

export interface McqOptionsProps {
  question: OptionQuestion
  selectedLetter?: string
  onSelect: (letter: string) => void
}

export default function McqOptions({ question, selectedLetter, onSelect }: McqOptionsProps): React.ReactElement {
  return (
    <div className="space-y-2" role="radiogroup" aria-label="Answer options">
      {question.options.map((option, i) => {
        const letter = 'ABCD'[i]
        const selected = selectedLetter === letter
        return (
          <div
            key={i}
            onClick={() => onSelect(letter)}
            role="radio"
            aria-checked={selected}
            tabIndex={selected || (!selectedLetter && i === 0) ? 0 : -1}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelect(letter)
                return
              }

              if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                event.preventDefault()
                const parent = event.currentTarget.parentElement
                if (!parent) return
                const options = Array.from(parent.querySelectorAll<HTMLElement>('[role="radio"]'))
                const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1
                const nextIndex = (i + direction + options.length) % options.length
                options[nextIndex]?.focus()
                onSelect('ABCD'[nextIndex])
              }
            }}
            className={clsx(
              'q-option cursor-pointer',
              selected && 'selected',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            )}
          >
            <div className={clsx(
              'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
              selected ? 'border-primary bg-primary' : 'border-muted-foreground',
            )}>
              {selected && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
            <div className="flex-1">
              <span className="text-xs font-semibold mr-2 text-muted-foreground">{letter}.</span>
              <div className="text-sm text-foreground"><MathText>{option}</MathText></div>
              <OptionImage src={question.option_images?.[letter]} letter={letter} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
