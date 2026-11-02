import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/shared/Layout'
import { adminAPI, fetcher } from '../api/api'
import useSWR from 'swr'
import { SUBJECTS, SERIES_NAMES, TEST_TYPES, SERIES_LABELS, TYPE_LABELS } from '../utils/constants'
import toast from 'react-hot-toast'
import { Plus, Trash2, Eye, FileText, Clock, X, Upload, ChevronDown, ChevronUp } from 'lucide-react'
import Spinner from '../components/shared/Spinner'
import { TestCardSkeleton } from '../components/shared/Skeletons'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { BADGE_COLORS } from '@/utils/badgeStyles'
import { getApiErrorDetail } from '@/lib/apiError'
import { CustomSelect } from '@/components/ui/select'
import ConfirmDialog from '../components/admin/ConfirmDialog'
import type { AdminTestCreateResponse, AdminTestListItem } from '@/types/api'

interface CreateTestForm {
  title: string
  description: string
  duration_minutes: number | string
  category: string
  series_name: string
  test_type: string
  subject: string
}

interface CreateTestModalProps {
  onClose: () => void
  onCreated: (test: AdminTestCreateResponse) => void
}

function CreateTestModal({ onClose, onCreated }: CreateTestModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const [form, setForm] = useState<CreateTestForm>({
    title: '', description: '', duration_minutes: 180,
    category: '', series_name: '', test_type: '', subject: ''
  })
  const [loading, setLoading] = useState(false)

  const isWeeklyQuiz  = form.category === 'weekly_quiz'
  const isTestSeries  = form.category === 'test_series'
  const isTopicWise   = form.test_type === 'topic_wise'
  const needsSubject  = isWeeklyQuiz || isTopicWise

  useEffect(() => {
    const activeElement = document.activeElement
    previousFocusRef.current = activeElement instanceof HTMLElement ? activeElement : null
    const modal = modalRef.current
    if (!modal) return undefined

    const focusableSelector = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[href]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ')
    const focusable = modal.querySelectorAll<HTMLElement>(focusableSelector)
    focusable[0]?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      const currentFocusable = modal.querySelectorAll<HTMLElement>(focusableSelector)
      if (!currentFocusable.length) return
      const first = currentFocusable[0]
      const last = currentFocusable[currentFocusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    modal.addEventListener('keydown', handleKeyDown)
    return () => {
      modal.removeEventListener('keydown', handleKeyDown)
      previousFocusRef.current?.focus()
    }
  }, [onClose])

  const set = (key: keyof CreateTestForm) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => setForm(current => ({ ...current, [key]: event.target.value }))

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!form.title.trim()) { toast.error('Title required'); return }
    if (!form.category) { toast.error('Please select a category'); return }
    if (isTestSeries && !form.series_name) { toast.error('Please select a series (Made Easy / GO Classes)'); return }
    if (isTestSeries && !form.test_type) { toast.error('Please select test type'); return }
    if (needsSubject && !form.subject) { toast.error('Please select a subject'); return }

    setLoading(true)
    try {
      const res = await adminAPI.createTest(form)
      toast.success('Test created!')
      onCreated(res.data)
    } catch (err) {
      toast.error(getApiErrorDetail(err) || 'Failed to create test')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
         style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <Card
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-test-title"
        className="w-full max-w-lg animate-slide-up my-4"
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 id="create-test-title" className="text-lg font-bold" style={{ color: 'var(--text)' }}>Create New Test</h3>
            <button type="button" onClick={onClose} aria-label="Close" style={{ color: 'var(--text-muted)' }}><X size={18} /></button>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-4">
            {/* Basic info */}
            <div>
              <label className="label">Test Title *</label>
              <Input placeholder="e.g. DBMS Weekly Quiz #3"
                value={form.title} onChange={set('title')} required />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input resize-none" rows={2} placeholder="Optional..."
                value={form.description} onChange={set('description')} />
            </div>
            <div>
              <label className="label">Duration (minutes)</label>
              <Input type="number" value={form.duration_minutes}
                min={5} max={360} onChange={set('duration_minutes')} />
            </div>

            {/* Category */}
            <div className="border-t pt-4" style={{ borderColor: 'var(--border)' }}>
              <label className="label">Category *</label>
              <div className="grid grid-cols-2 gap-2">
                {[['weekly_quiz','Weekly Quiz'], ['test_series','Test Series']].map(([v, l]) => (
                  <button key={v} type="button"
                    onClick={() => setForm(f => ({ ...f, category: v, series_name: '', test_type: '', subject: '' }))}
                    className={`py-2.5 rounded border text-sm font-medium transition-all ${
                      form.category === v
                        ? 'bg-primary/20 border-primary text-primary'
                        : 'theme-border text-muted-foreground hover:border-muted-foreground'
                    }`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Weekly Quiz → subject */}
            {isWeeklyQuiz && (
              <div>
                <label className="label" htmlFor="weekly-quiz-subject">Subject *</label>
                <CustomSelect
                  id="weekly-quiz-subject"
                  value={form.subject}
                  onChange={val => setForm(f => ({ ...f, subject: val }))}
                  placeholder="— Select Subject —"
                  options={SUBJECTS.map(s => ({ value: s, label: s }))}
                />
              </div>
            )}

            {/* Test Series → series name + test type */}
            {isTestSeries && (
              <>
                <div>
                  <label className="label">Series *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {SERIES_NAMES.map(({ value, label }) => (
                      <button key={value} type="button"
                        onClick={() => setForm(f => ({ ...f, series_name: value }))}
                        className={`py-2.5 rounded border text-sm font-medium transition-all ${
                          form.series_name === value
                            ? 'bg-primary/20 border-primary text-primary'
                            : 'theme-border text-muted-foreground hover:border-muted-foreground'
                        }`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">Test Type *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {TEST_TYPES.map(({ value, label }) => (
                      <button key={value} type="button"
                        onClick={() => setForm(f => ({ ...f, test_type: value, subject: '' }))}
                        className={`py-2.5 rounded border text-sm font-medium transition-all ${
                          form.test_type === value
                            ? 'bg-primary/20 border-primary text-primary'
                            : 'theme-border text-muted-foreground hover:border-muted-foreground'
                        }`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Topic Wise → subject */}
                {isTopicWise && (
                  <div>
                    <label className="label" htmlFor="topic-wise-subject">Subject *</label>
                    <CustomSelect
                      id="topic-wise-subject"
                      value={form.subject}
                      onChange={val => setForm(f => ({ ...f, subject: val }))}
                      placeholder="— Select Subject —"
                      options={SUBJECTS.map(s => ({ value: s, label: s }))}
                    />
                  </div>
                )}
              </>
            )}



            <div className="flex gap-3">
              <Button type="button" variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
              <Button type="submit" disabled={loading} className="flex-1 flex items-center justify-center gap-2">
                {loading && <Spinner size={15} />}
                {loading ? 'Creating...' : 'Create Test'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// Tag badge for category info
function TestTag({ test }: { test: AdminTestListItem }) {
  if (!test.category) return null
  if (test.category === 'weekly_quiz') {
    return (
      <Badge variant="outline" className={`${BADGE_COLORS.sky} text-xs`}>
        Weekly Quiz{test.subject ? ` · ${test.subject.split(' ')[0]}` : ''}
      </Badge>
    )
  }
  if (test.category === 'test_series') {
    const parts = [
      // @ts-expect-error TODO(null-safety): series_name is null for test-series rows without a series; the lookup with null yields undefined at runtime and the series tag omits that label
      SERIES_LABELS[test.series_name],
      // @ts-expect-error TODO(null-safety): test_type is null for test-series rows without a type; the lookup with null yields undefined at runtime and the series tag omits that label
      TYPE_LABELS[test.test_type],
      test.test_type === 'topic_wise' && test.subject ? test.subject.split(' ')[0] : null
    ].filter(Boolean)
    return <Badge variant="outline" className={`${BADGE_COLORS.purple} text-xs`}>{parts.join(' · ')}</Badge>
  }
  return null
}

export default function AdminTests() {
  const { data: testsData, isLoading: loading, mutate } = useSWR<AdminTestListItem[]>('/admin/tests', fetcher)
  const tests = testsData || []
  
  const [showCreate, setShowCreate] = useState(false)
  const [deleting, setDeleting] = useState<Record<string | number, boolean>>({})
  const [testToDelete, setTestToDelete] = useState<number | null>(null)
  const [filter, setFilter] = useState('all') // all | weekly_quiz | test_series
  const navigate = useNavigate()

  const deleteTest = async (id: number) => {
    setDeleting(d => ({ ...d, [id]: true }))
    try {
      await adminAPI.deleteTest(id)
      mutate(tests.filter(t => t.id !== id), false)
      toast.success('Deleted')
    } catch { toast.error('Failed') }
    finally { setDeleting(d => ({ ...d, [id]: false })) }
  }

  const confirmDeleteTest = async () => {
    if (testToDelete === null) return
    await deleteTest(testToDelete)
    setTestToDelete(null)
  }

  const filtered = tests.filter(t => filter === 'all' || t.category === filter)

  return (
    <Layout>
      <div className="flex flex-col gap-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Tests</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{tests.length} total</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="flex items-center gap-2">
            <Plus size={15} /> New Test
          </Button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 p-1 rounded-lg w-fit overflow-x-auto" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {[['all','All'], ['weekly_quiz','Weekly Quiz'], ['test_series','Test Series']].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                filter === v ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'
              }`}>{l}</button>
          ))}
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <TestCardSkeleton />
            <TestCardSkeleton />
            <TestCardSkeleton />
            <TestCardSkeleton />
            <TestCardSkeleton />
            <TestCardSkeleton />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p style={{ color: 'var(--text-muted)' }}>No tests yet. Create your first test.</p>
              <Button onClick={() => setShowCreate(true)} className="mt-4 inline-flex items-center gap-2">
                <Plus size={15} /> Create Test
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(t => (
              <Card key={t.id}>
                <CardContent className="p-3 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm leading-snug line-clamp-2" style={{ color: 'var(--text)' }}>
                      {t.title}
                    </h3>
                    <Badge variant="outline" className={`flex-shrink-0 text-xs ${t.question_count > 0
                      ? BADGE_COLORS.green
                      : BADGE_COLORS.amber
                    }`}>
                      {t.question_count} Qs
                    </Badge>
                  </div>

                  <TestTag test={t} />

                  <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span className="flex items-center gap-1"><Clock size={11} />{t.duration_minutes}m</span>
                    <span>{t.total_marks} marks</span>
                  </div>

                  <div className="flex gap-1.5 pt-1.5 border-t" style={{ borderColor: 'var(--border)' }}>
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/tests/${t.id}`)}
                      className="flex-1 flex items-center justify-center gap-1 text-xs"
                      style={{ background: 'var(--bg-panel)', color: 'var(--text)' }}>
                      <Eye size={12} /> Manage
                    </Button>
                    <Button variant="ghost" size="icon"
                      onClick={() => setTestToDelete(t.id)} disabled={deleting[t.id]}
                      aria-label="Delete test" className="text-destructive hover:bg-destructive/10">
                      {deleting[t.id] ? <Spinner size={12} /> : <Trash2 size={12} />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateTestModal
          onClose={() => setShowCreate(false)}
          onCreated={t => {
            // @ts-expect-error TODO(null-safety): AdminTestCreateResponse lacks description, duration_minutes, series_id, created_at, category, series_name, test_type, subject, is_published; the inserted row renders "undefinedm" duration and no category/series tags until SWR revalidates
            mutate([t, ...tests], false)
            setShowCreate(false)
          }}
        />
      )}
      <ConfirmDialog
        open={testToDelete !== null}
        title="Delete test?"
        description="This test and all of its questions will be permanently removed."
        onCancel={() => setTestToDelete(null)}
        onConfirm={confirmDeleteTest}
        loading={testToDelete !== null && deleting[testToDelete]}
      />
    </Layout>
  )
}
