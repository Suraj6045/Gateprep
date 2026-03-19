import { useEffect, useState } from 'react'
import Layout from '../components/shared/Layout'
import { adminAPI } from '../api/api'
import toast from 'react-hot-toast'
import { Users, Search, ShieldCheck, UserX, UserCheck, RefreshCw } from 'lucide-react'
import Spinner from '../components/shared/Spinner'
import clsx from 'clsx'

const ROLES = ['admin', 'aspirant', 'user']
const roleStyle = { admin: 'badge-blue', aspirant: 'badge-green', user: 'badge-amber' }

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [updating, setUpdating] = useState({})

  const load = () => {
    setLoading(true)
    adminAPI.getUsers().then(r => setUsers(r.data)).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const changeRole = async (userId, role) => {
    setUpdating(u => ({ ...u, [userId]: true }))
    try {
      await adminAPI.updateRole(userId, role)
      setUsers(us => us.map(u => u.id === userId ? { ...u, role } : u))
      toast.success(`Role updated to ${role}`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally {
      setUpdating(u => ({ ...u, [userId]: false }))
    }
  }

  const toggleStatus = async (userId) => {
    setUpdating(u => ({ ...u, [userId]: true }))
    try {
      await adminAPI.toggleStatus(userId)
      setUsers(us => us.map(u => u.id === userId ? { ...u, is_active: !u.is_active } : u))
      toast.success('Status updated')
    } catch {
      toast.error('Failed')
    } finally {
      setUpdating(u => ({ ...u, [userId]: false }))
    }
  }

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Users</h1>
            <p className="text-slate-400 mt-1">{users.length} registered · {users.filter(u=>u.role==='user').length} pending approval</p>
          </div>
          <button onClick={load} className="btn-ghost flex items-center gap-2">
            <RefreshCw size={15} /> Refresh
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="input pl-10"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner size={28} className="text-sky-500" /></div>
        ) : (
          <div className="gate-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  {['Name', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 text-slate-500 font-medium text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-sky-500/20 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-sky-400 text-xs font-semibold">{u.full_name[0]?.toUpperCase()}</span>
                        </div>
                        <span className="font-medium text-slate-200">{u.full_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-400">{u.email}</td>
                    <td className="px-5 py-4">
                      <span className={`badge ${roleStyle[u.role] || 'badge-slate'}`}>{u.role}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`badge ${u.is_active ? 'badge-green' : 'badge-red'}`}>
                        {u.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      {new Date(u.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {updating[u.id] ? <Spinner size={14} className="text-sky-400" /> : (
                          <>
                            {u.role === 'user' && (
                              <button
                                onClick={() => changeRole(u.id, 'aspirant')}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium hover:bg-green-500/20 transition-colors"
                              >
                                <UserCheck size={13} /> Approve
                              </button>
                            )}
                            {u.role === 'aspirant' && (
                              <button
                                onClick={() => changeRole(u.id, 'user')}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition-colors"
                              >
                                <UserX size={13} /> Revoke
                              </button>
                            )}
                            {u.role !== 'admin' && (
                              <button
                                onClick={() => toggleStatus(u.id)}
                                className="px-3 py-1.5 rounded-lg bg-slate-700/50 border border-slate-600/50 text-slate-400 text-xs font-medium hover:bg-slate-700 transition-colors"
                              >
                                {u.is_active ? 'Disable' : 'Enable'}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-slate-500">No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}
