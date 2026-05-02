import { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { User, Settings, LogOut, ChevronDown, UserCircle } from 'lucide-react';

export default function UserDropdown({ user, onLogout, userStatusLabel }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="user-dropdown-container" ref={dropdownRef}>
      <button 
        className="user-dropdown-trigger" 
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="user-avatar-small">
          <UserCircle size={20} />
        </div>
        <div className="user-dropdown-info">
          <span className="user-dropdown-name">{user.full_name}</span>
          <small className="user-dropdown-role">{userStatusLabel}</small>
        </div>
        <ChevronDown size={16} className={`dropdown-chevron ${isOpen ? 'rotated' : ''}`} />
      </button>

      {isOpen && (
        <div className="user-dropdown-menu animate-scale-in">
          <div className="dropdown-header">
            <strong>{user.full_name}</strong>
            <span>{user.email}</span>
          </div>
          <div className="dropdown-divider" />
          <NavLink to="/dashboard" className="dropdown-item" onClick={() => setIsOpen(false)}>
            <User size={16} />
            <span>Profile Dashboard</span>
          </NavLink>
          <NavLink to="/dashboard" className="dropdown-item" onClick={() => setIsOpen(false)}>
            <Settings size={16} />
            <span>Account Settings</span>
          </NavLink>
          <div className="dropdown-divider" />
          <button className="dropdown-item logout-item" onClick={() => { setIsOpen(false); onLogout(); }}>
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}
