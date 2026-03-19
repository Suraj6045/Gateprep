import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/shared/Layout'
import { adminAPI } from '../api/api'
import { SUBJECTS, SERIES_NAMES, TEST_TYPES, SERIES_LABELS, TYPE_LABELS } from '../utils/constants'
import toast from 'react-hot-toast'
import { Plus, Trash2, Eye, FileText, Clock, X, Upload, ChevronDown, ChevronUp } from 'lucide-react'
import Spinner from '../components/shared/Spinner'

function CreateTestModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '', description: '', duration_minutes: 180,
    category: '', series_name: '', test_type: '', subject: ''
  })
  const [pdf, setPdf] = useState(null)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef()

  const isWeeklyQuiz  = form.category === 'weekly_quiz'
  const isTestSeries  = form.category === 'test_series'
  const isTopicWise   = form.test_type === 'topic_wise'
  const needsSubject  = isWeeklyQuiz || isTopicWise

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { toast.error('Title required'); return }
    if (!form.category) { toast.error('Please select a category'); return }
    if (isTestSeries && !form.series_name) { toast.error('Please select a series (Made Easy / GO Classes)'); return }
    if (isTestSeries && !form.test_type) { toast.error('Please select test type'); return }
    if (needsSubject && !form.subject) { toast.error('Please select a subject'); return }

    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('title', form.title)
      if (form.description) fd.append('description', form.description)
      fd.append('duration_minutes', form.duration_minutes)
      fd.append('category', form.category)
      if (form.series_name) fd.append('series_name', form.series_name)
      if (form.test_type)   fd.append('test_type', form.test_type)
      if (form.subject)     fd.append('subject', form.subject)
      if (pdf) fd.append('pdf_file', pdf)

      const res = await adminAPI.createTest(fd)
      toast.success(`Test created!${res.data.question_count > 0 ? ` Extracted ${res.data.question_count} questions.` : ''}`)
      onCreated(res.data)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create test')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
         style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="gate-card w-full max-w-lg p-6 animate-slide-up my-4">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Create New Test</h3>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {/* Basic info */}
          <div>
            <label className="label">Test Title *</label>
            <input className="input" placeholder="e.g. DBMS Weekly Quiz #3"
              value={form.title} onChange={set('title')} required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={2} placeholder="Optional..."
              value={form.description} onChange={set('description')} />
          </div>
          <div>
            <label className="label">Duration (minutes)</label>
            <input type="number" className="input" value={form.duration_minutes}
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
                      ? 'bg-sky-600/20 border-sky-500 text-sky-400'
                      : 'border-slate-600 text-slate-400 hover:border-slate-500'
                  }`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Weekly Quiz → subject */}
          {isWeeklyQuiz && (
            <div>
              <label className="label">Subject *</label>
              <select className="input" value={form.subject} onChange={set('subject')}>
                <option value="">— Select Subject —</option>
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
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
                          ? 'bg-sky-600/20 border-sky-500 text-sky-400'
                          : 'border-slate-600 text-slate-400 hover:border-slate-500'
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
                          ? 'bg-sky-600/20 border-sky-500 text-sky-400'
                          : 'border-slate-600 text-slate-400 hover:border-slate-500'
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Topic Wise → subject */}
              {isTopicWise && (
                <div>
                  <label className="label">Subject *</label>
                  <select className="input" value={form.subject} onChange={set('subject')}>
                    <option value="">— Select Subject —</option>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
            </>
          )}

          {/* PDF */}
          <div className="border-t pt-4" style={{ borderColor: 'var(--border)' }}>
            <label className="label">Upload PDF (optional)</label>
            <div onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors hover:border-sky-500/40"
              style={{ borderColor: 'var(--border)' }}>
              {pdf ? (
                <div className="flex items-center justify-center gap-2 text-sky-400 text-sm">
                  <FileText size={15} />{pdf.name}
                  <button type="button" onClick={e => { e.stopPropagation(); setPdf(null) }}
                    className="text-red-400"><X size={13} /></button>
                </div>
              ) : (
                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  <Upload size={16} className="mx-auto mb-1" />
                  Click to select PDF
                </div>
              )}
            </div>
            <input type="file" accept=".pdf" ref={fileRef} className="hidden"
              onChange={e => setPdf(e.target.files[0] || null)} />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading && <Spinner size={15} />}
              {loading ? 'Creating...' : 'Create Test'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Tag badge for category info
function TestTag({ test }) {
  if (!test.category) return null
  if (test.category === 'weekly_quiz') {
    return (
      <span className="badge badge-blue text-xs">
        Weekly Quiz{test.subject ? ` · ${test.subject.split(' ')[0]}` : ''}
      </span>
    )
  }
  if (test.category === 'test_series') {
    const parts = [
      SERIES_LABELS[test.series_name],
      TYPE_LABELS[test.test_type],
      test.test_type === 'topic_wise' && test.subject ? test.subject.split(' ')[0] : null
    ].filter(Boolean)
    return <span className="badge badge-purple text-xs">{parts.join(' · ')}</span>
  }
  return null
}

export default function AdminTests() {
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [deleting, setDeleting] = useState({})
  const [filter, setFilter] = useState('all') // all | weekly_quiz | test_series
  const navigate = useNavigate()

  const load = () => {
    setLoading(true)
    adminAPI.getTests().then(r => setTests(r.data)).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const deleteTest = async (id) => {
    if (!confirm('Delete this test and all its questions?')) return
    setDeleting(d => ({ ...d, [id]: true }))
    try {
      await adminAPI.deleteTest(id)
      setTests(ts => ts.filter(t => t.id !== id))
      toast.success('Deleted')
    } catch { toast.error('Failed') }
    finally { setDeleting(d => ({ ...d, [id]: false })) }
  }

  const filtered = tests.filter(t => filter === 'all' || t.category === filter)

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Tests</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{tests.length} total</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <Plus size={15} /> New Test
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {[['all','All'], ['weekly_quiz','Weekly Quiz'], ['test_series','Test Series']].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                filter === v ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}>{l}</button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner size={28} className="text-sky-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="gate-card p-12 text-center">
            <p style={{ color: 'var(--text-muted)' }}>No tests yet. Create your first test.</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary mt-4 inline-flex items-center gap-2">
              <Plus size={15} /> Create Test
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(t => (
              <div key={t.id} className="gate-card p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm leading-snug line-clamp-2" style={{ color: 'var(--text)' }}>
                    {t.title}
                  </h3>
                  <span className={`badge flex-shrink-0 text-xs ${t.question_count > 0 ? 'badge-green' : 'badge-amber'}`}>
                    {t.question_count} Qs
                  </span>
                </div>

                <TestTag test={t} />

                <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span className="flex items-center gap-1"><Clock size={11} />{t.duration_minutes}m</span>
                  <span>{t.total_marks} marks</span>
                </div>

                <div className="flex gap-1.5 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                  <button onClick={() => navigate(`/admin/tests/${t.id}`)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium"
                    style={{ background: 'var(--bg-panel)', color: 'var(--text)' }}>
                    <Eye size={12} /> Manage
                  </button>
                  <button onClick={() => deleteTest(t.id)} disabled={deleting[t.id]}
                    className="p-1.5 rounded text-red-400 hover:bg-red-500/10 transition-colors">
                    {deleting[t.id] ? <Spinner size={12} /> : <Trash2 size={12} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateTestModal
          onClose={() => setShowCreate(false)}
          onCreated={t => { setTests(ts => [t, ...ts]); setShowCreate(false) }}
        />
      )}
    </Layout>
  )
}
