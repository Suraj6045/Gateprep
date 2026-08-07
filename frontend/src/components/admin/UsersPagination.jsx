import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function UsersPagination({
  pageIndex,
  showingFrom,
  showingTo,
  totalUsers,
  hasPagination,
  hasMore,
  onPrev,
  onNext,
  mobile = false,
}) {
  if (!hasPagination) return null

  const controls = (
    <>
      <Button variant="ghost" size="sm" onClick={onPrev} disabled={pageIndex === 0}>Previous</Button>
      <span className="text-sm text-muted-foreground">Showing {showingFrom} – {showingTo} of {totalUsers}</span>
      <Button variant="ghost" size="sm" onClick={onNext} disabled={!hasMore}>Next</Button>
    </>
  )

  if (mobile) {
    return (
      <Card>
        <CardContent className="flex justify-between items-center gap-3 p-3">
          {controls}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex justify-between items-center px-5 py-4 border-t theme-border">
      {controls}
    </div>
  )
}
