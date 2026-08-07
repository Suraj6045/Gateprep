import { Card } from '@/components/ui/card'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table'
import UserRow from './UserRow'
import UsersPagination from './UsersPagination'

const TABLE_HEADERS = ['Name', 'Email', 'Role', 'Status', 'Joined', 'Actions']

export default function DesktopUsersTable({
  users,
  updating,
  changeRole,
  toggleStatus,
  createResetLink,
  pageIndex,
  showingFrom,
  showingTo,
  totalUsers,
  hasPagination,
  hasMore,
  goToPreviousPage,
  goToNextPage,
}) {
  return (
    <Card className="overflow-hidden hidden md:block">
      <Table>
        <TableHeader>
          <TableRow className="border-b theme-border hover:bg-transparent">
            {TABLE_HEADERS.map(h => (
              <TableHead key={h} className="px-5 py-3.5 text-xs uppercase tracking-wider font-medium text-muted-foreground">{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map(u => (
            <UserRow
              key={u.id}
              user={u}
              updating={updating}
              onChangeRole={changeRole}
              onToggleStatus={toggleStatus}
              onCreateResetLink={createResetLink}
            />
          ))}
          {users.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No users found</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <UsersPagination
        pageIndex={pageIndex}
        showingFrom={showingFrom}
        showingTo={showingTo}
        totalUsers={totalUsers}
        hasPagination={hasPagination}
        hasMore={hasMore}
        onPrev={goToPreviousPage}
        onNext={goToNextPage}
      />
    </Card>
  )
}
