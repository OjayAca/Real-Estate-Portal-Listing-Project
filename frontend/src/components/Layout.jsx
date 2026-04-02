import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import NotificationBell from './NotificationBell';
import { Home, Building2, LayoutDashboard, LogOut, CodeSquare, CheckCircle2 } from 'lucide-react';

const navClass = ({ isActive }) =>
  isActive ? 'nav-link nav-link-active' : 'nav-link';

export default function Layout() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { popup } = useNotifications();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    setLoggingOut(false);
    navigate('/');
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Real Estate Command</p>
          <NavLink className="brand" to="/">
            <CodeSquare size={24} />
            EstateFlow
          </NavLink>
        </div>
        <nav className="nav-links">
          <NavLink className={navClass} to="/">
            <Home size={18} />
            <span>Home</span>
          </NavLink>
          <NavLink className={navClass} to="/properties">
            <Building2 size={18} />
            <span>Properties</span>
          </NavLink>
          {user ? (
            <NavLink className={navClass} to="/dashboard">
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </NavLink>
          ) : null}
        </nav>
        <div className="topbar-actions">
          {user ? <NotificationBell /> : null}
          {user ? (
            <>
              <div className="user-chip">
                <span>{user.full_name}</span>
                <small>{user.role}</small>
              </div>
              <button className="ghost-button" disabled={loggingOut} onClick={handleLogout} title="Sign Out">
                <LogOut size={18} />
                <span>{loggingOut ? 'Signing out...' : 'Sign out'}</span>
              </button>
            </>
          ) : (
            <>
              <NavLink className="ghost-button" to="/login">
                Log in
              </NavLink>
              <NavLink className="primary-button" to="/register">
                Create account
              </NavLink>
            </>
          )}
        </div>
      </header>

      {popup ? (
        <div className="notification-popup" role="status">
          <CheckCircle2 className="notification-popup-icon" size={24} />
          <div className="notification-popup-content">
            <strong>{popup.title}</strong>
            <p>{popup.message}</p>
          </div>
        </div>
      ) : null}

      <main className="page-shell">
        <Outlet />
      </main>
    </div>
  );
}
