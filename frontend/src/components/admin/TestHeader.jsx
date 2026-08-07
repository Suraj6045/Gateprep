import Eye from 'lucide-react/dist/esm/icons/eye'
import FileJson from 'lucide-react/dist/esm/icons/file-json'
import Pencil from 'lucide-react/dist/esm/icons/pencil'
import Plus from 'lucide-react/dist/esm/icons/plus'
import TestMetaForm from './TestMetaForm'
import { Button } from '@/components/ui/button'

export default function TestHeader({
  test,
  questionsCount,
  isEditingTest,
  testForm,
  setTestForm,
  savingTest,
  onStartEdit,
  onSaveTest,
  onCancelEdit,
  mode,
  onPreview,
  onToggleJson,
  onToggleManual
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
      {isEditingTest ? (
        <TestMetaForm
          testForm={testForm}
          setTestForm={setTestForm}
          onSave={onSaveTest}
          onCancel={onCancelEdit}
          savingTest={savingTest}
        />
      ) : (
        <div>
          <div className="flex items-start gap-2">
            <h1 className="text-2xl font-bold theme-text">{test?.title}</h1>
            <button
              onClick={onStartEdit}
              aria-label="Edit test details"
              className="p-1.5 rounded-lg theme-muted hover:text-primary hover:bg-primary/10 transition-colors"
            >
              <Pencil size={15}/>
            </button>
          </div>
          <p className="theme-muted mt-1 text-sm">{test?.description || 'No description'}</p>
          <div className="flex items-center gap-4 mt-2 text-xs theme-muted">
            <span>{test?.duration_minutes} min</span>
            <span>{questionsCount} questions</span>
            <span>{test?.total_marks} marks</span>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 sm:flex-shrink-0">
        <Button
          variant="ghost"
          onClick={onPreview}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all"
        >
          <Eye size={15}/> Preview Test
        </Button>
        <Button
          variant="ghost"
          onClick={onToggleJson}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${mode === 'json' ? 'bg-[var(--warning-text)]/15 border-[var(--warning-text)]/30 text-[var(--warning-text)]' : ''}`}
        >
          <FileJson size={15}/> JSON
        </Button>
        <Button
          onClick={onToggleManual}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${mode === 'manual' ? 'bg-primary/15 border-primary/30 text-primary' : ''}`}
        >
          <Plus size={15}/> Manual
        </Button>
      </div>
    </div>
  )
}
