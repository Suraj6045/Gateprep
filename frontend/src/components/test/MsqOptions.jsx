import clsx from 'clsx'
import MathText from '../shared/MathText'
import OptionImage from './OptionImage'

export default function MsqOptions({ question, selectedLetters, onToggle }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-warning-text mb-2">One or more correct answers. No negative marking.</p>
      {question.options.map((option, i) => {
        const letter = 'ABCD'[i]
        const selected = (selectedLetters || '').split(',').includes(letter)
        return (
          <div
            key={i}
            onClick={() => onToggle(letter)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onToggle(letter)
              }
            }}
            className={clsx(
              'q-option cursor-pointer',
              selected && 'selected-msq',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            )}
          >
            <div className={clsx(
              'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
              selected ? 'border-[var(--accent-indigo)] bg-[var(--accent-indigo)]' : 'border-muted-foreground',
            )}>
              {selected && <span className="text-foreground text-xs font-bold">✓</span>}
            </div>
            <span className="text-xs font-semibold mr-2 text-muted-foreground">{letter}.</span>
            <div className="flex-1">
              <div className="text-sm text-foreground"><MathText>{option}</MathText></div>
              <OptionImage src={question.option_images?.[letter]} letter={letter} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
