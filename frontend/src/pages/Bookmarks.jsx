import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/shared/Layout'
import { bookmarkAPI } from '../api/api'
import toast from 'react-hot-toast'
import { Bookmark, BookmarkX, ChevronDown, ChevronUp, Search, StickyNote, X, Check } from 'lucide-react'
import Spinner from '../components/shared/Spinner'
import clsx from 'clsx'

function BookmarkCard({ bm, onRemove }) {
  const [open, setOpen] = useState(false)
  const [editingNote, setEditingNote] = useState(false)
  const [note, setNote] = useState(bm.note || '')
  const [savingNote, setSavingNote] = useState(false)
  const [removing, setRemoving] = useState(false)

  const typeColor = { mcq: 'badge-blue', msq: 'badge-amber', nat: 'badge-green' }

  const saveNote = async () => {
    setSavingNote(true)
    try {
      await bookmarkAPI.updateNote(bm.question_id, note)
      toast.success('Note saved')
      setEditingNote(false)
    } catch { toast.error('Failed to save note') }
    finally { setSavingNote(false) }
  }

  const remove = async () => {
    setRemoving(true)
    try {
      await bookmarkAPI.toggle(bm.question_id)
      onRemove(bm.question_id)
      toast('Bookmark removed', { duration: 1500 })
    } catch { toast.error('Failed') }
    finally { setRemoving(false) }
  }

  return (
    <div className="gate-card overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setOpen(o => !o)}>
          <p className="text-slate-200 text-sm leading-snug line-clamp-2">{bm.question_text}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`badge text-xs ${typeColor[bm.question_type] || 'badge-slate'}`}>
              {bm.question_type?.toUpperCase()}
            </span>
            <span className="text-slate-600 text-xs">{bm.marks}M</span>
            {bm.subject && <span className="text-slate-600 text-xs">· {bm.subject}</span>}
            <span className="text-slate-700 text-xs">· {bm.test_title}</span>
          </div>
          {bm.note && !open && (
            <p className="text-sky-400/70 text-xs mt-1.5 flex items-center gap-1">
              <StickyNote size={10} /> {bm.note}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={() => setOpen(o => !o)} className="p-1.5 text-slate-600 hover:text-slate-300">
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button onClick={remove} disabled={removing} className="p-1.5 text-slate-600 hover:text-red-400 transition-colors">
            {removing ? <Spinner size={13} /> : <BookmarkX size={14} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="px-4 pb-4 border-t border-slate-800 pt-3 space-y-3">
          {/* Options */}
          {bm.options?.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5">
              {bm.options.map((o, i) => {
                const letter = 'ABCD'[i]
                const isCorrect = bm.correct_answer?.includes(letter)
                return (
                  <div key={i} className={clsx(
                    'px-3 py-2 rounded-lg text-xs',
                    isCorrect ? 'bg-green-500/10 border border-green-500/20 text-green-300' : 'bg-slate-800/50 text-slate-400'
                  )}>
                    <span className="font-mono font-semibold mr-1.5">{letter}.</span>{o}
                    {isCorrect && <span className="ml-1 text-green-400">✓</span>}
                  </div>
                )
              })}
            </div>
          )}

          {/* NAT answer */}
          {bm.question_type === 'nat' && (
            <div className="px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-300 text-xs">
              Answer: <span className="font-mono font-semibold">{bm.correct_answer}</span>
            </div>
          )}

          {/* Note section */}
          <div>
            {editingNote ? (
              <div className="space-y-2">
                <textarea
                  className="input resize-none text-xs"
                  rows={2}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Add a personal note..."
                  autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={saveNote} disabled={savingNote} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs hover:bg-green-500/20 transition-colors">
                    {savingNote ? <Spinner size={12} /> : <Check size={12} />} Save
                  </button>
                  <button onClick={() => { setEditingNote(false); setNote(bm.note || '') }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-700 text-slate-400 text-xs hover:bg-slate-600 transition-colors">
                    <X size={12} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setEditingNote(true)} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-sky-400 transition-colors">
                <StickyNote size={12} />
                {bm.note ? <span className="text-sky-400/80">{bm.note}</span> : 'Add note'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterSubject, setFilterSubject] = useState('all')

  useEffect(() => {
    bookmarkAPI.getAll()
      .then(r => setBookmarks(r.data))
      .finally(() => setLoading(false))
  }, [])

  const onRemove = (questionId) => setBookmarks(bs => bs.filter(b => b.question_id !== questionId))

  const subjects = ['all', ...new Set(bookmarks.map(b => b.subject).filter(Boolean))]

  const filtered = bookmarks.filter(b => {
    const matchSearch = b.question_text.toLowerCase().includes(search.toLowerCase()) ||
      (b.note || '').toLowerCase().includes(search.toLowerCase()) ||
      (b.subject || '').toLowerCase().includes(search.toLowerCase())
    const matchSubject = filterSubject === 'all' || b.subject === filterSubject
    return matchSearch && matchSubject
  })

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Bookmark size={26} className="text-sky-400" /> Bookmarks
          </h1>
          <p className="text-slate-400 mt-1">{bookmarks.length} saved question{bookmarks.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search questions or notes..." className="input pl-10 text-sm" />
          </div>
          {subjects.length > 1 && (
            <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} className="input text-sm w-40">
              {subjects.map(s => <option key={s} value={s}>{s === 'all' ? 'All subjects' : s}</option>)}
            </select>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner size={28} className="text-sky-500" /></div>
        ) : bookmarks.length === 0 ? (
          <div className="gate-card p-12 text-center">
            <Bookmark size={40} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No bookmarks yet</p>
            <p className="text-slate-600 text-sm mt-1">
              Click the <span className="text-sky-400">Bookmark</span> button during a test to save questions here
            </p>
            <Link to="/tests" className="btn-primary mt-5 inline-flex items-center gap-2 text-sm">
              Go to Tests
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-slate-500 py-8">No bookmarks match your search</p>
        ) : (
          <div className="space-y-2">
            {filtered.map(bm => (
              <BookmarkCard key={bm.id} bm={bm} onRemove={onRemove} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
