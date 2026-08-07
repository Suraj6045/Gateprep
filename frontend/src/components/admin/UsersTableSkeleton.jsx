import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function UsersTableSkeleton() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center gap-4 border-b theme-border pb-4 last:border-0 last:pb-0">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex flex-col flex-1 gap-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full hidden sm:block" />
            <Skeleton className="h-5 w-24 rounded-full hidden sm:block" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
