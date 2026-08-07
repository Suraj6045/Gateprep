import FileJson from 'lucide-react/dist/esm/icons/file-json'
import Plus from 'lucide-react/dist/esm/icons/plus'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function EmptyQuestionsState({ onOpenJson, onOpenManual }) {
  return (
    <Card>
      <CardContent className="p-10 text-center">
        <p className="theme-muted mb-3">No questions yet.</p>
        <div className="flex gap-3 justify-center">
          <Button variant="ghost" onClick={onOpenJson} className="flex items-center gap-2 text-sm">
            <FileJson size={14}/> Upload JSON
          </Button>
          <Button onClick={onOpenManual} className="flex items-center gap-2 text-sm">
            <Plus size={14}/> Add Manually
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
