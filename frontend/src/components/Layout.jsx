import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';
import NotificationBell from './NotificationBell';
import ConfirmModal from './ConfirmModal';
import { Home, Building2, LayoutDashboard, LogOut, CodeSquare, CheckCircle2, Users, Sun, Moon } from 'lucide-react';

const navClass = ({ isActive }) =>
  isActive ? 'nav-link nav-link-active' : 'nav-link';

function getUserStatusLabel(user) {
  if (!user) {
    return '';
  }

  if (user.role === 'agent') {
    const approvalStatus = user.agent_profile?.approval_status;

    if (approvalStatus === 'approved') {
      return 'agent approved';
    }

    if (approvalStatus === 'suspended') {
      return 'agent suspended';
    }

    return 'agent pending review';
  }

  if (user.role === 'admin') {
    return 'admin';
  }

  return user.email_verified_at ? user.role : 'email verification pending';
}

export default function Layout() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { popup } = useNotifications();
  const { theme, toggleTheme } = useTheme();
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    setLoggingOut(false);
    setShowLogoutConfirm(false);
    navigate('/');
  };

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <header className="topbar">
        <div>
          <p className="eyebrow">Real Estate Command</p>
          <NavLink className="brand" to="/" aria-label="EstateFlow Home">
            <CodeSquare size={24} aria-hidden="true" />
            EstateFlow
          </NavLink>
        </div>
        <nav className="nav-links" aria-label="Main Navigation">
          <NavLink className={navClass} to="/">
            <Home size={18} aria-hidden="true" />
            <span>Home</span>
          </NavLink>
          <NavLink className={navClass} to="/properties">
            <Building2 size={18} aria-hidden="true" />
            <span>Properties</span>
          </NavLink>
          <NavLink className={navClass} to="/agents">
            <Users size={18} aria-hidden="true" />
            <span>Agents</span>
          </NavLink>
          {user ? (
            <NavLink className={navClass} to="/dashboard">
              <LayoutDashboard size={18} aria-hidden="true" />
              <span>Dashboard</span>
            </NavLink>
          ) : null}
        </nav>
        <div className="topbar-actions">
          <button 
            className="icon-button" 
            onClick={toggleTheme} 
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {user ? <NotificationBell /> : null}
          {user ? (
            <>
              <div className="user-chip">
                <span>{user.full_name}</span>
                <small>{getUserStatusLabel(user)}</small>
              </div>
              <button className="ghost-button" disabled={loggingOut} onClick={() => setShowLogoutConfirm(true)} title="Sign Out" aria-label="Sign out of your account">
                <LogOut size={18} aria-hidden="true" />
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
        <div className="notification-popup" role="status" aria-live="polite">
          <CheckCircle2 className="notification-popup-icon" size={24} aria-hidden="true" />
          <div className="notification-popup-content">
            <strong>{popup.title}</strong>
            <p>{popup.message}</p>
          </div>
        </div>
      ) : null}

      <main id="main-content" className="page-shell">
        <Outlet />
      </main>

      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="End Your Session"
        message="You are about to sign out of the EstateFlow portal. Any unsaved changes will be lost."
        confirmText={loggingOut ? 'Signing out...' : 'Sign Out'}
        tone="warning"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
}
