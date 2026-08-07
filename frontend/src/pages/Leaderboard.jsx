import { useParams, Link } from 'react-router-dom'
import Layout from '../components/shared/Layout'
import { fetcher } from '../api/api'
import useSWR from 'swr'
import Trophy from 'lucide-react/dist/esm/icons/trophy'
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left'
import Medal from 'lucide-react/dist/esm/icons/medal'
import Crown from 'lucide-react/dist/esm/icons/crown'
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw'
import Spinner from '../components/shared/Spinner'
import clsx from 'clsx'
import { LeaderboardSkeleton } from '../components/shared/Skeletons'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table'

const MEDAL_COLORS = {
  1: { bg: 'bg-[var(--warning-text)]/20 border-[var(--warning-text)]/40', text: 'text-warning-text', icon: <Crown size={16} className="text-warning-text"/> },
  2: { bg: 'bg-muted border-border', text: 'text-muted-foreground', icon: <Medal size={16} className="text-muted-foreground"/> },
  3: { bg: 'bg-[#ea580c]/10 border-[#ea580c]/30', text: 'text-[#fb923c]', icon: <Medal size={16} className="text-[#f97316]"/> },
}

export default function LeaderboardPage() {
  const { testId } = useParams()
  const { data, isLoading: loading } = useSWR(`/tests/${testId}/leaderboard`, fetcher)

  if (loading) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto flex flex-col gap-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <Link to="/tests" className="flex items-center gap-1.5 text-muted-foreground hover:text-muted-foreground text-sm">
              <ArrowLeft size={15}/> Back to Tests
            </Link>
          </div>
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-[var(--warning-text)]/10 border-[var(--warning-text)]/20 flex items-center justify-center mx-auto mb-4 animate-pulse" />
            <div className="h-8 w-64 bg-muted rounded animate-pulse mx-auto mb-2" />
            <div className="h-4 w-40 bg-muted rounded animate-pulse mx-auto" />
          </div>
          <LeaderboardSkeleton />
        </div>
      </Layout>
    )
  }
  if (!data) return <Layout><p className="text-muted-foreground text-center py-16">Leaderboard not found.</p></Layout>

  const top3 = data.leaderboard.slice(0, 3)

  return (
    <Layout>
      <div className="max-w-2xl mx-auto flex flex-col gap-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <Link to="/tests" className="flex items-center gap-1.5 text-muted-foreground hover:text-muted-foreground text-sm">
            <ArrowLeft size={15}/> Back to Tests
          </Link>
          <Link to={`/tests/${testId}`} className="flex items-center gap-1.5 text-primary hover:text-primary text-sm">
            <RotateCcw size={13}/> Take Test
          </Link>
        </div>

        {/* Header */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-[var(--warning-text)]/10 border-[var(--warning-text)]/20 flex items-center justify-center mx-auto mb-4">
            <Trophy size={26} className="text-warning-text"/>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{data.test_title}</h1>
          <p className="text-muted-foreground mt-1">{data.total_participants} participant{data.total_participants !== 1 ? 's' : ''} · First attempt only</p>
          {data.current_user_rank && (
            <div className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full bg-primary/10 border border-brand-500/20">
              <span className="text-primary text-sm font-medium">Your rank: #{data.current_user_rank}</span>
            </div>
          )}
        </div>

        {data.leaderboard.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">No submissions yet. Be the first!</p>
              <Button asChild className="mt-4 inline-flex items-center gap-2 text-sm">
                <Link to={`/tests/${testId}`}>
                  Take Test
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Top 3 podium */}
            {top3.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {/* Reorder: 2nd, 1st, 3rd for podium effect */}
                {[top3[1], top3[0], top3[2]].map((entry, podiumIdx) => {
                  if (!entry) return <div key={`podium-empty-${podiumIdx}`}/>
                  const actualRank = entry.rank
                  const m = MEDAL_COLORS[actualRank] || {}
                  const heights = ['h-24 sm:h-28', 'h-28 sm:h-36', 'h-20 sm:h-24']
                  return (
                    <Card key={`podium-${podiumIdx}-user-${entry.user_id}`} className={clsx(
                      'border p-2.5 sm:p-4 flex flex-col items-center justify-end text-center',
                      m.bg, heights[podiumIdx],
                      entry.is_current_user && 'ring-2 ring-brand-500/50'
                    )}>
                      <div className="mb-1">{m.icon}</div>
                      <p className={`font-bold text-sm ${m.text} truncate w-full`}>
                        {entry.full_name.split(' ')[0]}
                        {entry.is_current_user && ' (You)'}
                      </p>
                      <p className="text-muted-foreground text-xs">{entry.percentage}%</p>
                      <p className="text-muted-foreground text-xs">{entry.score}/{entry.total_marks}</p>
                    </Card>
                  )
                })}
              </div>
            )}

            {/* Full table */}
            <Card className="overflow-hidden overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b theme-border hover:bg-transparent">
                    <TableHead className="text-left px-3 sm:px-5 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wider w-12">Rank</TableHead>
                    <TableHead className="text-left px-3 sm:px-5 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">Name</TableHead>
                    <TableHead className="text-right px-3 sm:px-5 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">Score</TableHead>
                    <TableHead className="text-right px-3 sm:px-5 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">%</TableHead>
                    <TableHead className="text-right px-3 sm:px-5 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wider hidden sm:table-cell">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-800/60">
                  {data.leaderboard.map(entry => {
                    const m = MEDAL_COLORS[entry.rank]
                    return (
                      <TableRow key={`leaderboard-rank-${entry.rank}-user-${entry.user_id}`} className={clsx(
                        'transition-colors',
                        entry.is_current_user ? 'bg-primary/5' : 'hover:bg-muted'
                      )} style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 53px' }}>
                        <TableCell className="px-3 sm:px-5 py-3.5">
                          <div className="flex items-center justify-center w-7 h-7">
                            {m ? m.icon : <span className="text-muted-foreground font-mono text-sm">#{entry.rank}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="px-3 sm:px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-semibold text-muted-foreground">{entry.full_name[0]?.toUpperCase()}</span>
                            </div>
                            <span className={clsx('font-medium', entry.is_current_user ? 'text-primary' : 'text-foreground')}>
                              {entry.full_name}
                              {entry.is_current_user && <span className="text-primary text-xs ml-1">(You)</span>}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-3 sm:px-5 py-3.5 text-right font-mono text-muted-foreground">
                          {entry.score}/{entry.total_marks}
                        </TableCell>
                        <TableCell className="px-3 sm:px-5 py-3.5 text-right">
                          <span className={clsx('font-semibold', entry.percentage >= 75 ? 'text-success-text' : entry.percentage >= 50 ? 'text-warning-text' : 'text-destructive')}>
                            {entry.percentage}%
                          </span>
                        </TableCell>
                        <TableCell className="px-3 sm:px-5 py-3.5 text-right text-muted-foreground text-xs hidden sm:table-cell">
                          {entry.submitted_at ? new Date(entry.submitted_at).toLocaleDateString('en-IN') : '-'}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Card>

            <p className="text-center text-muted-foreground text-xs">
              Only first attempts count toward rankings. Reattempts are for practice only.
            </p>
          </>
        )}
      </div>
    </Layout>
  )
}
