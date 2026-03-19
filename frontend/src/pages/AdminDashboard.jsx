import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/shared/Layout'
import { adminAPI } from '../api/api'
import { Users, FlaskConical, CheckCircle, Clock, ArrowRight } from 'lucide-react'
import Spinner from '../components/shared/Spinner'

export default function AdminDashboard() {
  const [users, setUsers] = useState([])
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([adminAPI.getUsers(), adminAPI.getTests()])
      .then(([u, t]) => { setUsers(u.data); setTests(t.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const aspirants = users.filter(u => u.role === 'aspirant').length
  const pending   = users.filter(u => u.role === 'user').length
  const totalQ    = tests.reduce((s, t) => s + (t.question_count || 0), 0)

  const stats = [
    { label: 'Total Users',      value: users.length,  icon: Users,        color: 'text-sky-400',    bg: 'rgba(14,165,233,0.1)'  },
    { label: 'Aspirants',        value: aspirants,      icon: CheckCircle,  color: 'text-green-400',  bg: 'rgba(81,207,102,0.1)'  },
    { label: 'Pending Approval', value: pending,        icon: Clock,        color: 'text-amber-400',  bg: 'rgba(245,158,11,0.1)'  },
    { label: 'Total Tests',      value: tests.length,   icon: FlaskConical, color: 'text-purple-400', bg: 'rgba(168,85,247,0.1)'  },
  ]

  if (loading) return (
    <Layout><div className="flex justify-center py-20"><Spinner size={32} className="text-sky-500" /></div></Layout>
  )

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Admin Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Platform overview</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="gate-card p-5 flex flex-col gap-2">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: bg }}>
                <Icon size={18} className={color} />
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{value}</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="gate-card p-5">
            <h3 className="font-semibold mb-1" style={{ color: 'var(--text)' }}>Pending Approvals</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              {pending} user{pending !== 1 ? 's' : ''} waiting
            </p>
            {pending > 0 ? (
              <div className="space-y-2 mb-4">
                {users.filter(u => u.role === 'user').slice(0, 3).map(u => (
                  <div key={u.id} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{u.full_name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{u.email}</p>
                    </div>
                    <span className="badge badge-amber">Pending</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-green-400 text-sm mb-4">✓ All users approved</p>
            )}
            <Link to="/admin/users" className="flex items-center gap-1.5 text-sky-400 hover:text-sky-300 text-sm font-medium">
              Manage Users <ArrowRight size={14} />
            </Link>
          </div>

          <div className="gate-card p-5">
            <h3 className="font-semibold mb-1" style={{ color: 'var(--text)' }}>Recent Tests</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              {tests.length} test{tests.length !== 1 ? 's' : ''} · {totalQ} questions total
            </p>
            {tests.length > 0 ? (
              <div className="space-y-2 mb-4">
                {tests.slice(0, 3).map(t => (
                  <div key={t.id} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-sm font-medium truncate max-w-[60%]" style={{ color: 'var(--text)' }}>{t.title}</p>
                    <span className="badge badge-blue">{t.question_count} Qs</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>No tests yet.</p>
            )}
            <Link to="/admin/tests" className="flex items-center gap-1.5 text-sky-400 hover:text-sky-300 text-sm font-medium">
              Manage Tests <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  )
}
