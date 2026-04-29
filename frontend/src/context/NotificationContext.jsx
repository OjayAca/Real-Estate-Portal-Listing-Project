/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { apiRequest } from '../api/client';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

function canUseNotifications(user) {
  if (!user) {
    return false;
  }

  return user.role !== 'user' || Boolean(user.email_verified_at);
}

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [popup, setPopup] = useState(null);
  const unreadCountRef = useRef(0);

  useEffect(() => {
    unreadCountRef.current = unreadCount;
  }, [unreadCount]);

  const syncNotifications = useEffectEvent(async (isInitial = false) => {
    if (!canUseNotifications(user)) {
      return;
    }

    try {
      const data = await apiRequest('/notifications');
      const nextNotifications = data.data || [];
      const nextUnreadCount = data.unread_count || 0;

      if (!isInitial && nextUnreadCount > unreadCountRef.current) {
        const newestUnread = nextNotifications.find((entry) => !entry.read_at);
        if (newestUnread) {
          setPopup(newestUnread);
        }
      }

      unreadCountRef.current = nextUnreadCount;
      setNotifications(nextNotifications);
      setUnreadCount(nextUnreadCount);
    } catch {
      // Ignore transient polling failures in the client.
    }
  });

  useEffect(() => {
    if (!canUseNotifications(user)) {
      if (notifications.length > 0) setNotifications([]);
      if (unreadCount !== 0) setUnreadCount(0);
      unreadCountRef.current = 0;
      return;
    }

    syncNotifications(true);
    const timer = window.setInterval(() => syncNotifications(false), 20000);

    return () => {
      window.clearInterval(timer);
    };
  }, [user, notifications.length, unreadCount]);

  useEffect(() => {
    if (!popup) {
      return undefined;
    }

    const timer = window.setTimeout(() => setPopup(null), 4500);
    return () => window.clearTimeout(timer);
  }, [popup]);

  const markRead = useCallback(async (notificationId) => {
    await apiRequest(`/notifications/${notificationId}/read`, {
      method: 'PATCH',
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
  }, []);

  const markAllRead = useCallback(async () => {
    await apiRequest('/notifications/read-all', {
      method: 'POST',
    });

    setNotifications((current) =>
      current.map((entry) => ({
        ...entry,
        read_at: entry.read_at || new Date().toISOString(),
      })),
    );
    setUnreadCount(0);
  }, []);

  const value = useMemo(
    () => ({
      markAllRead,
      markRead,
      notifications,
      popup,
      unreadCount,
    }),
    [markAllRead, markRead, notifications, popup, unreadCount],
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
