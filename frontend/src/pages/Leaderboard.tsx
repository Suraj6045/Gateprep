import { useState } from 'react'
import type { ReactNode } from 'react'
import { useParams, Link } from 'react-router-dom'
import Layout from '../components/shared/Layout'
import { fetcher } from '../api/api'
import type { LeaderboardEntry, LeaderboardResponse } from '../types/api'
import useSWR from 'swr'
import { Trophy, ArrowLeft, Medal, Crown, RotateCcw } from 'lucide-react'
import clsx from 'clsx'
import { LeaderboardSkeleton } from '../components/shared/Skeletons'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table'

interface MedalColor {
  bg: string
  text: string
  icon: ReactNode
}

const MEDAL_COLORS: Partial<Record<number, MedalColor>> = {
  1: {
    bg: 'bg-amber-500/10 border-amber-500/30 dark:bg-amber-500/15 dark:border-amber-500/40',
    text: 'text-amber-600 dark:text-amber-400',
    icon: <Crown size={18} className="text-amber-500" />,
  },
  2: {
    bg: 'bg-slate-500/10 border-slate-400/30 dark:bg-slate-400/10 dark:border-slate-400/30',
    text: 'text-slate-600 dark:text-slate-300',
    icon: <Medal size={18} className="text-slate-400" />,
  },
  3: {
    bg: 'bg-amber-700/10 border-amber-700/30 dark:bg-amber-700/15 dark:border-amber-700/40',
    text: 'text-amber-700 dark:text-amber-500',
    icon: <Medal size={18} className="text-amber-700 dark:text-amber-500" />,
  },
}

const LEADERBOARD_PAGE_SIZE = 50

export function getPodiumOrder<T>(entries: T[] = []): T[] {
  if (entries.length < 3) {
    return [...entries]
  }

  return [entries[1], entries[0], entries[2]]
}

export function formatLeaderboardDate(value: string | null | undefined): string {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleDateString('en-IN')
}

export function getPercentageTone(percentage: number): string {
  if (percentage >= 75) return 'text-success-text'
  if (percentage >= 50) return 'text-warning-text'
  return 'text-destructive'
}

function LeaderboardLoadingState() {
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

function LeaderboardNotFoundState() {
  return (
    <Layout>
      <p className="text-muted-foreground text-center py-16">Leaderboard not found.</p>
    </Layout>
  )
}

export interface LeaderboardHeaderProps {
  testTitle: string
  totalParticipants: number
  currentUserRank: number | null
}

function LeaderboardHeader({ testTitle, totalParticipants, currentUserRank }: LeaderboardHeaderProps) {
  return (
    <div className="text-center">
      <div className="w-14 h-14 rounded-2xl bg-[var(--warning-text)]/10 border-[var(--warning-text)]/20 flex items-center justify-center mx-auto mb-4">
        <Trophy size={26} className="text-warning-text"/>
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{testTitle}</h1>
      <p className="text-muted-foreground mt-1">{totalParticipants} participant{totalParticipants !== 1 ? 's' : ''}</p>
      {currentUserRank && (
        <div className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full bg-primary/10 border border-brand-500/20">
          <span className="text-primary text-sm font-medium">Your rank: #{currentUserRank}</span>
        </div>
      )}
    </div>
  )
}

export interface PodiumCardProps {
  entry: LeaderboardEntry
}

function PodiumCard({ entry }: PodiumCardProps) {
  const medal: Partial<MedalColor> = MEDAL_COLORS[entry.rank] || {}
  const isWinner = entry.rank === 1

  return (
    <Card
      className={clsx(
        'border p-3 sm:p-4 flex flex-col items-center justify-between text-center transition-all',
        medal.bg,
        isWinner ? 'min-h-[190px] sm:min-h-[220px] shadow-sm sm:-translate-y-2' : 'min-h-[170px] sm:min-h-[195px]',
        entry.is_current_user && 'ring-2 ring-primary/60'
      )}
    >
      <div className="flex flex-col items-center gap-1.5 w-full">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background/80 shadow-xs">
          {medal.icon}
        </div>
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 font-semibold text-xs text-foreground">
          {entry.full_name?.[0]?.toUpperCase() || '—'}
        </div>
        <p className="font-bold text-xs sm:text-sm text-foreground truncate w-full px-1" title={entry.full_name}>
          {entry.full_name || '—'}
          {entry.is_current_user && <span className="text-primary text-xs ml-1 font-normal">(You)</span>}
        </p>
      </div>

      <div className="mt-2 w-full pt-2 border-t border-border/40 flex flex-col items-center gap-0.5">
        <span className="font-bold text-sm sm:text-base text-foreground font-mono">
          {entry.percentage != null ? `${entry.percentage}%` : '—'}
        </span>
        <span className="text-xs text-muted-foreground font-mono">
          {entry.score != null ? `${entry.score}/${entry.total_marks}` : '—'}
        </span>
        <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
          {formatLeaderboardDate(entry.submitted_at)}
        </span>
      </div>
    </Card>
  )
}

export interface LeaderboardPodiumProps {
  entries: LeaderboardEntry[]
}

function LeaderboardPodium({ entries }: LeaderboardPodiumProps) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end pt-3">
      {getPodiumOrder(entries).map((entry) => {
        if (!entry) return null
        return <PodiumCard key={`podium-${entry.rank}-user-${entry.user_id}`} entry={entry} />
      })}
    </div>
  )
}

