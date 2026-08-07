import clsx from 'clsx'
import { Card, CardContent } from '@/components/ui/card'

export function SkeletonBlock({ className = '' }) {
  return (
    <span
      className={clsx('block animate-pulse rounded bg-muted', className)}
      aria-hidden="true"
    />
  )
}

export function TestCardSkeleton() {
  return (
    <Card aria-hidden="true">
      <CardContent className="p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <SkeletonBlock className="h-5 w-2/3" />
          <SkeletonBlock className="h-5 w-12 rounded" />
        </div>
        <SkeletonBlock className="h-4 w-full" />
        <SkeletonBlock className="h-4 w-4/5" />
        <div className="flex items-center gap-4 mt-1">
          <SkeletonBlock className="h-3 w-14" />
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="h-3 w-16" />
        </div>
        <div className="pt-2 border-t theme-border mt-2">
          <SkeletonBlock className="h-9 w-full rounded-xl" />
        </div>
      </CardContent>
    </Card>
  )
}

export function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5 flex flex-col gap-2">
        <SkeletonBlock className="w-9 h-9 rounded-xl" />
        <SkeletonBlock className="h-8 w-14 mt-1" />
        <SkeletonBlock className="h-4 w-24" />
      </CardContent>
    </Card>
  )
}

export function LeaderboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Card className="border theme-border p-2.5 sm:p-4 flex flex-col items-center justify-end h-24 sm:h-28">
          <SkeletonBlock className="h-4 w-16 mb-2" />
          <SkeletonBlock className="h-3 w-10 mb-1" />
          <SkeletonBlock className="h-3 w-12" />
        </Card>
        <Card className="border theme-border p-2.5 sm:p-4 flex flex-col items-center justify-end h-28 sm:h-36">
          <SkeletonBlock className="h-4 w-20 mb-2" />
          <SkeletonBlock className="h-3 w-10 mb-1" />
          <SkeletonBlock className="h-3 w-12" />
        </Card>
        <Card className="border theme-border p-2.5 sm:p-4 flex flex-col items-center justify-end h-20 sm:h-24">
          <SkeletonBlock className="h-4 w-16 mb-2" />
          <SkeletonBlock className="h-3 w-10 mb-1" />
          <SkeletonBlock className="h-3 w-12" />
        </Card>
      </div>
      <Card className="overflow-hidden">
        <div className="flex flex-col">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 p-3.5 border-b theme-border last:border-0">
              <SkeletonBlock className="h-6 w-6 rounded-full" />
              <div className="flex-1 flex gap-3 items-center">
                <SkeletonBlock className="h-6 w-6 rounded-full flex-shrink-0" />
                <SkeletonBlock className="h-4 w-32" />
              </div>
              <SkeletonBlock className="h-4 w-12" />
              <SkeletonBlock className="h-4 w-10 hidden sm:block" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

export function ResultCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <SkeletonBlock className="w-12 h-12 rounded-xl flex-shrink-0" />
        <div className="flex-1 flex flex-col gap-2">
          <SkeletonBlock className="h-5 w-2/3 max-w-[250px]" />
          <SkeletonBlock className="h-3 w-40" />
        </div>
        <SkeletonBlock className="h-8 w-16 rounded flex-shrink-0" />
      </CardContent>
    </Card>
  )
}

export function ResultSkeleton() {
  return (
    <div className="flex flex-col gap-6 mt-4">
      <Card>
        <CardContent className="p-6 md:p-10 flex flex-col items-center text-center">
          <SkeletonBlock className="w-32 h-32 rounded-full mb-4" />
          <SkeletonBlock className="h-8 w-40 mb-2" />
          <SkeletonBlock className="h-4 w-32 mb-6" />
          
          <div className="w-full max-w-sm grid grid-cols-3 gap-2">
            {[1,2,3].map(i => (
              <div key={i} className="flex flex-col items-center gap-2 p-3 border rounded-xl theme-border">
                <SkeletonBlock className="h-6 w-10" />
                <SkeletonBlock className="h-3 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <div className="grid sm:grid-cols-2 gap-4">
        {[1,2].map(i => (
          <Card key={i}>
            <CardContent className="p-5">
              <SkeletonBlock className="h-5 w-32 mb-4" />
              <SkeletonBlock className="h-10 w-full mb-2 rounded-xl" />
              <SkeletonBlock className="h-10 w-full rounded-xl" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
