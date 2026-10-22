import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { FiBarChart2, FiBookOpen, FiClock, FiHome, FiLogOut, FiMenu, FiNavigation, FiPlayCircle, FiTarget, FiUser, FiX } from 'react-icons/fi'
import { useAuth } from '../context/authContext'
import { initials } from '../utils/format'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: FiHome },
  { to: '/interview/new', label: 'New Interview', icon: FiPlayCircle },
  { to: '/practice', label: 'Practice', icon: FiTarget },
  { to: '/history', label: 'History', icon: FiClock },
  { to: '/performance', label: 'Performance', icon: FiBarChart2 },
  { to: '/questions', label: 'Question Bank', icon: FiBookOpen },
  { to: '/profile', label: 'Profile', icon: FiUser },
]

export function Brand({ to = '/' }) {
  return (
    <NavLink to={to} className="brand" aria-label="CareerPilot home">
      <span className="brand-mark"><FiNavigation aria-hidden="true" /></span>
      CareerPilot
    </NavLink>
  )
}

export default function AppLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  // The drawer remembers which page it was opened on, so it closes by itself after navigating.
  const [openAt, setOpenAt] = useState(null)
  const open = openAt === location.pathname

  return (
    <div className="app-shell">
      <div className={`scrim ${open ? 'show' : ''}`} onClick={() => setOpenAt(null)} aria-hidden="true" />
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Main navigation">
        <Brand to="/dashboard" />
        <nav className="nav">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
              <Icon aria-hidden="true" /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          <span className="avatar-initials" aria-hidden="true">{initials(user && user.name)}</span>
          <div className="who">
            <strong>{user && user.name}</strong>
            <span>{user && user.email}</span>
          </div>
          <button type="button" className="btn btn-ghost btn-icon" onClick={() => logout('You have been logged out.')} aria-label="Log out" title="Log out">
            <FiLogOut />
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button type="button" className="btn btn-secondary btn-icon" onClick={() => setOpenAt(open ? null : location.pathname)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
            {open ? <FiX /> : <FiMenu />}
          </button>
          <Brand to="/dashboard" />
        </header>
        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
