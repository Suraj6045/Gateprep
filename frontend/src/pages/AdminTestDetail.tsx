import { useCallback, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAdminTest } from '../hooks/useAdminTest'
import { useTestFormEditor } from '../hooks/useTestFormEditor'
import { useQuestionFormMode } from '../hooks/useQuestionFormMode'
import JSONUploadForm from '../components/admin/JSONUploadForm'
import QuestionForm from '../components/admin/QuestionForm'
import Layout from '../components/shared/Layout'
import AdminTestDetailSkeleton from '../components/admin/AdminTestDetailSkeleton'
import TestHeader from '../components/admin/TestHeader'
import QuestionsList from '../components/admin/QuestionsList'
import ConfirmDialog from '../components/admin/ConfirmDialog'
import type { ReactElement } from 'react'
import type { QuestionIn } from '@/types/api'

interface AdminTestDetailContentProps {
  testId: string
}

function AdminTestDetailContent({ testId }: AdminTestDetailContentProps): ReactElement {
  const navigate = useNavigate()
  const {
    test,
    questions,
    loading,
    updateTestDetails,
    addQuestion,
    addQuestionsJSON,
    uploadQuestionsFile,
    deleteQuestion,
    updateQuestion,
    uploadImage,
    deleteImage,
  } = useAdminTest(testId)

  const { isEditingTest, testForm, setTestForm, savingTest, startEditingTest, saveTest, cancelEditingTest } = useTestFormEditor(test, updateTestDetails)
  const { mode, closeMode, openJsonMode, openManualMode, toggleJsonMode, toggleManualMode } = useQuestionFormMode()
  const [questionToDelete, setQuestionToDelete] = useState<number | null>(null)

  const previewTest = useCallback(() => navigate(`/tests/${testId}?preview=true`), [navigate, testId])

  const handleAddQuestion = useCallback(async (question: QuestionIn) => {
    await addQuestion(question)
    closeMode()
  }, [addQuestion, closeMode])

  const confirmDeleteQuestion = useCallback(async () => {
    if (questionToDelete === null) return
    await deleteQuestion(questionToDelete)
    setQuestionToDelete(null)
  }, [deleteQuestion, questionToDelete])

  if (loading) return <AdminTestDetailSkeleton />

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in max-w-3xl">
        <div>
          <Link to="/admin/tests" className="flex items-center gap-1.5 theme-muted hover:opacity-80 text-sm mb-4 w-fit">
            <ArrowLeft size={15}/> Back to Tests
          </Link>
          <TestHeader
            test={test}
            questionsCount={questions.length}
            isEditingTest={isEditingTest}
            testForm={testForm}
            setTestForm={setTestForm}
            savingTest={savingTest}
            onStartEdit={startEditingTest}
            onSaveTest={saveTest}
            onCancelEdit={cancelEditingTest}
            mode={mode}
            onPreview={previewTest}
            onToggleJson={toggleJsonMode}
            onToggleManual={toggleManualMode}
          />
        </div>

        {mode === 'manual' && <QuestionForm onAdd={handleAddQuestion} onClose={closeMode} />}
        {mode === 'json' && (
          <JSONUploadForm onAdd={addQuestionsJSON} onUploadFile={uploadQuestionsFile} onClose={closeMode} />
        )}

        <div className="space-y-2">
          <QuestionsList
            questions={questions}
            onOpenJson={openJsonMode}
            onOpenManual={openManualMode}
            onDelete={questionId => setQuestionToDelete(questionId)}
            onUpdate={updateQuestion}
            onUploadImage={uploadImage}
            onDeleteImage={deleteImage}
          />
        </div>
      </div>
      <ConfirmDialog
        open={Boolean(questionToDelete)}
        title="Delete question?"
        description="This question will be permanently removed from the test."
        onCancel={() => setQuestionToDelete(null)}
        onConfirm={confirmDeleteQuestion}
      />
    </Layout>
  )
}

export default function AdminTestDetail(): ReactElement {
  const { testId } = useParams()
  if (testId === undefined) return <Navigate to="/admin/tests" replace />
  return <AdminTestDetailContent testId={testId} />
}
