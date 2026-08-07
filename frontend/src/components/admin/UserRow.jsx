import { memo } from 'react'
import KeyRound from 'lucide-react/dist/esm/icons/key-round'
import UserX from 'lucide-react/dist/esm/icons/user-x'
import UserCheck from 'lucide-react/dist/esm/icons/user-check'
import Spinner from '../shared/Spinner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TableRow, TableCell } from '@/components/ui/table'
import { ROLE_STYLE, ROLE_ACTION_STYLE, USER_STATUS_STYLE } from './roleStyles'

export default memo(function UserRow({ user: u, updating, onChangeRole, onToggleStatus, onCreateResetLink }) {
  return (
    <TableRow className="hover:bg-muted">
      <TableCell className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-primary text-xs font-semibold">{u.full_name[0]?.toUpperCase()}</span>
          </div>
          <span className="font-medium text-foreground">{u.full_name}</span>
        </div>
      </TableCell>
      <TableCell className="px-5 py-4 text-muted-foreground">{u.email}</TableCell>
      <TableCell className="px-5 py-4">
        <Badge variant="outline" className={ROLE_STYLE[u.role]}>{u.role}</Badge>
      </TableCell>
      <TableCell className="px-5 py-4">
        <Badge variant="outline" className={u.is_active ? USER_STATUS_STYLE.active : USER_STATUS_STYLE.inactive}>
          {u.is_active ? 'Active' : 'Disabled'}
        </Badge>
      </TableCell>
      <TableCell className="px-5 py-4 text-muted-foreground">
        {new Date(u.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
      </TableCell>
      <TableCell className="px-5 py-4">
        <div className="flex items-center gap-2">
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
      </TableCell>
    </TableRow>
  )
})
