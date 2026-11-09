import { useCallback, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export interface EmptyQuestionsScreenProps {
  navigate: (to: string) => void
}

export default function EmptyQuestionsScreen({ navigate }: EmptyQuestionsScreenProps): React.ReactElement {
  const safeExitFullscreen = useCallback(() => {
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    }
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      safeExitFullscreen()
    }
    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [safeExitFullscreen])

  const handleBack = () => {
    safeExitFullscreen()
    navigate('/tests')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md text-center border-border">
        <CardContent className="p-6 pt-8">
          <AlertTriangle size={36} className="text-warning-text mx-auto mb-3" />
          <h1 className="text-xl font-bold mb-2 text-foreground">No Questions Available</h1>
          <p className="text-sm mb-5 text-muted-foreground">
            This test does not have any questions to display.
          </p>
          <Button onClick={handleBack} className="w-full">
            Back to Tests
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
