import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Inbox, Loader2 } from 'lucide-react';
import { apiRequest } from '../api/client';

function formatNotificationTime(value) {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function getNotificationTitle(notification) {
  return notification.data?.title || 'Notification';
}

function getNotificationMessage(notification) {
  return notification.data?.message || 'You have a new update.';
}

function getNotificationType(notification) {
  return (notification.type || notification.data?.notification_type || 'update').replaceAll('_', ' ');
}

export default function NotificationCenter({ onNavigate }) {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const loadNotifications = useCallback(async ({ showLoading = false } = {}) => {
    if (showLoading) {
      setIsLoading(true);
    }

    try {
      const response = await apiRequest('/notifications');
      setNotifications(response.data || []);
      setUnreadCount(response.unread_count || 0);
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Unable to load notifications.');
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const intervalId = window.setInterval(() => loadNotifications(), 60000);

    return () => window.clearInterval(intervalId);
  }, [loadNotifications]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    loadNotifications({ showLoading: true });

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, loadNotifications]);

  const markNotificationRead = async (notification) => {
    if (notification.read_at) {
      return;
    }

    await apiRequest(`/notifications/${notification.id}/read`, { method: 'POST' });
    setNotifications((current) =>
      current.map((entry) =>
        entry.id === notification.id ? { ...entry, read_at: new Date().toISOString() } : entry,
      ),
    );
    setUnreadCount((current) => Math.max(0, current - 1));
  };

  const handleNotificationClick = async (notification) => {
    try {
      await markNotificationRead(notification);
      const actionUrl = notification.data?.action_url;
      if (actionUrl) {
        navigate(actionUrl);
        onNavigate?.();
      }
      setIsOpen(false);
    } catch (requestError) {
      setError(requestError.message || 'Unable to update notification.');
    }
  };

  const handleReadAll = async () => {
    try {
      await apiRequest('/notifications/read-all', { method: 'POST' });
      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          read_at: notification.read_at || new Date().toISOString(),
        })),
      );
      setUnreadCount(0);
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Unable to mark notifications read.');
    }
  };

  return (
    <div className="notification-wrap" ref={containerRef}>
      <button
        className={`notification-trigger icon-button ${isOpen ? 'notification-trigger-active' : ''}`}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <Bell size={20} aria-hidden="true" />
        {unreadCount > 0 ? (
          <span className="bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="notification-panel" role="dialog" aria-label="Notification center">
          <div className="notification-header">
            <div>
              <p className="eyebrow">Alerts</p>
              <h3>Notifications</h3>
            </div>
            <button
              className="notification-read-all"
              type="button"
              onClick={handleReadAll}
              disabled={unreadCount === 0}
            >
              <CheckCheck size={16} aria-hidden="true" />
              <span>Read all</span>
            </button>
          </div>

          {error ? <p className="notification-error">{error}</p> : null}

          {isLoading ? (
            <div className="notification-empty">
              <Loader2 size={22} aria-hidden="true" />
              <span>Loading notifications...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="notification-empty">
              <Inbox size={24} aria-hidden="true" />
              <span>No notifications yet.</span>
            </div>
          ) : (
            <div className="notification-list">
              {notifications.map((notification) => (
                <button
                  className={`notification-item ${notification.read_at ? 'notification-item-read' : ''}`}
                  key={notification.id}
                  type="button"
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-title-row">
                    <strong>{getNotificationTitle(notification)}</strong>
                    {!notification.read_at ? <span className="notification-unread-dot" aria-label="Unread" /> : null}
                  </div>
                  <p>{getNotificationMessage(notification)}</p>
                  <div className="notification-meta-row">
                    <span className="notification-type">{getNotificationType(notification)}</span>
                    <span className="notification-item-time">{formatNotificationTime(notification.created_at)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
