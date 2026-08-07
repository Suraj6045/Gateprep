import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function NatInput({ value, onChange, onCommit, savedValue }) {
  return (
    <div>
      <p className="text-xs text-success-text mb-3">Enter numerical answer. No negative marking.</p>
      <div className="flex gap-3 items-center max-w-xs">
        <Input
          type="number"
          step="any"
          className="font-mono text-lg flex-1"
          value={value}
          onChange={event => onChange(event.target.value)}
          onBlur={onCommit}
          placeholder="Enter answer..."
          aria-label="Numerical Answer"
        />
        <Button onClick={onCommit} className="px-4">Save</Button>
      </div>
      {savedValue && (
        <p className="text-success-text text-sm mt-2">
          ✓ Saved: <span className="font-mono font-semibold">{savedValue}</span>
        </p>
      )}
    </div>
  )
}
