import Maximize from 'lucide-react/dist/esm/icons/maximize'
import Spinner from '../shared/Spinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function InstructionScreen({
  accepted,
  beginTest,
  navigate,
  setAccepted,
  starting,
  test,
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-2xl animate-fade-in border-border">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-2xl font-bold mb-1">General Instructions</CardTitle>
            <p className="text-sm text-muted-foreground">{test?.title}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/tests')}>
            Back
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {[
            ['Duration', `${test?.duration_minutes || 0} min`],
            ['Questions', test?.question_count || 0],
            ['Marks', test?.total_marks || 0],
          ].map(([label, value]) => (
            <div key={label} className="bg-muted rounded border p-3 text-center">
              <p className="text-xs mb-1 text-muted-foreground">{label}</p>
              <p className="font-semibold text-foreground">{value}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3 text-sm mb-6 text-muted-foreground">
          <p>The test opens in fullscreen mode after you click Begin Test.</p>
          <p>Leaving fullscreen or switching tabs may be counted as a violation.</p>
          <p>The timer starts only after the attempt is created.</p>
        </div>

        <label className="flex items-start gap-3 mb-6 cursor-pointer">
          <input
            type="checkbox"
            checked={accepted}
            onChange={event => setAccepted(event.target.checked)}
            className="mt-1"
          />
          <span className="text-sm text-foreground">
            I have read and understood the instructions.
          </span>
        </label>

        <Button
          onClick={beginTest}
          disabled={!accepted || starting}
          className="w-full h-11 text-base font-medium"
        >
          {starting ? <Spinner size={18} className="mr-2" /> : <Maximize size={18} className="mr-2" />}
          {starting ? 'Starting Test...' : 'Begin Test'}
        </Button>
        </CardContent>
      </Card>
    </div>
  )
}