export interface EmptyLeaderboardStateProps {
  testId: string | undefined
}

function EmptyLeaderboardState({ testId }: EmptyLeaderboardStateProps) {
  return (
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
  )
}

export interface LeaderboardTableProps {
  entries: LeaderboardEntry[]
}

function LeaderboardTable({ entries }: LeaderboardTableProps) {
  return (
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
        <TableBody>
          {entries.map((entry) => {
            const medal = MEDAL_COLORS[entry.rank]

            return (
              <TableRow
                key={`leaderboard-rank-${entry.rank}-user-${entry.user_id}`}
                className={clsx('theme-border transition-colors', entry.is_current_user ? 'bg-primary/5' : 'hover:bg-muted')}
                style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 53px' }}
              >
                <TableCell className="px-3 sm:px-5 py-3.5">
                  <div className="flex items-center justify-center w-7 h-7">
                    {medal ? medal.icon : <span className="text-muted-foreground font-mono text-sm">#{entry.rank}</span>}
                  </div>
                </TableCell>
                <TableCell className="px-3 sm:px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-muted-foreground">{entry.full_name?.[0]?.toUpperCase() || '—'}</span>
                    </div>
                    <span className={clsx('font-medium', entry.is_current_user ? 'text-primary' : 'text-foreground')}>
                      {entry.full_name || '—'}
                      {entry.is_current_user && <span className="text-primary text-xs ml-1">(You)</span>}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="px-3 sm:px-5 py-3.5 text-right font-mono text-muted-foreground">
                  {entry.score}/{entry.total_marks}
                </TableCell>
                <TableCell className="px-3 sm:px-5 py-3.5 text-right">
                  <span className={clsx('font-semibold', getPercentageTone(entry.percentage))}>
                    {entry.percentage}%
                  </span>
                </TableCell>
                <TableCell className="px-3 sm:px-5 py-3.5 text-right text-muted-foreground text-xs hidden sm:table-cell">
                  {formatLeaderboardDate(entry.submitted_at)}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Card>
  )
}

export default function LeaderboardPage() {
  const { testId } = useParams()
  const [pageState, setPageState] = useState(() => ({ testId, offset: 0 }))
  const offset = pageState.testId === testId ? pageState.offset : 0
  const leaderboardKey = `/tests/${testId}/leaderboard?limit=${LEADERBOARD_PAGE_SIZE}&offset=${offset}`
  const { data, isLoading: loading } = useSWR<LeaderboardResponse>(leaderboardKey, fetcher)

  if (loading) {
    return <LeaderboardLoadingState />
  }

  if (!data) {
    return <LeaderboardNotFoundState />
  }

  const hasEntries = data.leaderboard.length > 0

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

        <LeaderboardHeader
          testTitle={data.test_title}
          totalParticipants={data.total_participants}
          currentUserRank={data.current_user_rank}
        />

        {!hasEntries ? (
          <EmptyLeaderboardState testId={testId} />
        ) : (
          <>
            {offset === 0 && data.leaderboard.length >= 3 && (
              <LeaderboardPodium entries={data.leaderboard} />
            )}
            <LeaderboardTable entries={data.leaderboard} />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                {`Showing ${offset + 1}–${Math.min(
                  offset + data.leaderboard.length,
                  data.total_participants
                )} of ${data.total_participants}`}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset === 0}
                  onClick={() => setPageState({
                    testId,
                    offset: Math.max(0, offset - LEADERBOARD_PAGE_SIZE),
                  })}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset + data.leaderboard.length >= data.total_participants}
                  onClick={() => setPageState({
                    testId,
                    offset: offset + LEADERBOARD_PAGE_SIZE,
                  })}
                >
                  Next
                </Button>
              </div>
            </div>
            <p className="text-center text-muted-foreground text-xs">
              Only first attempts count toward rankings. Reattempts are for practice only.
            </p>
          </>
        )}
      </div>
    </Layout>
  )
}
