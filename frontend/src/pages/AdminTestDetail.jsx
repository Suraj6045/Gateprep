import { useCallback } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left'
import { useAdminTest } from '../hooks/useAdminTest'
import { useTestFormEditor } from '../hooks/useTestFormEditor'
import { useQuestionFormMode } from '../hooks/useQuestionFormMode'
import JSONUploadForm from '../components/admin/JSONUploadForm'
import QuestionForm from '../components/admin/QuestionForm'
import Layout from '../components/shared/Layout'
import AdminTestDetailSkeleton from '../components/admin/AdminTestDetailSkeleton'
import TestHeader from '../components/admin/TestHeader'
import QuestionsList from '../components/admin/QuestionsList'

export default function AdminTestDetail() {
  const { testId } = useParams()
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

  const previewTest = useCallback(() => navigate(`/tests/${testId}?preview=true`), [navigate, testId])

  const handleAddQuestion = useCallback(async (question) => {
    await addQuestion(question)
    closeMode()
  }, [addQuestion, closeMode])

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
            onDelete={deleteQuestion}
            onUpdate={updateQuestion}
            onUploadImage={uploadImage}
            onDeleteImage={deleteImage}
          />
        </div>
      </div>
    </Layout>
  )
}
