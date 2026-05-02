import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import NotificationBell from './NotificationBell';
import ConfirmModal from './ConfirmModal';
import UserDropdown from './UserDropdown';
import { CodeSquare, CheckCircle2, Heart, Menu, X } from 'lucide-react';

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

  return 'buyer';
}

export default function Layout() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { popup } = useNotifications();
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    setLoggingOut(false);
    setShowLogoutConfirm(false);
    setIsMenuOpen(false);
    navigate('/');
  };

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <header className={`topbar ${isMenuOpen ? 'topbar-open' : ''}`}>
        <div className="topbar-brand-row">
          <NavLink className="brand" to="/" onClick={closeMenu} aria-label="EstateFlow Home">
            <CodeSquare size={28} aria-hidden="true" />
            <span>EstateFlow</span>
          </NavLink>
          <button
            className="icon-button mobile-menu-toggle"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? 'Close Menu' : 'Open Menu'}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        <nav className={`nav-links ${isMenuOpen ? 'nav-links-open' : ''}`} aria-label="Main Navigation">
          <NavLink className={navClass} to="/buy" onClick={closeMenu}>
            Buy
          </NavLink>
          <NavLink className={navClass} to="/rent" onClick={closeMenu}>
            Rent
          </NavLink>
          <NavLink className={navClass} to="/sell" onClick={closeMenu}>
            Sell
          </NavLink>
          <NavLink className={navClass} to="/agents" onClick={closeMenu}>
            Agents
          </NavLink>
          {user && user.role !== 'user' ? (
            <NavLink className={navClass} to="/dashboard" onClick={closeMenu}>
              Dashboard
            </NavLink>
          ) : null}
        </nav>

        <div className={`topbar-actions ${isMenuOpen ? 'topbar-actions-open' : ''}`}>
          {!user || user.role === 'user' ? (
          <NavLink
            className="icon-button"
            to="/saved-properties"
            onClick={closeMenu}
            title="Saved properties"
            aria-label="Saved properties"
          >
            <Heart size={20} aria-hidden="true" />
          </NavLink>
          ) : null}

          {user ? <NotificationBell /> : null}
          {user ? (
            <UserDropdown
              user={user}
              onLogout={() => setShowLogoutConfirm(true)}
              userStatusLabel={getUserStatusLabel(user)}
            />
          ) : (
            <>
              <NavLink className="text-link" to="/login" onClick={closeMenu} style={{ textTransform: 'none', fontWeight: 600, fontSize: '1rem', color: '#333' }}>
                Log in
              </NavLink>
              <NavLink className="primary-button" to="/register" onClick={closeMenu} style={{ borderRadius: '24px', padding: '0.6rem 1.5rem' }}>
                Sign up
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

      <main id="main-content">
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
