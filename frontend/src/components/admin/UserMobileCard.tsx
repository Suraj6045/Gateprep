import { memo } from 'react'
import { KeyRound, UserX, UserCheck } from 'lucide-react'
import Spinner from '../shared/Spinner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ROLE_STYLE, ROLE_ACTION_STYLE, USER_STATUS_STYLE } from './roleStyles'
import type { ManagedAdminUser, AdminRole } from './roleStyles'
import type { ReactElement } from 'react'

export interface UserMobileCardProps {
  user: ManagedAdminUser
  updating: Record<string | number, boolean>
  onChangeRole: (id: number, role: AdminRole) => void
  onToggleStatus: (id: number) => void
  onCreateResetLink: (id: number) => void
}

export default memo(function UserMobileCard({ user: u, updating, onChangeRole, onToggleStatus, onCreateResetLink }: UserMobileCardProps): ReactElement {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1.5 py-2 px-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-primary text-sm font-semibold">{u.full_name[0]?.toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-foreground truncate">{u.full_name}</p>
            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={ROLE_STYLE[u.role]}>{u.role}</Badge>
          <Badge variant="outline" className={u.is_active ? USER_STATUS_STYLE.active : USER_STATUS_STYLE.inactive}>
            {u.is_active ? 'Active' : 'Disabled'}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Joined {new Date(u.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t theme-border">
          {updating[u.id] ? <Spinner size={14} className="text-primary" /> : (
            <>
              {u.role === 'user' && (
                <Button size="xs" variant="ghost"
                  className={ROLE_ACTION_STYLE.makeAspirant}
                  onClick={() => onChangeRole(u.id, 'aspirant')}>
                  <UserCheck size={13} /> Approve
                </Button>
              )}
              {u.role === 'aspirant' && (
                <Button size="xs" variant="ghost"
                  className={ROLE_ACTION_STYLE.makeUser}
                  onClick={() => onChangeRole(u.id, 'user')}>
                  <UserX size={13} /> Revoke
                </Button>
              )}
              {u.role !== 'admin' && (
                <Button size="xs" variant="ghost"
                  className={ROLE_ACTION_STYLE.removeRole}
                  onClick={() => onToggleStatus(u.id)}>
                  {u.is_active ? 'Disable' : 'Enable'}
                </Button>
              )}
              <Button size="xs" variant="ghost"
                className={ROLE_ACTION_STYLE.makeAdmin}
                disabled={updating[`reset-${u.id}`]}
                onClick={() => onCreateResetLink(u.id)}>
                {updating[`reset-${u.id}`] ? <Spinner size={13} /> : <KeyRound size={13} />} Reset
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
})
