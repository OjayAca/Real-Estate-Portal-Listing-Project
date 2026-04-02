import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { Bell, Check } from 'lucide-react';

export default function NotificationBell() {
  const { markAllRead, markRead, notifications, unreadCount } = useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        panelRef.current && 
        !panelRef.current.contains(event.target) &&
        !buttonRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="notification-wrap">
      <button 
        ref={buttonRef}
        className="bell-icon" 
        onClick={() => setOpen((current) => !current)}
        title="Notifications"
      >
        <Bell size={20} />
        {unreadCount ? <span className="bell-badge">{unreadCount}</span> : null}
      </button>

      {open ? (
        <div className="notification-panel" ref={panelRef}>
          <div className="notification-header flex-row">
            <h3>Updates</h3>
            <button className="text-button flex-row" style={{ gap: '0.25rem' }} onClick={markAllRead}>
              <Check size={16} />
              Mark all read
            </button>
          </div>
          <div className="notification-list">
            {notifications.length ? (
              notifications.map((entry) => (
                <div
                  key={entry.id}
                  className={`notification-item ${entry.read_at ? 'notification-item-read' : ''}`}
                  onClick={() => markRead(entry.id)}
                  role="button"
                >
                  <strong>{entry.title}</strong>
                  <p>{entry.message}</p>
                  <span className="notification-item-time">
                    {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            ) : (
              <p className="empty-copy">No notifications right now.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
