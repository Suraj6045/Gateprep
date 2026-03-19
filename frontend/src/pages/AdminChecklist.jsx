import { useEffect, useState } from 'react'
import Layout from '../components/shared/Layout'
import { checklistAPI } from '../api/api'
import { Plus, Trash2, ChevronDown, ChevronUp, X } from 'lucide-react'
import Spinner from '../components/shared/Spinner'
import toast from 'react-hot-toast'

export default function AdminChecklist() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})
  const [newSubject, setNewSubject] = useState('')
  const [newTopics, setNewTopics]   = useState({}) // subjectId → string
  const [saving, setSaving]         = useState({})
  const [deleting, setDeleting]     = useState({})

  const load = () => {
    checklistAPI.get()
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const addSubject = async () => {
    if (!newSubject.trim()) return
    setSaving(s => ({ ...s, subject: true }))
    try {
      await checklistAPI.createSubject({ name: newSubject.trim(), order_index: data?.subjects?.length || 0 })
      setNewSubject('')
      load()
      toast.success('Subject added')
    } catch { toast.error('Failed') }
    finally { setSaving(s => ({ ...s, subject: false })) }
  }

  const deleteSubject = async (id) => {
    if (!confirm('Delete this subject and all its topics?')) return
    setDeleting(d => ({ ...d, [`s-${id}`]: true }))
    try {
      await checklistAPI.deleteSubject(id)
      load()
      toast.success('Subject deleted')
    } catch { toast.error('Failed') }
    finally { setDeleting(d => ({ ...d, [`s-${id}`]: false })) }
  }

  const addTopic = async (subjectId) => {
    const name = (newTopics[subjectId] || '').trim()
    if (!name) return
    setSaving(s => ({ ...s, [`t-${subjectId}`]: true }))
    try {
      await checklistAPI.createTopic(subjectId, { name, order_index: 0 })
      setNewTopics(t => ({ ...t, [subjectId]: '' }))
      load()
      toast.success('Topic added')
    } catch { toast.error('Failed') }
    finally { setSaving(s => ({ ...s, [`t-${subjectId}`]: false })) }
  }

  const deleteTopic = async (id) => {
    if (!confirm('Delete this topic?')) return
    setDeleting(d => ({ ...d, [`t-${id}`]: true }))
    try {
      await checklistAPI.deleteTopic(id)
      load()
      toast.success('Topic deleted')
    } catch { toast.error('Failed') }
    finally { setDeleting(d => ({ ...d, [`t-${id}`]: false })) }
  }

  if (loading) return (
    <Layout><div className="flex justify-center py-16"><Spinner size={28} className="text-sky-500" /></div></Layout>
  )

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Syllabus Checklist</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Manage subjects and topics for the student checklist
          </p>
        </div>

        {/* Add subject */}
        <div className="gate-card p-4">
          <label className="label">Add New Subject</label>
          <div className="flex gap-2">
            <input className="input flex-1" placeholder="e.g. Operating Systems"
              value={newSubject}
              onChange={e => setNewSubject(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSubject()} />
            <button onClick={addSubject} disabled={saving.subject || !newSubject.trim()}
              className="btn-primary flex items-center gap-1.5">
              {saving.subject ? <Spinner size={14} /> : <Plus size={14} />} Add
            </button>
          </div>
        </div>

        {/* Subjects list */}
        {!data?.subjects?.length ? (
          <div className="gate-card p-8 text-center" style={{ color: 'var(--text-muted)' }}>
            No subjects yet. Add your first subject above.
          </div>
        ) : (
          data.subjects.map(subject => (
            <div key={subject.id} className="gate-card overflow-hidden">
              {/* Subject header */}
              <div className="flex items-center justify-between p-4"
                   style={{ background: 'var(--bg-panel)' }}>
                <div className="flex items-center gap-3 cursor-pointer flex-1"
                     onClick={() => setExpanded(e => ({ ...e, [subject.id]: !e[subject.id] }))}>
                  <h3 className="font-semibold" style={{ color: 'var(--text)' }}>{subject.name}</h3>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {subject.topics.length} topic{subject.topics.length !== 1 ? 's' : ''}
                  </span>
                  {expanded[subject.id]
                    ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} />
                    : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
                </div>
                <button onClick={() => deleteSubject(subject.id)}
                  disabled={deleting[`s-${subject.id}`]}
                  className="p-1.5 rounded text-red-400 hover:bg-red-500/10 transition-colors ml-2">
                  {deleting[`s-${subject.id}`] ? <Spinner size={13} /> : <Trash2 size={13} />}
                </button>
              </div>

              {expanded[subject.id] && (
                <div className="border-t" style={{ borderColor: 'var(--border)' }}>
                  {/* Topics */}
                  {subject.topics.map(topic => (
                    <div key={topic.id} className="flex items-center justify-between px-4 py-2.5 border-b"
                         style={{ borderColor: 'var(--border)' }}>
                      <p className="text-sm" style={{ color: 'var(--text)' }}>{topic.name}</p>
                      <button onClick={() => deleteTopic(topic.id)}
                        disabled={deleting[`t-${topic.id}`]}
                        className="p-1 rounded text-red-400 hover:bg-red-500/10 transition-colors">
                        {deleting[`t-${topic.id}`] ? <Spinner size={12} /> : <X size={13} />}
                      </button>
                    </div>
                  ))}

                  {/* Add topic */}
                  <div className="flex gap-2 p-3">
                    <input className="input flex-1 text-sm py-2"
                      placeholder="Add topic..."
                      value={newTopics[subject.id] || ''}
                      onChange={e => setNewTopics(t => ({ ...t, [subject.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && addTopic(subject.id)} />
                    <button onClick={() => addTopic(subject.id)}
                      disabled={saving[`t-${subject.id}`] || !newTopics[subject.id]?.trim()}
                      className="btn-primary py-2 px-3 text-sm flex items-center gap-1">
                      {saving[`t-${subject.id}`] ? <Spinner size={13} /> : <Plus size={13} />} Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </Layout>
  )
}
