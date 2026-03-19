import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import Layout from '../components/shared/Layout'
import { adminAPI } from '../api/api'
import toast from 'react-hot-toast'
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp, X, Upload, FileJson } from 'lucide-react'
import Spinner from '../components/shared/Spinner'

const EMPTY_Q = { question_type: 'mcq', question_text: '', options: ['','','',''], correct_answer: 'A', marks: 1, negative_marks: 0.33, subject: '', topic: '' }

function QuestionForm({ onAdd, onClose }) {
  const [q, setQ] = useState({ ...EMPTY_Q, options: ['','','',''] })
  const [loading, setLoading] = useState(false)
  const isNAT = q.question_type === 'nat'
  const isMSQ = q.question_type === 'msq'

  const setOpt = (i, v) => setQ(prev => { const o=[...prev.options]; o[i]=v; return {...prev, options:o} })

  const submit = async () => {
    if (!q.question_text.trim()) { toast.error('Question text required'); return }
    if (!isNAT && q.options.some(o => !o.trim())) { toast.error('Fill all 4 options'); return }
    if (!q.correct_answer.trim()) { toast.error('Correct answer required'); return }
    setLoading(true)
    try {
      const payload = { ...q, options: isNAT ? [] : q.options, negative_marks: (isMSQ||isNAT) ? 0 : q.negative_marks }
      await onAdd(payload)
      setQ({ ...EMPTY_Q, options: ['','','',''] })
      toast.success('Question added')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="gate-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-white">Add Question Manually</h4>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X size={16}/></button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">Type</label>
          <select className="input" value={q.question_type} onChange={e => setQ(prev=>({...prev, question_type:e.target.value, correct_answer:'', negative_marks: e.target.value==='mcq'?0.33:0}))}>
            <option value="mcq">MCQ (Single)</option>
            <option value="msq">MSQ (Multi)</option>
            <option value="nat">NAT (Numerical)</option>
          </select>
        </div>
        <div>
          <label className="label">Marks</label>
          <input type="number" className="input" value={q.marks} step={0.5} min={0.5} onChange={e=>setQ(p=>({...p,marks:+e.target.value}))} />
        </div>
        <div>
          <label className="label">Neg. Marks</label>
          <input type="number" className="input" value={q.negative_marks} step={0.01} min={0} disabled={isMSQ||isNAT} onChange={e=>setQ(p=>({...p,negative_marks:+e.target.value}))} />
        </div>
      </div>
      <div>
        <label className="label">Question Text *</label>
        <textarea className="input resize-none" rows={3} value={q.question_text} onChange={e=>setQ(p=>({...p,question_text:e.target.value}))} placeholder="Enter question..." />
      </div>
      {!isNAT && (
        <div className="grid grid-cols-2 gap-2">
          {['A','B','C','D'].map((l,i) => (
            <div key={l}>
              <label className="label">Option {l}</label>
              <input className="input" value={q.options[i]} onChange={e=>setOpt(i,e.target.value)} placeholder={`Option ${l}`} />
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">{isNAT ? 'Answer (e.g. 42 or 41.5-42.5)' : isMSQ ? 'Correct (e.g. A,C)' : 'Correct (A/B/C/D)'}</label>
          <input className="input font-mono" value={q.correct_answer} onChange={e=>setQ(p=>({...p,correct_answer:e.target.value.toUpperCase()}))} placeholder={isNAT?'42 or 41.5-42.5':isMSQ?'A,C':'A'} />
        </div>
        <div>
          <label className="label">Subject (optional)</label>
          <input className="input" value={q.subject} onChange={e=>setQ(p=>({...p,subject:e.target.value}))} placeholder="e.g. Digital Logic" />
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
        <button onClick={submit} disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
          {loading && <Spinner size={14}/>} Add Question
        </button>
      </div>
    </div>
  )
}

function JSONUploadForm({ onAdd, onClose }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const fileRef = useRef()

  const SAMPLE = JSON.stringify({
    questions: [
      {
        question_type: "mcq",
        question_text: "What is the time complexity of binary search?",
        options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
        correct_answer: "B",
        marks: 1,
        negative_marks: 0.33,
        subject: "Algorithms"
      },
      {
        question_type: "nat",
        question_text: "How many distinct binary trees can be formed with 3 nodes?",
        options: [],
        correct_answer: "5",
        marks: 2,
        negative_marks: 0,
        subject: "Data Structures"
      }
    ]
  }, null, 2)

  const validate = (val) => {
    setError('')
    setPreview(null)
    if (!val.trim()) return
    try {
      const parsed = JSON.parse(val)
      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        setError('JSON must have a "questions" array')
        return
      }
      setPreview(parsed.questions)
    } catch (e) {
      setError('Invalid JSON: ' + e.message)
    }
  }

  const handleChange = (val) => {
    setText(val)
    validate(val)
  }

  const loadFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = ev.target.result
      setText(content)
      validate(content)
    }
    reader.readAsText(file)
  }

  const loadSample = () => {
    setText(SAMPLE)
    validate(SAMPLE)
  }

  const submit = async () => {
    if (!preview || preview.length === 0) { toast.error('No valid questions to upload'); return }
    setLoading(true)
    try {
      await onAdd(preview)
      toast.success(`${preview.length} questions added!`)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add questions')
    } finally { setLoading(false) }
  }

  return (
    <div className="gate-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-white">Upload Questions via JSON</h4>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X size={16}/></button>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={() => fileRef.current?.click()} className="btn-ghost flex items-center gap-2 text-sm py-2">
          <Upload size={14}/> Load JSON File
        </button>
        <button onClick={loadSample} className="btn-ghost flex items-center gap-2 text-sm py-2">
          <FileJson size={14}/> Load Sample
        </button>
        <input type="file" accept=".json" ref={fileRef} className="hidden" onChange={loadFile} />
      </div>

      {/* JSON format hint */}
      <div className="px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50 text-xs text-slate-500">
        Format: <span className="text-slate-400 font-mono">{"{ \"questions\": [ { question_type, question_text, options, correct_answer, marks, negative_marks } ] }"}</span>
        <br/>
        question_type: <span className="text-sky-400">mcq</span> / <span className="text-amber-400">msq</span> / <span className="text-green-400">nat</span> &nbsp;·&nbsp;
        correct_answer: <span className="text-sky-400">A</span> or <span className="text-amber-400">A,C</span> or <span className="text-green-400">42</span>
      </div>

      {/* Text area */}
      <div>
        <label className="label">Paste JSON here</label>
        <textarea
          className="input resize-none font-mono text-xs"
          rows={10}
          value={text}
          onChange={e => handleChange(e.target.value)}
          placeholder={'{\n  "questions": [\n    {\n      "question_type": "mcq",\n      "question_text": "Your question here?",\n      "options": ["A text", "B text", "C text", "D text"],\n      "correct_answer": "B",\n      "marks": 1,\n      "negative_marks": 0.33\n    }\n  ]\n}'}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Preview */}
      {preview && !error && (
        <div className="px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
          ✓ Valid JSON — {preview.length} question{preview.length !== 1 ? 's' : ''} ready to upload
          <div className="mt-1 space-y-0.5">
            {preview.slice(0, 3).map((q, i) => (
              <p key={i} className="text-green-400/70 text-xs truncate">
                {i+1}. [{q.question_type?.toUpperCase()}] {q.question_text}
              </p>
            ))}
            {preview.length > 3 && <p className="text-green-400/50 text-xs">...and {preview.length - 3} more</p>}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
        <button
          onClick={submit}
          disabled={loading || !preview || !!error}
          className="btn-primary flex-1 flex items-center justify-center gap-2"
        >
          {loading && <Spinner size={14}/>}
          {loading ? 'Uploading...' : `Upload ${preview ? preview.length : 0} Questions`}
        </button>
      </div>
    </div>
  )
}

function QuestionCard({ q, idx, onDelete }) {
  const [open, setOpen] = useState(false)
  const typeColor = { mcq:'badge-blue', msq:'badge-amber', nat:'badge-green' }

  return (
    <div className="gate-card overflow-hidden">
      <div className="flex items-start gap-3 p-4 cursor-pointer" onClick={() => setOpen(o=>!o)}>
        <span className="font-mono text-slate-600 text-sm mt-0.5 w-6 flex-shrink-0">Q{idx+1}</span>
        <div className="flex-1 min-w-0">
          <p className="text-slate-200 text-sm line-clamp-2">{q.question_text}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`badge text-xs ${typeColor[q.question_type]}`}>{q.question_type.toUpperCase()}</span>
            <span className="text-slate-600 text-xs">{q.marks}M</span>
            {q.subject && <span className="text-slate-600 text-xs">· {q.subject}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={e=>{e.stopPropagation();onDelete(q.id)}} className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <Trash2 size={13}/>
          </button>
          {open ? <ChevronUp size={15} className="text-slate-500"/> : <ChevronDown size={15} className="text-slate-500"/>}
        </div>
      </div>
      {open && (
        <div className="px-4 pb-4 border-t border-slate-800 pt-3 space-y-2">
          {q.options?.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5">
              {q.options.map((o,i) => {
                const letter = 'ABCD'[i]
                const isCorrect = q.correct_answer?.includes(letter)
                return (
                  <div key={i} className={`px-3 py-2 rounded-lg text-xs ${isCorrect ? 'bg-green-500/10 border border-green-500/20 text-green-300' : 'bg-slate-800/50 text-slate-400'}`}>
                    <span className="font-mono font-semibold mr-1.5">{letter}.</span>{o}
                  </div>
                )
              })}
            </div>
          )}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Answer:</span>
            <span className="font-mono text-green-400 font-semibold">{q.correct_answer}</span>
            <span className="text-slate-600 ml-2">·</span>
            <span className="text-slate-500">+{q.marks}M</span>
            {q.negative_marks > 0 && <span className="text-slate-500">/ -{q.negative_marks}M</span>}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminTestDetail() {
  const { testId } = useParams()
  const [test, setTest] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState(null) // 'manual' | 'json' | null

  const load = () => {
    Promise.all([adminAPI.getTest(testId), adminAPI.getQuestions(testId)])
      .then(([t, q]) => { setTest(t.data); setQuestions(q.data) })
      .finally(() => setLoading(false))
  }
  useEffect(load, [testId])

  const addQuestion = async (q) => {
    await adminAPI.addQuestions(testId, [q])
    load()
    setMode(null)
  }

  const addQuestionsJSON = async (qs) => {
    await adminAPI.addQuestions(testId, qs)
    load()
  }

  const deleteQuestion = async (qId) => {
    if (!confirm('Delete this question?')) return
    try {
      await adminAPI.deleteQuestion(testId, qId)
      setQuestions(qs => qs.filter(q => q.id !== qId))
      toast.success('Deleted')
    } catch { toast.error('Failed') }
  }

  if (loading) return <Layout><div className="flex justify-center py-16"><Spinner size={28} className="text-sky-500"/></div></Layout>

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in max-w-3xl">
        <div>
          <Link to="/admin/tests" className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm mb-4 w-fit">
            <ArrowLeft size={15}/> Back to Tests
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">{test?.title}</h1>
              <p className="text-slate-400 mt-1 text-sm">{test?.description}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                <span>{test?.duration_minutes} min</span>
                <span>{questions.length} questions</span>
                <span>{test?.total_marks} marks</span>
              </div>
            </div>
            {/* Add buttons */}
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => setMode(mode === 'json' ? null : 'json')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${mode==='json' ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' : 'btn-ghost'}`}
              >
                <FileJson size={15}/> JSON
              </button>
              <button
                onClick={() => setMode(mode === 'manual' ? null : 'manual')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${mode==='manual' ? 'bg-sky-500/15 border-brand-500/30 text-sky-300' : 'btn-primary'}`}
              >
                <Plus size={15}/> Manual
              </button>
            </div>
          </div>
        </div>

        {mode === 'manual' && <QuestionForm onAdd={addQuestion} onClose={() => setMode(null)} />}
        {mode === 'json' && <JSONUploadForm onAdd={addQuestionsJSON} onClose={() => setMode(null)} />}

        <div className="space-y-2">
          {questions.length === 0 ? (
            <div className="gate-card p-10 text-center">
              <p className="text-slate-500 mb-3">No questions yet.</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setMode('json')} className="btn-ghost flex items-center gap-2 text-sm">
                  <FileJson size={14}/> Upload JSON
                </button>
                <button onClick={() => setMode('manual')} className="btn-primary flex items-center gap-2 text-sm">
                  <Plus size={14}/> Add Manually
                </button>
              </div>
            </div>
          ) : (
            questions.map((q, idx) => (
              <QuestionCard key={q.id} q={q} idx={idx} onDelete={deleteQuestion} />
            ))
          )}
        </div>
      </div>
    </Layout>
  )
}
