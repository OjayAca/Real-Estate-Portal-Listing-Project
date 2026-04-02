import { createContext, useContext, useEffect, useEffectEvent, useMemo, useState } from 'react';
import { apiRequest } from '../api/client';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { token, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [popup, setPopup] = useState(null);

  const syncNotifications = useEffectEvent(async (isInitial = false) => {
    if (!token || !user) {
      return;
    }

    try {
      const data = await apiRequest('/notifications', { token });
      setNotifications(data.data || []);
      setUnreadCount((current) => {
        const next = data.unread_count || 0;
        if (!isInitial && next > current) {
          const newestUnread = (data.data || []).find((entry) => !entry.read_at);
          if (newestUnread) {
            setPopup(newestUnread);
          }
        }
        return next;
      });
    } catch {
      // Ignore transient polling failures in the client.
    }
  });

  useEffect(() => {
    if (!token || !user) {
      setNotifications((current) => (current.length ? [] : current));
      setUnreadCount((current) => (current ? 0 : current));
      setPopup(null);
      return;
    }

    syncNotifications(true);
    const timer = window.setInterval(() => syncNotifications(false), 20000);

    return () => {
      window.clearInterval(timer);
    };
  }, [token, user]);

  useEffect(() => {
    if (!popup) {
      return undefined;
    }

    const timer = window.setTimeout(() => setPopup(null), 4500);
    return () => window.clearTimeout(timer);
  }, [popup]);

  const markRead = async (notificationId) => {
    await apiRequest(`/notifications/${notificationId}/read`, {
      method: 'PATCH',
      token,
    });

    setNotifications((current) =>
      current.map((entry) =>
        entry.id === notificationId
          ? {
              ...entry,
              read_at: new Date().toISOString(),
            }
          : entry,
      ),
    );
    setUnreadCount((current) => Math.max(current - 1, 0));
  };

  const markAllRead = async () => {
    await apiRequest('/notifications/read-all', {
      method: 'POST',
      token,
    });

    setNotifications((current) =>
      current.map((entry) => ({
        ...entry,
        read_at: entry.read_at || new Date().toISOString(),
      })),
    );
    setUnreadCount(0);
  };

  const value = useMemo(
    () => ({
      markAllRead,
      markRead,
      notifications,
      popup,
      unreadCount,
    }),
    [notifications, popup, unreadCount],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error('useNotifications must be used inside NotificationProvider');
  }

  return context;
}