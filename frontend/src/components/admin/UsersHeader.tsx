import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import type { ReactElement } from 'react'

export interface UsersHeaderProps {
  totalUsers: number
  pendingUsers: number
  reload: () => void
}

export default function UsersHeader({ totalUsers, pendingUsers, reload }: UsersHeaderProps): ReactElement {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Users</h1>
      </div>
      <Button variant="ghost" size="sm" onClick={reload}>
        <RefreshCw size={15} /> Refresh
      </Button>
    </div>
  )
}
