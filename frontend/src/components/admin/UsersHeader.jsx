import { Button } from '@/components/ui/button'
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw'

export default function UsersHeader({ totalUsers, pendingUsers, reload }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Users</h1>
        <p className="text-muted-foreground mt-1">
          {totalUsers} registered · {pendingUsers} pending approval
        </p>
      </div>
      <Button variant="ghost" size="sm" onClick={reload}>
        <RefreshCw size={15} /> Refresh
      </Button>
    </div>
  )
}
