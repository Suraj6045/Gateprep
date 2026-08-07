import { useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/shared/Layout'
import { bookmarkAPI, fetcher } from '../api/api'
import useSWR, { mutate as globalMutate } from 'swr'
import toast from 'react-hot-toast'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import Bookmark from 'lucide-react/dist/esm/icons/bookmark'
import BookmarkX from 'lucide-react/dist/esm/icons/bookmark-x'
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down'
import ChevronUp from 'lucide-react/dist/esm/icons/chevron-up'
import Search from 'lucide-react/dist/esm/icons/search'
import StickyNote from 'lucide-react/dist/esm/icons/sticky-note'
import X from 'lucide-react/dist/esm/icons/x'
import Check from 'lucide-react/dist/esm/icons/check'
import Spinner from '../components/shared/Spinner'
import MathText from '../components/shared/MathText'
import clsx from 'clsx'

// --- Helpers (pure, no complexity cost) ---

const QUESTION_TYPE_VARIANT = {
  nat: 'secondary',
  msq: 'outline',
  default: 'default',
}

function typeVariant(questionType) {
  return QUESTION_TYPE_VARIANT[questionType] ?? QUESTION_TYPE_VARIANT.default
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D']

// --- Extracted: options grid ---

function BookmarkOptions({ options, correctAnswer }) {
  if (!options?.length) return null
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
      {options.map((o, i) => {
        const letter = OPTION_LETTERS[i]
        const isCorrect = correctAnswer?.includes(letter)
        return (
          <div key={i} className={clsx(
            'px-3 py-2 rounded-lg text-xs',
            isCorrect ? 'result-stat-correct text-success-text' : 'bg-muted text-muted-foreground'
          )}>
            <span className="font-mono font-semibold mr-1.5">{letter}.</span>
            <MathText>{o}</MathText>
            {isCorrect && <span className="ml-1 text-success-text">✓</span>}
          </div>
        )
      })}
    </div>
  )
}

// --- Extracted: NAT answer row ---

function NatAnswer({ correctAnswer }) {
  if (!correctAnswer) return null
  return (
    <div className="px-3 py-2 rounded-lg result-stat-correct text-success-text text-xs">
      Answer: <span className="font-mono font-semibold">{correctAnswer}</span>
    </div>
  )
}

// --- Extracted: note editor (owns its own state) ---

function BookmarkNoteEditor({ bm }) {
  const [editing, setEditing] = useState(false)
  const [note, setNote] = useState(bm.note || '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await bookmarkAPI.updateNote(bm.question_id, note)
      globalMutate('/bookmarks', (prev) =>
        prev ? prev.map(b => b.question_id === bm.question_id ? { ...b, note } : b) : prev, false)
      toast.success('Note saved')
      setEditing(false)
    } catch {
      toast.error('Failed to save note')
    } finally {
      setSaving(false)
    }
  }

  const cancel = () => { setEditing(false); setNote(bm.note || '') }

  if (editing) {
    return (
      <div className="space-y-2">
        <Textarea className="min-h-20 resize-none text-xs bg-transparent" rows={2}
          value={note} onChange={e => setNote(e.target.value)}
          placeholder="Add a personal note..." autoFocus />
        <div className="flex gap-2">
          <Button onClick={save} disabled={saving} variant="outline" size="sm"
            className="gap-1 rounded-md bg-success-text/10 text-success-text hover:bg-success-text/20 hover:text-success-text border-success-text/20">
            {saving ? <Spinner size={12} /> : <Check data-icon="inline-start" />} Save
          </Button>
          <Button onClick={cancel} variant="outline" size="sm"
            className="gap-1 rounded-md bg-muted text-muted-foreground hover:bg-muted/80 text-muted-foreground border-transparent">
            <X data-icon="inline-start" /> Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Button onClick={() => setEditing(true)} variant="ghost" size="sm"
      className="h-auto gap-1.5 px-0 text-xs text-muted-foreground hover:text-primary">
      <StickyNote data-icon="inline-start" />
      {bm.note ? <span className="text-primary/80">{bm.note}</span> : 'Add note'}
    </Button>
  )
}

// --- Extracted: header (question summary + toggle/remove) ---

function BookmarkHeader({ bm, open, onToggle, onRemove, removing }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-1 min-w-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary rounded outline-none"
        role="button" tabIndex={0} aria-expanded={open}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() } }}
        onClick={onToggle}>
        <div className="text-foreground text-sm leading-snug line-clamp-2"><MathText>{bm.question_text}</MathText></div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Badge variant={typeVariant(bm.question_type)} className="h-5 px-2 text-[10px] tracking-wide">
            {bm.question_type?.toUpperCase()}
          </Badge>
          <span className="text-muted-foreground text-xs">{bm.marks}M</span>
          {bm.subject && <span className="text-muted-foreground text-xs">· {bm.subject}</span>}
          <span className="text-foreground text-xs">· {bm.test_title}</span>
        </div>
        {bm.note && !open && (
          <p className="text-primary/70 text-xs mt-1.5 flex items-center gap-1">
            <StickyNote size={10} /> {bm.note}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button onClick={onToggle} aria-expanded={open} aria-label="Toggle details" variant="ghost"
          size="icon-sm" className="text-muted-foreground hover:text-foreground">
          {open ? <ChevronUp data-icon="inline-start" /> : <ChevronDown data-icon="inline-start" />}
        </Button>
        <Button onClick={onRemove} disabled={removing} aria-label="Remove bookmark" variant="ghost"
          size="icon-sm" className="text-muted-foreground hover:text-destructive transition-colors">
          {removing ? <Spinner size={13} /> : <BookmarkX data-icon="inline-start" />}
        </Button>
      </div>
    </div>
  )
}

