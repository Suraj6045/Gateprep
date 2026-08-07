import Layout from '../components/shared/Layout'
import useAdminUsers from '../hooks/useAdminUsers'
import UsersTableSkeleton from '../components/admin/UsersTableSkeleton'
import ResetLinkDialog from '../components/admin/ResetLinkDialog'
import UsersHeader from '../components/admin/UsersHeader'
import UsersSearchBar from '../components/admin/UsersSearchBar'
import DesktopUsersTable from '../components/admin/DesktopUsersTable'
import MobileUsersList from '../components/admin/MobileUsersList'

export default function AdminUsers() {
  const {
    pageIndex,
    users,
    loading,
    totalUsers,
    pendingUsers,
    searchInput,
    setSearchInput,
    updating,
    resetLink,
    setResetLink,
    reload,
    changeRole,
    toggleStatus,
    createResetLink,
    copyResetLink,
    goToPreviousPage,
    goToNextPage,
    showingFrom,
    showingTo,
    hasPagination,
    hasMore,
  } = useAdminUsers()

  return (
    <Layout>
      <div className="flex flex-col gap-6 animate-fade-in">
        <UsersHeader totalUsers={totalUsers} pendingUsers={pendingUsers} reload={reload} />
        
        <UsersSearchBar searchInput={searchInput} setSearchInput={setSearchInput} />

        {loading ? (
          <UsersTableSkeleton />
        ) : (
          <>
            <DesktopUsersTable
              users={users}
              updating={updating}
              changeRole={changeRole}
              toggleStatus={toggleStatus}
              createResetLink={createResetLink}
              pageIndex={pageIndex}
              showingFrom={showingFrom}
              showingTo={showingTo}
              totalUsers={totalUsers}
              hasPagination={hasPagination}
              hasMore={hasMore}
              goToPreviousPage={goToPreviousPage}
              goToNextPage={goToNextPage}
            />

            <MobileUsersList
              users={users}
              updating={updating}
              changeRole={changeRole}
              toggleStatus={toggleStatus}
              createResetLink={createResetLink}
              pageIndex={pageIndex}
              showingFrom={showingFrom}
              showingTo={showingTo}
              totalUsers={totalUsers}
              hasPagination={hasPagination}
              hasMore={hasMore}
              goToPreviousPage={goToPreviousPage}
              goToNextPage={goToNextPage}
            />
          </>
        )}

        <ResetLinkDialog
          resetLink={resetLink}
          onClose={() => setResetLink(null)}
          onCopy={copyResetLink}
        />
      </div>
    </Layout>
  )
}
