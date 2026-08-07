import clsx from 'clsx'
import MathText from '../shared/MathText'
import OptionImage from './OptionImage'

export default function McqOptions({ question, selectedLetter, onSelect }) {
  return (
    <div className="space-y-2">
      {question.options.map((option, i) => {
        const letter = 'ABCD'[i]
        const selected = selectedLetter === letter
        return (
          <div
            key={i}
            onClick={() => onSelect(letter)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelect(letter)
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
