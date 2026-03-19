import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/shared/Layout'
import { useAuth } from '../context/AuthContext'
import { testAPI } from '../api/api'
import { BookOpen, Clock, Target, ArrowRight, CheckCircle, TrendingUp } from 'lucide-react'
import Spinner from '../components/shared/Spinner'

export default function Dashboard() {
  const { user } = useAuth()
  const [tests, setTests] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([testAPI.getTests(), testAPI.getHistory()])
      .then(([t, h]) => { setTests(t.data); setHistory(h.data) })
      .finally(() => setLoading(false))
  }, [])

  const submitted = history.filter(h => h.status === 'submitted')
  const bestScore  = submitted.length ? Math.max(...submitted.map(h => h.score||0)) : 0
  const avgPct     = submitted.length
    ? Math.round(submitted.reduce((s,h)=>(h.total_marks?s+h.score/h.total_marks*100:s),0) / submitted.length)
    : 0

  const attemptMap = Object.fromEntries(history.map(h => [h.test_id, h]))

  if (loading) return <Layout><div className="flex justify-center py-16"><Spinner size={28} className="text-sky-500"/></div></Layout>

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Hello, {user?.full_name?.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-400 mt-1">Ready to practice? Pick a test below.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Tests Available', value: tests.length, icon: BookOpen, color: 'text-sky-400', bg: 'bg-sky-500/10' },
            { label: 'Completed', value: submitted.length, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
            { label: 'Best Score', value: bestScore.toFixed(1), icon: Target, color: 'text-amber-400', bg: 'bg-amber-500/10' },
            { label: 'Avg. Score %', value: `${avgPct}%`, icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="gate-card p-5 flex flex-col gap-2">
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon size={18} className={color} />
              </div>
              <p className="text-2xl font-bold text-white mt-1">{value}</p>
              <p className="text-slate-500 text-sm">{label}</p>
            </div>
          ))}
        </div>

        {/* Tests */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Available Tests</h2>
          {tests.length === 0 ? (
            <div className="gate-card p-10 text-center">
              <BookOpen size={36} className="text-slate-700 mx-auto mb-3"/>
              <p className="text-slate-400">No tests available yet. Check back later.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tests.map(t => {
                const attempt = attemptMap[t.id]
                const done = attempt?.status === 'submitted'
                return (
                  <div key={t.id} className="gate-card p-5 flex flex-col gap-3 hover:border-brand-500/30 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-white leading-snug">{t.title}</h3>
                      {done && <span className="badge badge-green flex-shrink-0">Done</span>}
                    </div>
                    {t.description && <p className="text-slate-500 text-sm line-clamp-2">{t.description}</p>}
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5"><Clock size={12}/>{t.duration_minutes} min</span>
                      <span className="flex items-center gap-1.5"><BookOpen size={12}/>{t.question_count} questions</span>
                      <span className="flex items-center gap-1.5"><Target size={12}/>{t.total_marks} marks</span>
                    </div>
                    {done && attempt && (
                      <div className="px-3 py-2 rounded-lg bg-green-500/5 border border-green-500/15 text-xs text-green-400">
                        Score: {attempt.score?.toFixed(1)} / {attempt.total_marks} ({attempt.total_marks ? Math.round(attempt.score/attempt.total_marks*100) : 0}%)
                      </div>
                    )}
                    <div className="flex gap-2 pt-1 border-t border-slate-800">
                      {done ? (
                        <Link to={`/results/${attempt.id}`} className="flex-1 flex items-center justify-center gap-1.5 btn-ghost text-sm py-2">
                          View Result <ArrowRight size={13}/>
                        </Link>
                      ) : (
                        <Link to={`/tests/${t.id}`} className="flex-1 flex items-center justify-center gap-1.5 text-sm py-2 rounded-xl font-medium btn-primary">
                          Start Test <ArrowRight size={13}/>
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
