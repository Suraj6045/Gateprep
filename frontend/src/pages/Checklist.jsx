import { useEffect, useState } from 'react'
import Layout from '../components/shared/Layout'
import { checklistAPI } from '../api/api'
import { CheckSquare, Square, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react'
import Spinner from '../components/shared/Spinner'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const ITEM_LABELS = {
  theory:     'Theory',
  pyq_1:      'PYQ 1st',
  pyq_2:      'PYQ 2nd',
  pyq_3:      'PYQ 3rd',
  revision_1: 'Rev 1',
  revision_2: 'Rev 2',
  revision_3: 'Rev 3',
}

export default function ChecklistPage() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})
  const [updating, setUpdating] = useState({})

  useEffect(() => {
    checklistAPI.get()
      .then(r => {
        setData(r.data)
        if (r.data.subjects?.length > 0) {
          setExpanded({ [r.data.subjects[0].id]: true })
        }
      })
      .catch(() => toast.error('Failed to load checklist'))
      .finally(() => setLoading(false))
  }, [])

  const toggle = async (topicId, item, current) => {
    const key = `${topicId}-${item}`
    setUpdating(u => ({ ...u, [key]: true }))
    try {
      const res = await checklistAPI.updateProgress(topicId, item, !current)
      setData(d => ({
        ...d,
        subjects: d.subjects.map(s => ({
          ...s,
          topics: s.topics.map(t => {
            if (t.id !== topicId) return t
            const newDone = res.data.done_count
            const total   = Object.keys(ITEM_LABELS).length
            return {
              ...t,
              completed_items: res.data.completed_items,
              done_count:  newDone,
              percentage:  res.data.percentage,
            }
          }),
          subject_percentage: (() => {
            const allTopics = s.topics.map(t =>
              t.id === topicId ? res.data.done_count : (t.done_count || 0)
            )
            const total = s.topics.length * Object.keys(ITEM_LABELS).length
            const done  = allTopics.reduce((a, b) => a + b, 0)
            return total ? Math.round(done / total * 100) : 0
          })()
        }))
      }))
    } catch {
      toast.error('Failed to update')
    } finally {
      setUpdating(u => ({ ...u, [key]: false }))
    }
  }

  if (loading) return (
    <Layout><div className="flex justify-center py-16"><Spinner size={28} className="text-sky-500" /></div></Layout>
  )

  if (!data || !data.subjects || data.subjects.length === 0) return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text)' }}>Syllabus Checklist</h1>
        <div className="gate-card p-10 text-center">
          <CheckSquare size={36} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-muted)' }}>No syllabus topics added yet.</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Ask admin to add subjects and topics from Admin → Checklist.
          </p>
        </div>
      </div>
    </Layout>
  )

  const totalItems = data.subjects.reduce((s, sub) => s + sub.topics.length * Object.keys(ITEM_LABELS).length, 0)
  const doneItems  = data.subjects.reduce((s, sub) =>
    s + sub.topics.reduce((ts, t) => ts + (t.done_count || 0), 0), 0)
  const overallPct = totalItems ? Math.round(doneItems / totalItems * 100) : 0

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Syllabus Checklist</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Track your preparation progress</p>
        </div>

        {/* Overall progress bar */}
        <div className="gate-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold flex items-center gap-2" style={{ color: 'var(--text)' }}>
              <TrendingUp size={15} className="text-sky-400" /> Overall Progress
            </span>
            <span className="font-bold text-sky-400">{overallPct}%</span>
          </div>
          <div className="h-3 rounded-full" style={{ background: 'var(--border)' }}>
            <div className="h-3 rounded-full bg-sky-500 transition-all duration-500"
                 style={{ width: `${overallPct}%` }} />
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {doneItems} / {totalItems} items completed
          </p>
        </div>

        {/* Subjects */}
        {data.subjects.map(subject => (
          <div key={subject.id} className="gate-card overflow-hidden">
            {/* Subject header */}
            <div className="flex items-center justify-between p-4 cursor-pointer select-none"
                 onClick={() => setExpanded(e => ({ ...e, [subject.id]: !e[subject.id] }))}
                 style={{ background: 'var(--bg-panel)' }}>
              <div className="flex items-center gap-3">
                <h3 className="font-semibold" style={{ color: 'var(--text)' }}>{subject.name}</h3>
                <span className="badge badge-blue text-xs">{subject.subject_percentage}%</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-20 h-1.5 rounded-full hidden sm:block" style={{ background: 'var(--border)' }}>
                  <div className="h-1.5 rounded-full bg-sky-500 transition-all"
                       style={{ width: `${subject.subject_percentage}%` }} />
                </div>
                {expanded[subject.id]
                  ? <ChevronUp size={15} style={{ color: 'var(--text-muted)' }} />
                  : <ChevronDown size={15} style={{ color: 'var(--text-muted)' }} />}
              </div>
            </div>

            {/* Topics */}
            {expanded[subject.id] && subject.topics.map(topic => (
              <div key={topic.id} className="border-t px-4 py-3" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{topic.name}</p>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {topic.done_count}/{topic.total_items}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(ITEM_LABELS).map(([item, label]) => {
                    const done = topic.completed_items?.[item] || false
                    const key  = `${topic.id}-${item}`
                    return (
                      <button key={item}
                        onClick={() => toggle(topic.id, item, done)}
                        disabled={updating[key]}
                        className={clsx(
                          'flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-xs font-medium transition-all',
                          done
                            ? 'border-green-500/30 text-green-400'
                            : 'text-slate-500 hover:border-slate-500'
                        )}
                        style={{
                          background: done ? 'rgba(81,207,102,0.08)' : 'transparent',
                          borderColor: done ? undefined : 'var(--border)'
                        }}>
                        {updating[key]
                          ? <Spinner size={10} />
                          : done
                            ? <CheckSquare size={12} />
                            : <Square size={12} />}
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            {expanded[subject.id] && subject.topics.length === 0 && (
              <div className="border-t px-4 py-4 text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                No topics added for this subject yet.
              </div>
            )}
          </div>
        ))}
      </div>
    </Layout>
  )
}