// --- Extracted: expanded details body ---

function BookmarkDetails({ bm }) {
  return (
    <div className="border-t theme-border pt-3 mt-3 space-y-3">
      <BookmarkOptions options={bm.options} correctAnswer={bm.correct_answer} />
      {bm.question_type === 'nat' && <NatAnswer correctAnswer={bm.correct_answer} />}
      <BookmarkNoteEditor bm={bm} />
    </div>
  )
}

// --- Orchestrator: now thin ---

function BookmarkCard({ bm, onRemove }) {
  const [open, setOpen] = useState(false)
  const [removing, setRemoving] = useState(false)

  const remove = async () => {
    setRemoving(true)
    try {
      await bookmarkAPI.toggle(bm.question_id)
      onRemove(bm.question_id)
      toast('Bookmark removed', { duration: 1500 })
    } catch {
      toast.error('Failed')
    } finally {
      setRemoving(false)
    }
  }

  const toggle = () => setOpen(o => !o)

  return (
    <Card className="overflow-hidden border border-border/80 shadow-sm"
      style={{ background: 'var(--bg-card)', '--card-spacing': '1rem' }}>
      <CardContent className="px-(--card-spacing) py-(--card-spacing)">
        <BookmarkHeader bm={bm} open={open} onToggle={toggle} onRemove={remove} removing={removing} />
        {open && <BookmarkDetails bm={bm} />}
      </CardContent>
    </Card>
  )
}

// --- Extracted: pure filter predicate (testable in isolation) ---

function matchesBookmark(b, search, subject) {
  if (subject !== 'all' && b.subject !== subject) return false
  if (!search) return true
  const q = search.toLowerCase()
  return (
    b.question_text?.toLowerCase().includes(q) ||
    (b.note || '').toLowerCase().includes(q) ||
    (b.subject || '').toLowerCase().includes(q)
  )
}

// --- Extracted: each render state as its own component ---

function BookmarksLoading() {
  return <div className="flex justify-center py-16"><Spinner size={28} className="text-primary" /></div>
}

function EmptyBookmarks() {
  return (
    <Card className="border border-border/80 shadow-sm text-center" style={{ background: 'var(--bg-card)' }}>
      <CardContent className="p-12">
        <Bookmark size={40} className="text-foreground mx-auto mb-3" />
        <p className="text-muted-foreground font-medium">No bookmarks yet</p>
        <p className="text-muted-foreground text-sm mt-1">
          Click the <span className="text-primary">Bookmark</span> button during a test to save questions here
        </p>
        <Button asChild className="mt-5 gap-2 text-sm rounded-md shadow-sm">
          <Link to="/tests">Go to Tests</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function NoMatches() {
  return <p className="text-center text-muted-foreground py-8">No bookmarks match your search</p>
}

function BookmarkList({ items, onRemove }) {
  return (
    <div className="space-y-2">
      {items.map(bm => <BookmarkCard key={bm.id} bm={bm} onRemove={onRemove} />)}
    </div>
  )
}

// --- Extracted: render-state selector (replaces the 4-way ternary chain) ---

function renderBookmarksBody({ loading, bookmarks, filtered, onRemove }) {
  if (loading) return <BookmarksLoading />
  if (bookmarks.length === 0) return <EmptyBookmarks />
  if (filtered.length === 0) return <NoMatches />
  return <BookmarkList items={filtered} onRemove={onRemove} />
}

// --- Orchestrator: now thin ---

export default function BookmarksPage() {
  const { data: bookmarksData, isLoading: loading, mutate } = useSWR('/bookmarks', fetcher)
  const bookmarks = bookmarksData || []
  const [search, setSearch] = useState('')
  const [filterSubject, setFilterSubject] = useState('all')

  const onRemove = (questionId) => {
    mutate(bookmarks.filter(b => b.question_id !== questionId), false)
    globalMutate('/bookmarks/ids', (prev) => {
      if (!prev) return prev
      const nextIds = new Set(prev.ids || [])
      nextIds.delete(questionId)
      return { ...prev, ids: Array.from(nextIds) }
    }, false)
  }

  const subjects = ['all', ...new Set(bookmarks.map(b => b.subject).filter(Boolean))]
  const filtered = bookmarks.filter(b => matchesBookmark(b, search, filterSubject))

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
            <Bookmark size={26} className="text-primary" /> Bookmarks
          </h1>
          <p className="text-muted-foreground mt-1">
            {bookmarks.length} saved question{bookmarks.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search questions or notes..."
              className="h-9 pl-10 text-sm bg-[var(--bg-card)]" />
          </div>
          {subjects.length > 1 && (
            <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
              className="h-9 w-full sm:w-40 min-w-0 rounded-lg border border-input bg-[var(--bg-card)] px-2.5 text-sm text-foreground shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
              {subjects.map(s => <option key={s} value={s}>{s === 'all' ? 'All subjects' : s}</option>)}
            </select>
          )}
        </div>

        {renderBookmarksBody({ loading, bookmarks, filtered, onRemove })}
      </div>
    </Layout>
  )
}
