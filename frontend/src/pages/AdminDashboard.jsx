import { Link } from 'react-router-dom'
import Layout from '../components/shared/Layout'
import useSWR from 'swr'
import { fetcher } from '../api/api'
import Users from 'lucide-react/dist/esm/icons/users'
import FlaskConical from 'lucide-react/dist/esm/icons/flask-conical'
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle'
import Clock from 'lucide-react/dist/esm/icons/clock'
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right'
import Spinner from '../components/shared/Spinner'
import { StatCardSkeleton } from '../components/shared/Skeletons'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BADGE_COLORS } from '@/utils/badgeStyles'

export default function AdminDashboard() {
  const { data: usersData, isLoading: usersLoading } = useSWR('/admin/users?limit=1', fetcher)
  const { data: pendingUsersData, isLoading: pendingUsersLoading } = useSWR('/admin/users?role=user&limit=3', fetcher)
  const { data: testsData, isLoading: testsLoading } = useSWR('/admin/tests', fetcher)
  
  const pendingUsers = pendingUsersData?.items || []
  const tests = testsData || []

  const aspirants = usersData?.aspirants_count || 0
  const pending   = usersData?.pending_count || 0
  const totalUsers = usersData?.total || 0
  const totalQ    = tests.reduce((s, t) => s + (t.question_count || 0), 0)

  const stats = [
    { label: 'Total Users',      value: totalUsers,  icon: Users,        color: 'text-primary',    bg: 'var(--bg-panel)'  },
    { label: 'Aspirants',        value: aspirants,      icon: CheckCircle,  color: 'text-success-text',  bg: 'color-mix(in srgb, var(--success-text) 10%, transparent)'  },
    { label: 'Pending Approval', value: pending,        icon: Clock,        color: 'text-warning-text',  bg: 'color-mix(in srgb, var(--warning-text) 10%, transparent)'  },
    { label: 'Total Tests',      value: tests.length,   icon: FlaskConical, color: 'text-[var(--marked-text)]', bg: 'color-mix(in srgb, var(--marked-text) 10%, transparent)'  },
  ]

  return (
    <Layout>
      <div className="flex flex-col gap-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Admin Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Platform overview</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {usersLoading || testsLoading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            stats.map(({ label, value, icon: Icon, color, bg }) => (
              <Card key={label}>
                <CardContent className="p-5 flex flex-col gap-2">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: bg }}>
                    <Icon size={18} className={color} />
                  </div>
                  <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{value}</p>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-5">
              <h2 className="font-semibold mb-1 text-lg" style={{ color: 'var(--text)' }}>Pending Approvals</h2>
              {usersLoading || pendingUsersLoading ? (
                <div className="py-8 flex justify-center"><Spinner /></div>
              ) : (
                <>
                  <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                    {pending} user{pending !== 1 ? 's' : ''} waiting
                  </p>
                  {pending > 0 ? (
                    <div className="flex flex-col gap-2 mb-4">
                      {pendingUsers.map(u => (
                        <div key={u.id} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                          <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{u.full_name}</p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{u.email}</p>
                          </div>
                          <Badge variant="outline" className={BADGE_COLORS.amber}>Pending</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-success-text text-sm mb-4">✓ All users approved</p>
                  )}
                  <Link to="/admin/users" className="flex items-center gap-1.5 text-primary hover:text-primary text-sm font-medium">
                    Manage Users <ArrowRight size={14} />
                  </Link>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h2 className="font-semibold mb-1 text-lg" style={{ color: 'var(--text)' }}>Recent Tests</h2>
              {testsLoading ? (
                <div className="py-8 flex justify-center"><Spinner /></div>
              ) : (
                <>
                  <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                    {tests.length} test{tests.length !== 1 ? 's' : ''} · {totalQ} questions total
                  </p>
                  {tests.length > 0 ? (
                    <div className="flex flex-col gap-2 mb-4">
                      {tests.slice(0, 3).map(t => (
                        <div key={t.id} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                          <p className="text-sm font-medium truncate max-w-[60%]" style={{ color: 'var(--text)' }}>{t.title}</p>
                          <Badge variant="outline" className={BADGE_COLORS.sky}>{t.question_count} Qs</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>No tests yet.</p>
                  )}
                  <Link to="/admin/tests" className="flex items-center gap-1.5 text-primary hover:text-primary text-sm font-medium">
                    Manage Tests <ArrowRight size={14} />
                  </Link>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  )
}
