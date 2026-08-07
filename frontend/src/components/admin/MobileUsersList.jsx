import UserMobileCard from './UserMobileCard'
import UsersPagination from './UsersPagination'

export default function MobileUsersList({
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
    <div className="flex flex-col gap-3 md:hidden">
      {users.map(u => (
        <UserMobileCard
          key={u.id}
          user={u}
          updating={updating}
          onChangeRole={changeRole}
          onToggleStatus={toggleStatus}
          onCreateResetLink={createResetLink}
        />
      ))}
      {users.length === 0 && (
        <p className="text-center py-12 text-muted-foreground">No users found</p>
      )}
      <UsersPagination
        mobile
        pageIndex={pageIndex}
        showingFrom={showingFrom}
        showingTo={showingTo}
        totalUsers={totalUsers}
        hasPagination={hasPagination}
        hasMore={hasMore}
        onPrev={goToPreviousPage}
        onNext={goToNextPage}
      />
    </div>
  )
}
