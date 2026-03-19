import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Layout from '../components/shared/Layout'
import { testAPI } from '../api/api'
import { Trophy, ArrowLeft, Medal, Crown, RotateCcw } from 'lucide-react'
import Spinner from '../components/shared/Spinner'
import clsx from 'clsx'

const MEDAL_COLORS = {
  1: { bg: 'bg-amber-500/20 border-amber-500/40', text: 'text-amber-400', icon: <Crown size={16} className="text-amber-400"/> },
  2: { bg: 'bg-slate-400/10 border-slate-400/30', text: 'text-slate-300', icon: <Medal size={16} className="text-slate-400"/> },
  3: { bg: 'bg-orange-600/10 border-orange-600/30', text: 'text-orange-400', icon: <Medal size={16} className="text-orange-500"/> },
}

export default function LeaderboardPage() {
  const { testId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    testAPI.getLeaderboard(testId)
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [testId])

  if (loading) return <Layout><div className="flex justify-center py-16"><Spinner size={28} className="text-sky-500"/></div></Layout>
  if (!data) return <Layout><p className="text-slate-400 text-center py-16">Leaderboard not found.</p></Layout>

  const top3 = data.leaderboard.slice(0, 3)
  const rest = data.leaderboard.slice(3)

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <Link to="/tests" className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm">
            <ArrowLeft size={15}/> Back to Tests
          </Link>
          <Link to={`/tests/${testId}`} className="flex items-center gap-1.5 text-sky-400 hover:text-sky-300 text-sm">
            <RotateCcw size={13}/> Take Test
          </Link>
        </div>

        {/* Header */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <Trophy size={26} className="text-amber-400"/>
          </div>
          <h1 className="text-3xl font-bold text-white">{data.test_title}</h1>
          <p className="text-slate-400 mt-1">{data.total_participants} participant{data.total_participants !== 1 ? 's' : ''} · First attempt only</p>
          {data.current_user_rank && (
            <div className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full bg-sky-500/10 border border-brand-500/20">
              <span className="text-sky-400 text-sm font-medium">Your rank: #{data.current_user_rank}</span>
            </div>
          )}
        </div>

        {data.leaderboard.length === 0 ? (
          <div className="gate-card p-12 text-center">
            <p className="text-slate-400">No submissions yet. Be the first!</p>
            <Link to={`/tests/${testId}`} className="btn-primary mt-4 inline-flex items-center gap-2 text-sm">
              Take Test
            </Link>
          </div>
        ) : (
          <>
            {/* Top 3 podium */}
            {top3.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {/* Reorder: 2nd, 1st, 3rd for podium effect */}
                {[top3[1], top3[0], top3[2]].map((entry, podiumIdx) => {
                  if (!entry) return <div key={podiumIdx}/>
                  const actualRank = entry.rank
                  const m = MEDAL_COLORS[actualRank] || {}
                  const heights = ['h-28', 'h-36', 'h-24']
                  return (
                    <div key={entry.user_id} className={clsx(
                      'gate-card border p-4 flex flex-col items-center justify-end text-center',
                      m.bg, heights[podiumIdx],
                      entry.is_current_user && 'ring-2 ring-brand-500/50'
                    )}>
                      <div className="mb-1">{m.icon}</div>
                      <p className={`font-bold text-sm ${m.text} truncate w-full`}>
                        {entry.full_name.split(' ')[0]}
                        {entry.is_current_user && ' (You)'}
                      </p>
                      <p className="text-slate-400 text-xs">{entry.percentage}%</p>
                      <p className="text-slate-500 text-xs">{entry.score}/{entry.total_marks}</p>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Full table */}
            <div className="gate-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left px-5 py-3 text-slate-500 font-medium text-xs uppercase tracking-wider w-12">Rank</th>
                    <th className="text-left px-5 py-3 text-slate-500 font-medium text-xs uppercase tracking-wider">Name</th>
                    <th className="text-right px-5 py-3 text-slate-500 font-medium text-xs uppercase tracking-wider">Score</th>
                    <th className="text-right px-5 py-3 text-slate-500 font-medium text-xs uppercase tracking-wider">%</th>
                    <th className="text-right px-5 py-3 text-slate-500 font-medium text-xs uppercase tracking-wider hidden sm:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {data.leaderboard.map(entry => {
                    const m = MEDAL_COLORS[entry.rank]
                    return (
                      <tr key={entry.user_id} className={clsx(
                        'transition-colors',
                        entry.is_current_user ? 'bg-sky-500/5' : 'hover:bg-slate-800/30'
                      )}>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-center w-7 h-7">
                            {m ? m.icon : <span className="text-slate-500 font-mono text-sm">#{entry.rank}</span>}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-semibold text-slate-300">{entry.full_name[0]?.toUpperCase()}</span>
                            </div>
                            <span className={clsx('font-medium', entry.is_current_user ? 'text-sky-300' : 'text-slate-200')}>
                              {entry.full_name}
                              {entry.is_current_user && <span className="text-sky-400 text-xs ml-1">(You)</span>}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-slate-300">
                          {entry.score}/{entry.total_marks}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className={clsx('font-semibold', entry.percentage >= 75 ? 'text-green-400' : entry.percentage >= 50 ? 'text-amber-400' : 'text-red-400')}>
                            {entry.percentage}%
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right text-slate-500 text-xs hidden sm:table-cell">
                          {entry.submitted_at ? new Date(entry.submitted_at).toLocaleDateString('en-IN') : '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-center text-slate-600 text-xs">
              Only first attempts count toward rankings. Reattempts are for practice only.
            </p>
          </>
        )}
      </div>
    </Layout>
  )
}
