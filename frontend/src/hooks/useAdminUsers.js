import { useCallback, useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import toast from 'react-hot-toast'
import { adminAPI, fetcher } from '../api/api'

export default function useAdminUsers() {
  const [pageIndex, setPageIndex] = useState(0)
  const [pageCursors, setPageCursors] = useState([null])
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [updating, setUpdating] = useState({})
  const [resetLink, setResetLink] = useState(null)

  const limit = 50

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput.trim())
      setPageIndex(0)
      setPageCursors([null])
    }, 300)

    return () => clearTimeout(timer)
  }, [searchInput])

  const currentCursor = pageCursors[pageIndex]
  const params = new URLSearchParams({ limit: String(limit) })

  if (currentCursor) params.set('cursor', currentCursor)
  if (searchQuery) params.set('q', searchQuery)

  const { data: usersData, isLoading: loading, mutate } = useSWR(`/admin/users?${params.toString()}`, fetcher)
  const safeUsersData = usersData || {}
  const users = usersData?.items || []
  const usersById = useMemo(() => new Map(users.map(user => [user.id, user])), [users])
  const totalUsers = usersData?.total || 0
  const pendingUsers = usersData?.pending_count || 0
  const aspirantsCount = usersData?.aspirants_count || 0
  const hasPagination = totalUsers > limit
  const hasMore = usersData?.has_more ?? false
  const showingFrom = totalUsers === 0 ? 0 : pageIndex * limit + 1
  const showingTo = Math.min(pageIndex * limit + users.length, totalUsers)

  const reload = useCallback(() => mutate(), [mutate])

  const changeRole = useCallback(async (userId, role) => {
    const oldRole = usersById.get(userId)?.role
    setUpdating(u => ({ ...u, [userId]: true }))
    try {
      await adminAPI.updateRole(userId, role)

      let newPending = pendingUsers
      let newAspirants = aspirantsCount
      if (oldRole === 'user' && role === 'aspirant') {
        newPending--
        newAspirants++
      }
      if (oldRole === 'aspirant' && role === 'user') {
        newPending++
        newAspirants--
      }

      mutate({
        ...safeUsersData,
        items: users.map(u => (u.id === userId ? { ...u, role } : u)),
        pending_count: newPending,
        aspirants_count: newAspirants,
      }, false)
      toast.success(`Role updated to ${role}`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally {
      setUpdating(u => ({ ...u, [userId]: false }))
    }
  }, [usersById, pendingUsers, aspirantsCount, usersData, users, mutate])

  const toggleStatus = useCallback(async (userId) => {
    setUpdating(u => ({ ...u, [userId]: true }))
    try {
      await adminAPI.toggleStatus(userId)
      mutate({ ...safeUsersData, items: users.map(u => (u.id === userId ? { ...u, is_active: !u.is_active } : u)) }, false)
      toast.success('Status updated')
    } catch {
      toast.error('Failed')
    } finally {
      setUpdating(u => ({ ...u, [userId]: false }))
    }
  }, [usersData, users, mutate])

  const createResetLink = useCallback(async (userId) => {
    const key = `reset-${userId}`
    setUpdating(u => ({ ...u, [key]: true }))
    try {
      const res = await adminAPI.createPasswordReset(userId)
      setResetLink(res.data)
      toast.success('Reset link created')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create reset link')
    } finally {
      setUpdating(u => ({ ...u, [key]: false }))
    }
  }, [])

  const copyResetLink = useCallback(async () => {
    if (!resetLink?.reset_url) return

    try {
      await navigator.clipboard.writeText(resetLink.reset_url)
      toast.success('Reset link copied')
    } catch {
      toast.error('Could not copy link')
    }
  }, [resetLink])

  const goToPreviousPage = useCallback(() => setPageIndex(i => Math.max(0, i - 1)), [])
  const goToNextPage = useCallback(() => {
    if (!usersData?.next_cursor) return

    setPageCursors(cursors => [
      ...cursors.slice(0, pageIndex + 1),
      usersData.next_cursor,
    ])
    setPageIndex(i => i + 1)
  }, [usersData?.next_cursor, pageIndex])

  return {
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
  }
}
