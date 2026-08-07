import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import LogOut from 'lucide-react/dist/esm/icons/log-out'
import Sun from 'lucide-react/dist/esm/icons/sun'
import Moon from 'lucide-react/dist/esm/icons/moon'
import LayoutDashboard from 'lucide-react/dist/esm/icons/layout-dashboard'
import FlaskConical from 'lucide-react/dist/esm/icons/flask-conical'
import Users from 'lucide-react/dist/esm/icons/users'
import BookOpen from 'lucide-react/dist/esm/icons/book-open'
import ClipboardList from 'lucide-react/dist/esm/icons/clipboard-list'
import Bookmark from 'lucide-react/dist/esm/icons/bookmark'
import clsx from 'clsx'

export default function Navbar() {
  const { user, logout, loading } = useAuth()
  const { theme, toggle } = useTheme()
  const location = useLocation()
  const isAdmin = user?.role === 'admin'

  const adminLinks = [
    { to: '/admin',           label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/tests',     label: 'Tests',     icon: FlaskConical },
    { to: '/admin/users',     label: 'Users',     icon: Users },
  ]

  const aspirantLinks = [
    { to: '/dashboard',  label: 'Dashboard', icon: LayoutDashboard },
    { to: '/tests',      label: 'Tests',     icon: BookOpen },
    { to: '/results',    label: 'Results',   icon: ClipboardList },
    { to: '/bookmarks',  label: 'Bookmarks', icon: Bookmark },
  ]

  const links = isAdmin ? adminLinks : aspirantLinks

  const isActive = (to) =>
    location.pathname === to || (to !== '/admin' && to !== '/dashboard' && location.pathname.startsWith(to))

  return (
    <>
      {/* ── Desktop/Tablet Top Bar ────────────────────────────────── */}
      <nav aria-label="Main Navigation" className="app-header fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-3 sm:px-4 gap-2 sm:gap-4 border-b bg-background/80 border-border backdrop-blur-md">
        <Link to={isAdmin ? '/admin' : '/dashboard'} className="flex items-center gap-2 mr-2 sm:mr-4 flex-shrink-0">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center text-primary-foreground">
            <span className="font-bold text-sm">G</span>
          </div>
          <span className="font-bold text-foreground text-sm">GATEPrep</span>
        </Link>

        {/* Desktop nav links — hidden on mobile (shown in bottom nav instead) */}
        <div className="hidden sm:flex items-center gap-0.5 flex-1 overflow-x-auto">
          {!loading && links.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} aria-current={isActive(to) ? 'page' : undefined} className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors',
              isActive(to)
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}>
              <Icon size={16} /> <span>{label}</span>
            </Link>
          ))}
        </div>

        {/* Mobile spacer */}
        <div className="flex-1 sm:hidden" />

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <button onClick={toggle}
            title="Toggle theme"
            aria-label="Toggle theme"
            className="p-2 sm:p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          {loading ? (
            <div className="hidden sm:flex flex-col gap-1.5 items-end mx-1">
              <div className="h-3 w-20 bg-muted rounded animate-pulse" aria-hidden="true" />
              <div className="h-2 w-14 bg-muted rounded animate-pulse" aria-hidden="true" />
            </div>
          ) : (
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium text-foreground leading-none">{user?.full_name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
          )}
          <button onClick={logout}
            title="Log out"
            aria-label="Log out"
            className="p-2 sm:p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
            <LogOut size={14} />
          </button>
        </div>
      </nav>

      {/* ── Mobile Bottom Navigation ──────────────────────────────── */}
      <nav aria-label="Mobile Navigation" className="mobile-bottom-nav sm:hidden flex items-center justify-around px-2 bg-background/80 border-border backdrop-blur-md">
        {!loading && links.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            aria-current={isActive(to) ? 'page' : undefined}
            className={clsx(
              'flex flex-col items-center justify-center gap-1 py-2 px-3 min-w-[64px] rounded-2xl transition-all duration-200',
              isActive(to)
                ? 'bg-primary/15 text-primary scale-105'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            <Icon size={22} strokeWidth={isActive(to) ? 2.5 : 1.8} />
            <span className="text-[10px] font-medium leading-none">{label}</span>
          </Link>
        ))}
      </nav>
    </>
  )
}
