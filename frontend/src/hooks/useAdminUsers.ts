import { useCallback, useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import toast from 'react-hot-toast'
import axios from 'axios'
import { adminAPI, fetcher } from '../api/api'
import type { Dispatch, SetStateAction } from 'react'
import type { AdminRole, AdminUser, AdminUsersResponse, PasswordResetResponse } from '@/types/api'

export interface AdminUsersResult {
  pageIndex: number
  users: AdminUser[]
  loading: boolean
  totalUsers: number
  pendingUsers: number
  searchInput: string
  setSearchInput: Dispatch<SetStateAction<string>>
  updating: Record<string | number, boolean>
  resetLink: PasswordResetResponse | null
  setResetLink: Dispatch<SetStateAction<PasswordResetResponse | null>>
  reload: () => Promise<AdminUsersResponse | undefined>
  changeRole: (userId: number, role: AdminRole) => Promise<void>
  toggleStatus: (userId: number) => Promise<void>
  createResetLink: (userId: number) => Promise<void>
  copyResetLink: () => Promise<void>
  goToPreviousPage: () => void
  goToNextPage: () => void
  showingFrom: number
  showingTo: number
  hasPagination: boolean
  hasMore: boolean
}
export default function useAdminUsers(): AdminUsersResult {
  const [pageIndex, setPageIndex] = useState(0)
  const [pageCursors, setPageCursors] = useState<(string | null)[]>([null])
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [updating, setUpdating] = useState<Record<string | number, boolean>>({})
  const [resetLink, setResetLink] = useState<PasswordResetResponse | null>(null)

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

  const { data: usersData, isLoading: loading, mutate } = useSWR<AdminUsersResponse>(`/admin/users?${params.toString()}`, fetcher)
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

  const changeRole = useCallback(async (userId: number, role: AdminRole) => {
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

      mutate((previous) => previous ? {
        ...previous,
        items: users.map(u => (u.id === userId ? { ...u, role } : u)),
        pending_count: newPending,
        aspirants_count: newAspirants,
      } : previous, false)
      toast.success(`Role updated to ${role}`)
    } catch (err) {
      toast.error(axios.isAxiosError(err) ? err.response?.data?.detail || 'Failed' : 'Failed')
    } finally {
      setUpdating(u => ({ ...u, [userId]: false }))
    }
  }, [usersById, pendingUsers, aspirantsCount, usersData, users, mutate])

  const toggleStatus = useCallback(async (userId: number) => {
    setUpdating(u => ({ ...u, [userId]: true }))
    try {
      await adminAPI.toggleStatus(userId)
      mutate((previous) => previous ? {
        ...previous,
        items: users.map(u => (u.id === userId ? { ...u, is_active: !u.is_active } : u)),
      } : previous, false)
      toast.success('Status updated')
    } catch {
      toast.error('Failed')
    } finally {
      setUpdating(u => ({ ...u, [userId]: false }))
    }
  }, [usersData, users, mutate])

  const createResetLink = useCallback(async (userId: number) => {
    const key = `reset-${userId}`
    setUpdating(u => ({ ...u, [key]: true }))
    try {
      const res = await adminAPI.createPasswordReset(userId)
      setResetLink(res.data)

      try {
        await navigator.clipboard.writeText(res.data.reset_url)
        toast.success('Reset link created & copied to clipboard')
      } catch {
        toast.success('Reset link created — copy it from the dialog')
      }
    } catch (err) {
      toast.error(axios.isAxiosError(err) ? err.response?.data?.detail || 'Failed to create reset link' : 'Failed to create reset link')
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
